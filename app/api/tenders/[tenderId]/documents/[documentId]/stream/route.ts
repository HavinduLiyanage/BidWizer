import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { UploadKind, UploadStatus } from "@prisma/client";
import { z } from "zod";
import * as unzipper from "unzipper";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { loadUploadBuffer } from "@/lib/uploads";
import { enforceAccess, PlanError } from "@/lib/entitlements/enforce";
import { ensureTenderAccess } from "@/lib/indexing/access";

export const runtime = "nodejs";

const paramsSchema = z.object({
  tenderId: z.string().min(1, "Tender id is required"),
  documentId: z.string().min(1, "Document id is required"),
});

function sanitizeMetadata(metadata: unknown): Record<string, unknown> | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (
      value === null ||
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      result[key] = value;
    }
  }
  return Object.keys(result).length > 0 ? result : null;
}

function inferMimeType(filename?: string | null, fallback?: string | null): string {
  const name = filename ?? "";
  const ext = name.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "pdf":
      return "application/pdf";
    case "docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case "doc":
      return "application/msword";
    case "zip":
      return "application/zip";
    case "txt":
      return "text/plain; charset=utf-8";
    case "csv":
      return "text/csv; charset=utf-8";
    case "json":
      return "application/json; charset=utf-8";
    default:
      return fallback ?? "application/octet-stream";
  }
}

function safeFilename(name?: string | null): string {
  if (!name) {
    return "document";
  }
  const trimmed = name.trim();
  return trimmed.length > 0 ? trimmed : "document";
}

type ZipFileEntry = {
  path: string;
  type: string;
  buffer: () => Promise<Buffer>;
  uncompressedSize?: number;
};

function bufferToBodyInit(buffer: Buffer): ArrayBuffer {
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
}

function resolveRequestedPage(request: NextRequest): number | undefined {
  const candidates: string[] = [];
  const params = request.nextUrl.searchParams;
  const paramKeys = ["page", "pages", "p", "from", "to", "startPage", "endPage"];
  for (const key of paramKeys) {
    for (const value of params.getAll(key)) {
      if (value) {
        candidates.push(value);
      }
    }
  }

  const headerKeys = ["x-bidwizer-page", "x-bidwizer-pages", "x-page", "x-pages"];
  for (const key of headerKeys) {
    const value = request.headers.get(key);
    if (value) {
      candidates.push(value);
    }
  }

  let highest: number | undefined;
  for (const candidate of candidates) {
    const matches = candidate.match(/\d+/g);
    if (!matches) {
      continue;
    }
    for (const match of matches) {
      const parsed = Number.parseInt(match, 10);
      if (Number.isFinite(parsed) && parsed > 0) {
        highest = highest ? Math.max(highest, parsed) : parsed;
      }
    }
  }

  return highest;
}

