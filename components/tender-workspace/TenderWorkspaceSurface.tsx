"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  RefreshCw,
  Building2,
  Tag,
  Loader2,
  Clock3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { DocumentViewer } from "./DocumentViewer";
import { FileTree } from "./FileTree";
import { UploadPanel } from "./UploadPanel";
import type { TenderDocumentNode } from "@/types/tender-documents";

export interface TenderWorkspaceSurfaceProps {
  tenderId: string;
  tenderTitle: string;
  tenderStatus: string;
  tenderReference?: string | null;
  tenderDeadline?: string | null;
  tenderEstimatedValue?: string | null;
  organizationName?: string | null;
  canUpload: boolean;
}

const STATUS_STYLES: Record<
  string,
  { bg: string; text: string; label: string }
> = {
  PUBLISHED: { bg: "bg-emerald-100", text: "text-emerald-700", label: "Published" },
  AWARDED: { bg: "bg-blue-100", text: "text-blue-700", label: "Awarded" },
  DRAFT: { bg: "bg-amber-100", text: "text-amber-700", label: "Draft" },
  CLOSED: { bg: "bg-slate-200", text: "text-slate-700", label: "Closed" },
  CANCELLED: { bg: "bg-rose-100", text: "text-rose-700", label: "Cancelled" },
};

