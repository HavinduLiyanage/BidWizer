"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, FileQuestion, Loader2, RefreshCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type {
  TenderDocumentNode,
  TenderDocumentPreview,
} from "@/types/tender-documents";

interface DocumentViewerProps {
  tenderId?: string;
  selectedNode: TenderDocumentNode | null;
  className?: string;
  enablePreview?: boolean;
}

type PreviewState =
  | { status: "idle"; data: null }
  | { status: "loading"; data: null }
  | { status: "error"; data: null; error: string }
  | { status: "success"; data: TenderDocumentPreview };

export function DocumentViewer({
  tenderId,
  selectedNode,
  className,
  enablePreview,
}: DocumentViewerProps) {
  const [previewState, setPreviewState] = useState<PreviewState>({
    status: "idle",
    data: null,
  });
  const [lastRequestedId, setLastRequestedId] = useState<string | null>(null);

  const canPreviewFile =
    Boolean(tenderId) && selectedNode?.type === "file" && (enablePreview ?? true);

  useEffect(() => {
    setPreviewState({ status: "idle", data: null });
    setLastRequestedId(null);
  }, [selectedNode?.id]);

  const loadPreview = useCallback(
    async (options?: { signal?: AbortSignal }) => {
      if (!canPreviewFile || !tenderId || !selectedNode || selectedNode.type !== "file") {
        return;
      }

      setPreviewState({ status: "loading", data: null });
      setLastRequestedId(selectedNode.id);

      const runFetch = async (endpoint: string) => {
        const response = await fetch(endpoint, {
          cache: "no-store",
          signal: options?.signal,
        });

        const payload = await response
          .json()
          .catch(() => ({ error: response.statusText ?? "Unknown error" }));

        if (!response.ok) {
          const errorMessage =
            typeof payload?.error === "string"
              ? payload.error
              : `Failed to load preview (${response.status})`;
          const err = new Error(errorMessage);
          (err as Error & { status?: number }).status = response.status;
          throw err;
        }

        return payload as TenderDocumentPreview;
      };

      try {
        const privateEndpoint = `/api/tenders/${tenderId}/documents/${encodeURIComponent(
          selectedNode.id,
        )}`;
        const data = await runFetch(privateEndpoint);
        setPreviewState({ status: "success", data });
      } catch (error) {
        const status = (error as Error & { status?: number }).status;

        if (status === 401 || status === 403) {
          try {
            const publicEndpoint = `/api/public/tenders/${tenderId}/documents/${encodeURIComponent(
              selectedNode.id,
            )}`;
            const data = await runFetch(publicEndpoint);
            setPreviewState({ status: "success", data });
            return;
          } catch (publicError) {
            if (publicError instanceof Error && publicError.name === "AbortError") {
              return;
            }
            setPreviewState({
              status: "error",
              data: null,
              error:
                publicError instanceof Error
                  ? publicError.message
                  : "Unable to load document preview.",
            });
            return;
          }
        }

        if (error instanceof Error && error.name === "AbortError") {
          return;
        }

        setPreviewState({
          status: "error",
          data: null,
          error:
            error instanceof Error
              ? error.message
              : "Unable to load document preview.",
        });
      }
    },
    [canPreviewFile, tenderId, selectedNode],
  );

  useEffect(() => {
    if (!canPreviewFile) {
      return;
    }

    const controller = new AbortController();
    void loadPreview({ signal: controller.signal });

    return () => controller.abort();
  }, [canPreviewFile, loadPreview]);

  const preview = previewState.status === "success" ? previewState.data : null;
  const hasPreview = preview && preview.id === lastRequestedId;

  const mimeType = (preview?.mimeType ?? "").toLowerCase();
  const fileExtension = (selectedNode?.ext ?? "").toLowerCase();
  const streamUrl = preview?.streamUrl ?? null;

  const isPdf = mimeType.includes("pdf") || fileExtension === "pdf";
  const isDocx = mimeType.includes("word") || ["docx", "doc"].includes(fileExtension);

  const textContent = useMemo(() => {
    if (!preview?.content) {
      return null;
    }
    const trimmed = preview.content.trim();
    return trimmed.length > 0 ? trimmed : null;
  }, [preview]);

  const retry = () => {
    void loadPreview();
  };

  if (!selectedNode) {
    return (
      <div className={cn("flex h-full flex-col items-center justify-center bg-gray-50", className)}>
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-200">
          <FileQuestion className="h-8 w-8 text-gray-400" />
        </div>
        <p className="text-sm font-medium text-gray-600">No document selected</p>
        <p className="mt-1 text-xs text-gray-500">
          Choose a file from the workspace explorer to start reviewing it.
        </p>
      </div>
    );
  }

  if (selectedNode.type === "folder") {
    return (
      <div className={cn("flex h-full flex-col items-center justify-center bg-gray-50", className)}>
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50">
          <svg className="h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
            />
          </svg>
        </div>
        <p className="text-sm font-medium text-gray-700">{selectedNode.name}</p>
        <p className="mt-1 text-xs text-gray-500">
          {selectedNode.children?.length ?? 0} items inside this folder.
        </p>
      </div>
    );
  }

  let body = null;

  if (previewState.status === "loading" || (previewState.status === "success" && !hasPreview)) {
    body = (
      <div className="flex flex-1 flex-col items-center justify-center gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="text-xs text-gray-600">Fetching document preview…</p>
      </div>
    );
  } else if (previewState.status === "error") {
    body = (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <AlertMessage title="Preview unavailable" message={previewState.error} />
        <Button variant="outline" size="sm" onClick={retry} className="flex items-center gap-2">
          <RefreshCcw className="h-4 w-4" />
          Retry
        </Button>
      </div>
    );
  } else if (previewState.status === "idle" && !canPreviewFile) {
    body = (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
        <FileQuestion className="h-8 w-8 text-gray-400" />
        <p className="text-sm font-medium text-gray-700">Select a document to start previewing.</p>
        <p className="max-w-sm text-xs text-gray-500">
          Choose a PDF or DOCX file from the explorer to view its contents here.
        </p>
      </div>
    );
  } else if (previewState.status === "success" && hasPreview) {
    if (isPdf && streamUrl) {
      body = (
        <div className="flex-1">
          <iframe
            title={`Preview ${preview?.name ?? selectedNode.name}`}
            src={`${streamUrl}#toolbar=0&navpanes=0`}
            className="h-full w-full border-0 bg-white"
            allow="fullscreen"
          />
        </div>
      );
    } else if ((isDocx || isTextLikeFromMime(mimeType, fileExtension)) && textContent) {
      body = (
        <div className="flex-1 overflow-auto px-6 py-6">
          <pre className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800">{textContent}</pre>
        </div>
      );
    } else if (isDocx) {
      body = (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center px-6">
          <AlertMessage
            title="DOCX preview not ready"
            message="We could not extract readable text from this document yet. Try uploading a PDF version or re-open once processing completes."
          />
        </div>
      );
    } else if (isPdf && !streamUrl) {
      body = (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center px-6">
          <AlertMessage
            title="PDF preview unavailable"
            message="A preview link was not returned for this file. Re-upload the document or try again later."
          />
        </div>
      );
    } else {
      body = (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center px-6">
          <AlertMessage
            title="Unsupported format"
            message="Only PDF or DOCX documents can be previewed here. Download the original file to view it locally."
          />
        </div>
      );
    }
  } else {
    body = (
      <div className="flex flex-1 flex-col items-center justify-center gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="text-xs text-gray-600">Preparing preview…</p>
      </div>
    );
  }

  return (
    <div className={cn("flex h-full flex-col bg-white", className)}>
      <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-5 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-gray-900">
            {preview?.name ?? selectedNode.name}
          </p>
          <p className="truncate text-xs text-gray-500">{preview?.path ?? selectedNode.path}</p>
        </div>
        {previewState.status === "loading" && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            Loading
          </div>
        )}
        {previewState.status === "error" && (
          <Button variant="outline" size="sm" onClick={retry} className="flex items-center gap-2">
            <RefreshCcw className="h-4 w-4" />
            Retry
          </Button>
        )}
      </div>

      <main className="flex-1 overflow-hidden bg-gray-50">
        <div className="flex h-full flex-1 flex-col">{body}</div>
      </main>
    </div>
  );
}

function isTextLikeFromMime(mimeType: string, extension: string): boolean {
  if (!mimeType && !extension) {
    return false;
  }

  if (mimeType.startsWith("text/")) {
    return true;
  }

  return ["txt", "md", "csv", "json", "log"].includes(extension);
}

function AlertMessage({ title, message }: { title: string; message: string }) {
  return (
    <div className="flex max-w-xs flex-col items-center gap-2 text-center">
      <AlertCircle className="h-8 w-8 text-amber-500" />
      <p className="text-sm font-medium text-gray-800">{title}</p>
      <p className="text-xs text-gray-600">{message}</p>
    </div>
  );
}