async function downloadUploadPayload(upload: {
  storageKey: string | null;
  url: string | null;
}): Promise<Buffer> {
  if (upload.storageKey) {
    return loadUploadBuffer(upload.storageKey);
  }

  if (upload.url) {
    const response = await fetch(upload.url);
    if (!response.ok) {
      throw new Error(`Failed to download file (${response.status})`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  throw new Error("Upload payload is not accessible");
}

export async function GET(
  request: NextRequest,
  context: { params: { tenderId: string; documentId: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { tenderId, documentId } = paramsSchema.parse(context.params);
    const access = await ensureTenderAccess(session.user.id, tenderId);
    const viewerOrganizationId = access.viewerOrganizationId ?? access.organizationId;

    const page = resolveRequestedPage(request);

    try {
      await enforceAccess({
        orgId: viewerOrganizationId,
        feature: "pageView",
        pageNumber: page,
        userId: session.user.id,
        tenderId,
        documentId,
      });
    } catch (error) {
      if (error instanceof PlanError) {
        return NextResponse.json({ code: error.code }, { status: error.http });
      }
      throw error;
    }

    const rawId = documentId.startsWith("file:")
      ? documentId.slice("file:".length)
      : documentId;

    const extracted = await db.extractedFile.findUnique({
      where: { id: rawId },
      select: {
        id: true,
        filename: true,
        content: true,
        metadata: true,
        tenderId: true,
        uploadId: true,
        upload: {
          select: {
            id: true,
            kind: true,
            storageKey: true,
            url: true,
            originalName: true,
            mimeType: true,
          },
        },
      },
    });

    if (extracted) {
      if (extracted.tenderId !== tenderId) {
        return NextResponse.json({ error: "Document not found" }, { status: 404 });
      }

      const filename =
        extracted.filename ?? extracted.upload?.originalName ?? "document";

      if (!extracted.upload) {
        if (extracted.content) {
          return new NextResponse(extracted.content, {
            headers: {
              "Content-Type": inferMimeType(filename, "text/plain; charset=utf-8"),
              "Cache-Control": "private, max-age=0, no-cache",
            },
          });
        }
        return NextResponse.json({ error: "Source upload not found" }, { status: 404 });
      }

      if (extracted.upload.kind === UploadKind.zip) {
        const metadata = sanitizeMetadata(extracted.metadata);
        const entryPath =
          metadata && typeof metadata["path"] === "string"
            ? (metadata["path"] as string)
            : filename;

        const archiveBuffer = await downloadUploadPayload({
          storageKey: extracted.upload.storageKey,
          url: extracted.upload.url,
        });
        const archive = await unzipper.Open.buffer(archiveBuffer);
        const files = archive.files as ZipFileEntry[];
        const entry =
          files.find((file) => file.type !== "Directory" && file.path === entryPath) ??
          files.find(
            (file) =>
              file.type !== "Directory" &&
              file.path.split("/").filter(Boolean).pop() === filename,
          );

        if (!entry) {
          return NextResponse.json({ error: "File entry not found in archive" }, { status: 404 });
        }

        const entryBuffer = await entry.buffer();
        const mimeType = inferMimeType(filename, extracted.upload.mimeType);

        return new NextResponse(bufferToBodyInit(entryBuffer), {
          headers: {
            "Content-Type": mimeType,
            "Content-Length": entryBuffer.length.toString(),
            "Content-Disposition": `inline; filename="${encodeURIComponent(
              safeFilename(filename),
            )}"`,
            "Cache-Control": "private, max-age=0, no-cache",
            "X-Accel-Buffering": "no",
          },
        });
      }

      const payloadBuffer = await downloadUploadPayload({
        storageKey: extracted.upload.storageKey,
        url: extracted.upload.url,
      });
      const mimeType = inferMimeType(filename, extracted.upload.mimeType);

      return new NextResponse(bufferToBodyInit(payloadBuffer), {
        headers: {
          "Content-Type": mimeType,
          "Content-Length": payloadBuffer.length.toString(),
          "Content-Disposition": `inline; filename="${encodeURIComponent(
            safeFilename(filename),
          )}"`,
          "Cache-Control": "private, max-age=0, no-cache",
          "X-Accel-Buffering": "no",
        },
      });
    }

    const upload = await db.upload.findUnique({
      where: { id: rawId },
      select: {
        id: true,
        tenderId: true,
        storageKey: true,
        url: true,
        originalName: true,
        mimeType: true,
        status: true,
      },
    });

    if (!upload || upload.tenderId !== tenderId || upload.status !== UploadStatus.COMPLETED) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const filename = upload.originalName ?? "document";
    const payloadBuffer = await downloadUploadPayload({
      storageKey: upload.storageKey,
      url: upload.url,
    });
    const mimeType = inferMimeType(filename, upload.mimeType);

    return new NextResponse(bufferToBodyInit(payloadBuffer), {
      headers: {
        "Content-Type": mimeType,
        "Content-Length": payloadBuffer.length.toString(),
        "Content-Disposition": `inline; filename="${encodeURIComponent(
          safeFilename(filename),
        )}"`,
        "Cache-Control": "private, max-age=0, no-cache",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 },
      );
    }
    if (error instanceof PlanError) {
      return NextResponse.json({ code: error.code }, { status: error.http });
    }

    console.error("[tenders-documents-stream] Failed to stream document:", error);
    return NextResponse.json(
      { error: "Failed to stream document content" },
      { status: 500 },
    );
  }
}
