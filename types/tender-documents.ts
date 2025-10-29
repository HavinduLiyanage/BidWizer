export interface TenderDocumentNode {
  id: string;
  name: string;
  type: "folder" | "file";
  path: string;
  docHash?: string | null;
  size?: string;
  ext?: string;
  children?: TenderDocumentNode[];
}

export interface TenderDocumentPreview {
  id: string;
  name: string;
  path: string;
  size?: string;
  mimeType?: string | null;
  downloadUrl?: string | null;
  streamUrl?: string | null;
  docHash?: string | null;
  uploadedAt?: string;
  updatedAt?: string;
  metadata?: Record<string, unknown> | null;
  content?: string | null;
  notice?: string;
  sourceUpload: {
    id: string;
    name: string | null;
    kind: string | null;
    mimeType: string | null;
    size: string | null;
    status: string | null;
  } | null;
}
