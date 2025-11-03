import { NextRequest, NextResponse } from "next/server";
import { UploadKind, UploadStatus, TenderStatus } from "@prisma/client";
import { z } from "zod";
import * as unzipper from "unzipper";

import { db } from "@/lib/db";
import { loadUploadBuffer } from "@/lib/uploads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

async function downloadUploadPayload(upload: {
  storageKey: string | null;
  url: string | null;
}): Promise<Buffer> {
  if (upload.storageKey) {
    return loadUploadBuffer(upload.storageKey);
  }

  if (upload.url) {
    const response = await fetch(upload.url, {
      cache: "no-store",
      next: { revalidate: 0 },
    });
    if (!response.ok) {
      throw new Error(`Failed to download file (${response.status})`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  throw new Error("Upload payload is not accessible");
}

export async function GET(
  _request: NextRequest,
  context: { params: { tenderId: string; documentId: string } },
) {
  try {
    const { tenderId, documentId } = paramsSchema.parse(context.params);

    const tender = await db.tender.findFirst({
      where: { id: tenderId, status: TenderStatus.PUBLISHED },
      select: { id: true },
    });

    if (!tender) {
      return NextResponse.json({ error: "Tender not found" }, { status: 404 });
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
        const entry =
          archive.files.find((file) => file.type !== "Directory" && file.path === entryPath) ??
          archive.files.find(
            (file) =>
              file.type !== "Directory" &&
              file.path.split("/").filter(Boolean).pop() === filename,
          );

        if (!entry) {
          return NextResponse.json({ error: "File entry not found in archive" }, { status: 404 });
        }

        const entryBuffer = await entry.buffer();
        const mimeType = inferMimeType(filename, extracted.upload.mimeType);

        return new NextResponse(entryBuffer, {
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

      return new NextResponse(payloadBuffer, {
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
        kind: true,
        isAdvertisement: true,
      },
    });

    const allowIncompleteImage =
      upload &&
      (upload.kind === UploadKind.image || upload.isAdvertisement === true);

    if (
      !upload ||
      upload.tenderId !== tenderId ||
      (upload.status !== UploadStatus.COMPLETED &&
        !(allowIncompleteImage && upload.status !== UploadStatus.FAILED))
    ) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const filename = upload.originalName ?? "document";
    const payloadBuffer = await downloadUploadPayload({
      storageKey: upload.storageKey,
      url: upload.url,
    });
    const mimeType = inferMimeType(filename, upload.mimeType);

    return new NextResponse(payloadBuffer, {
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

    console.error("[public-tenders-documents-stream] Failed to stream document:", error);
    return NextResponse.json(
      { error: "Failed to stream document content" },
      { status: 500 },
    );
  }
}