function formatDate(iso?: string | null): string {
  if (!iso) return "Not scheduled";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Not scheduled";
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

function findNodeById(
  node: TenderDocumentNode,
  id: string,
): TenderDocumentNode | null {
  if (node.id === id) return node;
  if (!node.children) return null;
  for (const child of node.children) {
    const found = findNodeById(child, id);
    if (found) return found;
  }
  return null;
}

function findFirstFile(node: TenderDocumentNode): TenderDocumentNode | null {
  if (node.type === "file") return node;
  if (!node.children) return null;
  for (const child of node.children) {
    const file = findFirstFile(child);
    if (file) return file;
  }
  return null;
}

export function TenderWorkspaceSurface({
  tenderId,
  tenderTitle,
  tenderStatus,
  tenderReference,
  tenderDeadline,
  tenderEstimatedValue,
  organizationName,
  canUpload,
}: TenderWorkspaceSurfaceProps) {
  const [tree, setTree] = useState<TenderDocumentNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<TenderDocumentNode | null>(
    null,
  );
  const [isLoadingTree, setIsLoadingTree] = useState(true);
  const [treeError, setTreeError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const statusMeta = STATUS_STYLES[tenderStatus] ?? {
    bg: "bg-slate-200",
    text: "text-slate-700",
    label: tenderStatus.replace(/_/g, " ").toLowerCase(),
  };

  const fetchTreeFrom = useCallback(
    async (endpoint: string, signal?: AbortSignal) => {
      const response = await fetch(endpoint, { cache: "no-store", signal });

      const payload = await response
        .json()
        .catch(() => ({ error: response.statusText }));

      if (!response.ok) {
        const message =
          typeof payload?.error === "string"
            ? payload.error
            : `Failed to load documents (${response.status})`;
        const err = new Error(message) as Error & { status?: number };
        err.status = response.status;
        throw err;
      }

      const tree = (payload as { tree?: TenderDocumentNode }).tree;
      if (!tree) {
        throw new Error("Workspace documents response missing tree.");
      }

      return tree;
    },
    [],
  );

  const loadTree = useCallback(
    async (signal?: AbortSignal) => {
      setTreeError(null);
      setIsLoadingTree(true);
      try {
        let treeData = await fetchTreeFrom(
          `/api/tenders/${tenderId}/documents`,
          signal,
        );

        const storedId =
          typeof window !== "undefined"
            ? window.localStorage.getItem(`tender_${tenderId}_lastFile`)
            : null;

        if (storedId) {
          const node = findNodeById(treeData, storedId);
          if (node) {
            setTree(treeData);
            setSelectedNode(node);
            return;
          }
        }

        setTree(treeData);
        setSelectedNode(findFirstFile(treeData));
      } catch (error) {
        const status = (error as Error & { status?: number }).status;

        if (status === 401 || status === 403) {
          try {
            const fallbackTree = await fetchTreeFrom(
              `/api/public/tenders/${tenderId}/documents`,
              signal,
            );
            setTree(fallbackTree);
            setSelectedNode(findFirstFile(fallbackTree));
            return;
          } catch (fallbackError) {
            if ((fallbackError as Error).name === "AbortError") {
              return;
            }
            console.error("Failed public tender files", fallbackError);
            setTreeError(
              fallbackError instanceof Error
                ? fallbackError.message
                : "Unable to load workspace documents.",
            );
            setTree(null);
            setSelectedNode(null);
            return;
          }
        }

        if ((error as Error).name === "AbortError") {
          return;
        }
        console.error("Failed to load tender files", error);
        setTree(null);
        setSelectedNode(null);
        setTreeError(
          error instanceof Error
            ? error.message
            : "Unable to load workspace documents.",
        );
      } finally {
        setIsLoadingTree(false);
      }
    },
    [fetchTreeFrom, tenderId],
  );

  useEffect(() => {
    const controller = new AbortController();
    void loadTree(controller.signal);
    return () => {
      controller.abort();
    };
  }, [loadTree]);

  const handleSelectNode = useCallback(
    (node: TenderDocumentNode) => {
      setSelectedNode(node);
      if (typeof window !== "undefined" && node.type === "file") {
        window.localStorage.setItem(`tender_${tenderId}_lastFile`, node.id);
      }
    },
    [tenderId],
  );

  const filteredTree = useMemo(() => {
    if (!tree || !searchQuery.trim()) {
      return tree;
    }

    const term = searchQuery.trim().toLowerCase();

    const filterNode = (
      node: TenderDocumentNode,
    ): TenderDocumentNode | null => {
      const matches = node.name.toLowerCase().includes(term);
      if (node.type === "file") {
        return matches ? node : null;
      }
      const filteredChildren = node.children
        ?.map(filterNode)
        .filter((child): child is FileNode => Boolean(child));
      if (matches || (filteredChildren && filteredChildren.length > 0)) {
        return {
          ...node,
          children: filteredChildren,
        };
      }
      return null;
    };

    return filterNode(tree);
  }, [tree, searchQuery]);

  return (
    <div
      className={cn("flex min-h-[calc(100vh-64px)] flex-col overflow-hidden")}
    >
      <div className="border-b border-gray-200 bg-white/80 px-6 py-4 backdrop-blur">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <Badge className={cn("text-xs font-semibold", statusMeta.bg, statusMeta.text)}>
                {statusMeta.label}
              </Badge>
              {tenderReference && (
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Tag className="h-3.5 w-3.5" />
                  <span>{tenderReference}</span>
                </div>
              )}
            </div>
            <h1 className="text-xl font-semibold text-gray-900">{tenderTitle}</h1>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-gray-600">
              {organizationName && (
                <span className="flex items-center gap-2">
                  <Building2 className="h-3.5 w-3.5 text-gray-400" />
                  {organizationName}
                </span>
              )}
              <span className="flex items-center gap-2">
                <CalendarDays className="h-3.5 w-3.5 text-gray-400" />
                Deadline: {formatDate(tenderDeadline)}
              </span>
              {tenderEstimatedValue && (
                <span className="flex items-center gap-2">
                  <Clock3 className="h-3.5 w-3.5 text-gray-400" />
                  Est. value: {tenderEstimatedValue}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative sm:w-64">
              <Input
                placeholder="Search documents…"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="h-9"
              />
            </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                  onClick={() => void loadTree()}
                  disabled={isLoadingTree}
                >
                  <RefreshCw className={cn("h-4 w-4", isLoadingTree && "animate-spin")} />
                  Refresh
                </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden xl:grid xl:grid-cols-[280px_minmax(0,1fr)_320px]">
        {/* Tender summary (desktop) */}
        <aside className="hidden border-r border-gray-200 bg-white xl:flex xl:flex-col">
          <div className="border-b border-gray-200 px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Workspace overview
            </p>
            <p className="mt-1 text-sm text-gray-600">
              Key checkpoints to track progress with your team.
            </p>
          </div>
          <div className="flex-1 space-y-4 overflow-auto px-5 py-4 text-sm text-gray-700">
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase text-gray-400">Current status</p>
              <p className="mt-2 text-sm text-gray-800">
                {statusMeta.label} — keep documents up to date to stay compliant.
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 px-4 py-3">
              <p className="text-xs font-semibold uppercase text-gray-400">Next deadline</p>
              <p className="mt-2 text-sm font-medium text-gray-900">{formatDate(tenderDeadline)}</p>
              <p className="mt-1 text-xs text-gray-500">
                Finalise technical documents ahead of the submission cutoff.
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 px-4 py-3">
              <p className="text-xs font-semibold uppercase text-gray-400">Team tips</p>
              <ul className="mt-2 space-y-2 text-xs text-gray-600">
                <li>• Assign reviewers for critical documents.</li>
                <li>• Upload signed addendums immediately.</li>
                <li>• Confirm pricing sheets before final export.</li>
              </ul>
            </div>
          </div>
        </aside>

        {/* Document viewer */}
        <section className="order-1 flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
          <div className="xl:hidden border-b border-gray-200 bg-white/80 px-5 py-3">
            <div className="grid gap-3 text-sm text-gray-700 sm:grid-cols-2">
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase text-gray-400">Status</p>
                <p className="mt-2 text-sm font-medium text-gray-900">{statusMeta.label}</p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase text-gray-400">Deadline</p>
                <p className="mt-2 text-sm font-medium text-gray-900">{formatDate(tenderDeadline)}</p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-hidden">
            {isLoadingTree ? (
              <div className="flex h-full items-center justify-center gap-3 text-sm text-gray-600">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                Loading workspace files…
              </div>
            ) : treeError ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-sm text-gray-600">
                <p className="font-medium text-gray-700">Unable to load documents</p>
                <p className="max-w-sm text-xs text-gray-500">{treeError}</p>
                <Button variant="outline" size="sm" onClick={() => void loadTree()}>
                  Retry
                </Button>
              </div>
            ) : !tree || !selectedNode ? (
              <div className="flex h-full items-center justify-center text-sm text-gray-600">
                No documents available for this tender yet.
              </div>
            ) : (
              <DocumentViewer tenderId={tenderId} selectedNode={selectedNode} />
            )}
          </div>
        </section>

        {/* File explorer */}
        <aside className="border-t border-gray-200 bg-white xl:order-none xl:border-l xl:border-t-0">
          {canUpload && (
            <UploadPanel
              tenderId={tenderId}
              onUploadQueued={loadTree}
              className="border-0 border-b"
            />
          )}

          <div className="flex h-[320px] flex-col border-t border-gray-200 xl:h-full xl:border-t-0">
            {filteredTree ? (
              <FileTree
                tree={filteredTree}
                selectedId={selectedNode?.id}
                onSelect={handleSelectNode}
                className="flex-1"
              />
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 text-sm text-gray-600">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                Filtering documents…
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
