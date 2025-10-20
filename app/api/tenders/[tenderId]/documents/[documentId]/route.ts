import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { UploadKind } from "@prisma/client";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import type { TenderDocumentPreview } from "@/types/tender-documents";

const paramsSchema = z.object({
  tenderId: z.string().min(1, "Tender id is required"),
  documentId: z.string().min(1, "Document id is required"),
});

function formatBytes(size?: number | null): string | undefined {
  if (!size || Number.isNaN(size) || size <= 0) {
    return undefined;
  }

  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = size;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  const formatted =
    value >= 10 || unitIndex === 0 ? value.toFixed(0) : value.toFixed(1);

  return `${formatted} ${units[unitIndex]}`;
}

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

function inferMimeType(
  filename?: string | null,
  fallback?: string | null,
): string | null {
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
      return "text/plain";
    case "csv":
      return "text/csv";
    case "json":
      return "application/json";
    default:
      return fallback ?? null;
  }
}

function buildPreviewResponse(
  payload: TenderDocumentPreview,
): NextResponse<TenderDocumentPreview> {
  return NextResponse.json(payload);
}

export async function GET(
  _request: NextRequest,
  context: { params: { tenderId: string; documentId: string } },
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { tenderId, documentId } = paramsSchema.parse(context.params);

    const tender = await db.tender.findUnique({
      where: { id: tenderId },
      select: { id: true, organizationId: true },
    });

    if (!tender) {
      return NextResponse.json({ error: "Tender not found" }, { status: 404 });
    }

    const membership = await db.orgMember.findUnique({
      where: {
        userId_organizationId: {
          userId: session.user.id,
          organizationId: tender.organizationId,
        },
      },
      select: { id: true },
    });

    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
        createdAt: true,
        updatedAt: true,
        tenderId: true,
        uploadId: true,
        upload: {
          select: {
            id: true,
            originalName: true,
            mimeType: true,
            size: true,
            status: true,
            url: true,
            kind: true,
            storageKey: true,
            filename: true,
          },
        },
      },
    });

    if (extracted) {
      if (extracted.tenderId !== tenderId) {
        return NextResponse.json(
          { error: "Document belongs to a different tender" },
          { status: 404 },
        );
      }

      const metadata = sanitizeMetadata(extracted.metadata);
      const inferredPath =
        metadata && typeof metadata["path"] === "string"
          ? (metadata["path"] as string)
          : `/${extracted.filename ?? "Document"}`;

      let size = metadata && typeof metadata["size"] === "number"
        ? formatBytes(metadata["size"] as number)
        : undefined;

      if (!size) {
        size = formatBytes(extracted.upload?.size);
      }

      const filename =
        extracted.filename ??
        extracted.upload?.originalName ??
        "Document";
      const streamUrl = `/api/tenders/${tenderId}/documents/${encodeURIComponent(
        documentId,
      )}/stream`;
      const preview: TenderDocumentPreview = {
        id: `file:${extracted.id}`,
        name: filename,
        path: inferredPath,
        size,
        mimeType: inferMimeType(filename, extracted.upload?.mimeType ?? null),
        downloadUrl: streamUrl,
        streamUrl,
        uploadedAt: extracted.createdAt.toISOString(),
        updatedAt: extracted.updatedAt.toISOString(),
        metadata,
        content: extracted.content ?? null,
        sourceUpload: extracted.upload
          ? {
              id: extracted.upload.id,
              name: extracted.upload.originalName ?? null,
              kind: extracted.upload.kind,
              mimeType: extracted.upload.mimeType ?? null,
              size: formatBytes(extracted.upload.size) ?? null,
              status: extracted.upload.status,
            }
          : null,
      };

      return buildPreviewResponse(preview);
    }

    const upload = await db.upload.findUnique({
      where: { id: rawId },
      select: {
        id: true,
        tenderId: true,
        originalName: true,
        mimeType: true,
        size: true,
        status: true,
        url: true,
        kind: true,
        storageKey: true,
        filename: true,
        createdAt: true,
        updatedAt: true,
        extractedFiles: {
          where: { content: { not: null } },
          select: { id: true, content: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    if (!upload || upload.tenderId !== tenderId) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const content =
      upload.extractedFiles.length > 0
        ? upload.extractedFiles[0]?.content ?? null
        : null;

    const streamUrl = `/api/tenders/${tenderId}/documents/${encodeURIComponent(
      documentId,
    )}/stream`;

    const preview: TenderDocumentPreview = {
      id: `file:${upload.id}`,
      name: upload.originalName ?? "Document",
      path: `/${upload.originalName ?? "Document"}`,
      size: formatBytes(upload.size),
      mimeType: inferMimeType(upload.originalName, upload.mimeType ?? null),
      downloadUrl: streamUrl,
      streamUrl,
      uploadedAt: upload.createdAt.toISOString(),
      updatedAt: upload.updatedAt.toISOString(),
      metadata: null,
      content,
      sourceUpload: {
        id: upload.id,
        name: upload.originalName ?? null,
        kind: upload.kind,
        mimeType: upload.mimeType ?? null,
        size: formatBytes(upload.size) ?? null,
        status: upload.status,
      },
    };

    if (upload.kind === UploadKind.zip && !content) {
      preview.notice =
        "This file was uploaded as a ZIP archive. Extract its contents locally to review them.";
    }

    return buildPreviewResponse(preview);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 },
      );
    }

    console.error("[tenders-documents-preview] Failed to load preview:", error);
    return NextResponse.json(
      { error: "Failed to load document preview" },
      { status: 500 },
    );
  }
}
