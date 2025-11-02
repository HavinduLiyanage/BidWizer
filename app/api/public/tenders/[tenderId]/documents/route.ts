import { NextRequest, NextResponse } from "next/server";
import { TenderStatus, UploadKind, UploadStatus } from "@prisma/client";
import { z } from "zod";

import { db } from "@/lib/db";
import type { TenderDocumentNode } from "@/types/tender-documents";

type DocumentNode = TenderDocumentNode;

const paramsSchema = z.object({
  tenderId: z.string().min(1, "Tender id is required"),
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

function normalizeSegments(path?: unknown): string[] {
  if (typeof path !== "string") {
    return [];
  }

  return path
    .split(/[\\/]+/)
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);
}

function extractExtension(filename: string): string | undefined {
  const match = /\.([^.]+)$/.exec(filename);
  if (!match) {
    return undefined;
  }
  return match[1].toLowerCase();
}

function ensureFolder(
  root: DocumentNode,
  folderSegments: string[],
  segmentIndex: number,
): DocumentNode {
  const segment = folderSegments[segmentIndex];
  const currentPath = `/${folderSegments.slice(0, segmentIndex + 1).join("/")}`;

  if (!root.children) {
    root.children = [];
  }

  let folder = root.children.find(
    (child) => child.type === "folder" && child.name === segment,
  );

  if (!folder) {
    folder = {
      id: `folder:${currentPath}`,
      name: segment,
      type: "folder",
      path: currentPath,
      children: [],
    };
    root.children.push(folder);
  }

  if (segmentIndex === folderSegments.length - 1) {
    return folder;
  }

  return ensureFolder(folder, folderSegments, segmentIndex + 1);
}

function insertFileNode(
  root: DocumentNode,
  folderSegments: string[],
  file: DocumentNode,
) {
  if (folderSegments.length === 0) {
    if (!root.children) {
      root.children = [];
    }

    const exists = root.children.some(
      (node) => node.type === "file" && node.id === file.id,
    );

    if (!exists) {
      root.children.push(file);
    }
    return;
  }

  const parentFolder = ensureFolder(root, folderSegments, 0);

  if (!parentFolder.children) {
    parentFolder.children = [];
  }

  const exists = parentFolder.children.some(
    (node) => node.type === "file" && node.id === file.id,
  );

  if (!exists) {
    parentFolder.children.push(file);
  }
}

function sortTree(node: DocumentNode) {
  if (!node.children || node.children.length === 0) {
    return;
  }

  node.children.sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === "folder" ? -1 : 1;
    }
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  });

  for (const child of node.children) {
    sortTree(child);
  }
}

export async function GET(
  _request: NextRequest,
  context: { params: { tenderId: string } },
) {
  try {
    const { tenderId } = paramsSchema.parse(context.params);

    const tender = await db.tender.findFirst({
      where: { id: tenderId, status: TenderStatus.PUBLISHED },
      select: {
        id: true,
        uploads: {
          where: { status: UploadStatus.COMPLETED },
          select: {
            id: true,
            originalName: true,
            size: true,
            kind: true,
            isAdvertisement: true,
            extractedFiles: {
              select: {
                id: true,
                filename: true,
                metadata: true,
                docHash: true,
              },
            },
          },
        },
      },
    });

    if (!tender) {
      return NextResponse.json({ error: "Tender not found" }, { status: 404 });
    }

    const root: DocumentNode = {
      id: "root",
      name: "Tender Documents",
      type: "folder",
      path: "/",
      children: [],
    };

    for (const upload of tender.uploads) {
      if (upload.isAdvertisement || upload.kind === UploadKind.image) {
        continue;
      }

      if (upload.kind === UploadKind.zip) {
        for (const extracted of upload.extractedFiles) {
          const metadata =
            extracted.metadata && typeof extracted.metadata === "object"
              ? (extracted.metadata as Record<string, unknown>)
              : null;

          const pathValue =
            metadata && typeof metadata["path"] === "string"
              ? (metadata["path"] as string)
              : null;
          const sizeValue =
            metadata && typeof metadata["size"] === "number"
              ? (metadata["size"] as number)
              : upload.size ?? null;

          const segments = normalizeSegments(pathValue ?? undefined);
          const filename =
            segments[segments.length - 1] ?? extracted.filename ?? "Document";
          const docHash =
            extracted.docHash && extracted.docHash.length > 0
              ? extracted.docHash
              : typeof metadata?.["docHash"] === "string"
              ? (metadata["docHash"] as string)
              : null;

          const folderSegments = segments.slice(0, -1);
          const pathSegments =
            folderSegments.length > 0 ? folderSegments : [];

          const fileNode: DocumentNode = {
            id: `file:${extracted.id}`,
            name: filename,
            type: "file",
            path: `/${[...pathSegments, filename].join("/")}`,
            docHash,
            size: formatBytes(sizeValue),
            ext: extractExtension(filename),
          };

          insertFileNode(root, pathSegments, fileNode);
        }
      } else {
        const extracted = upload.extractedFiles[0];
        const filename =
          extracted?.filename?.trim().length
            ? extracted.filename
            : upload.originalName;

        if (!filename) {
          continue;
        }

        const fileNode: DocumentNode = {
          id: `file:${extracted?.id ?? upload.id}`,
          name: filename,
          type: "file",
          path: `/${filename}`,
          docHash:
            extracted?.docHash && extracted.docHash.length > 0
              ? extracted.docHash
              : null,
          size: formatBytes(upload.size),
          ext: extractExtension(filename),
        };

        insertFileNode(root, [], fileNode);
      }
    }

    sortTree(root);

    return NextResponse.json({ tree: root });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 },
      );
    }

    console.error(
      "[public-tenders-documents] Failed to load tender documents:",
      error,
    );
    return NextResponse.json(
      { error: "Failed to load tender documents" },
      { status: 500 },
    );
  }
}
