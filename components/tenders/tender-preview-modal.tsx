"use client";

import { useEffect, useState } from "react";
import { X, Building2, MapPin, Calendar, DollarSign, Phone, Mail, Folder, FileText, ChevronRight, ChevronDown, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Tender } from "@/lib/mock-data";
import type { TenderDocumentNode } from "@/types/tender-documents";

interface TenderPreviewModalProps {
  tender: Tender | null;
  isOpen: boolean;
  onClose: () => void;
}

const categoryColors: Record<string, { bg: string; text: string }> = {
  "Construction": { bg: "bg-blue-50", text: "text-blue-700" },
  "Healthcare": { bg: "bg-green-50", text: "text-green-700" },
  "Infrastructure": { bg: "bg-amber-50", text: "text-amber-700" },
  "IT & Technology": { bg: "bg-indigo-50", text: "text-indigo-700" },
  "Energy": { bg: "bg-rose-50", text: "text-rose-700" }
};

// Document Tree Component
function DocumentTree({ nodes, expanded, onToggle }: {
  nodes: TenderDocumentNode[],
  expanded: Set<string>,
  onToggle: (id: string) => void 
}) {
  const renderNode = (node: TenderDocumentNode, depth: number = 0) => {
    const isExpanded = expanded.has(node.id);
    const hasChildren = node.children && node.children.length > 0;

    return (
      <div key={node.id}>
        <div
          className="flex items-center gap-2 py-1.5 px-2 hover:bg-gray-50 rounded-md cursor-pointer"
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={() => hasChildren && onToggle(node.id)}
        >
          {hasChildren && (
            <span className="flex-shrink-0">
              {isExpanded ? (
                <ChevronDown className="h-3.5 w-3.5 text-gray-500" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 text-gray-500" />
              )}
            </span>
          )}
          {!hasChildren && <span className="w-3.5" />}

          <span className="flex-shrink-0">
            {node.type === "folder" ? (
              <Folder className="h-4 w-4 text-blue-500" />
            ) : (
              <FileText className="h-4 w-4 text-gray-500" />
            )}
          </span>

          <span className="flex-1 text-sm text-gray-700 truncate">{node.name}</span>
          
          {node.size && (
            <span className="flex-shrink-0 text-xs text-gray-500">{node.size}</span>
          )}
        </div>

        {hasChildren && isExpanded && (
          <div>{node.children!.map((child) => renderNode(child, depth + 1))}</div>
        )}
      </div>
    );
  };

  return <div className="space-y-1">{nodes.map((node) => renderNode(node))}</div>;
}

function isTenderDocumentNode(value: unknown): value is TenderDocumentNode {
  if (!value || typeof value !== "object") {
    return false;
  }

  const node = value as Record<string, unknown>;
  if (
    typeof node.id !== "string" ||
    typeof node.name !== "string" ||
    (node.type !== "file" && node.type !== "folder") ||
    typeof node.path !== "string"
  ) {
    return false;
  }

  if (node.children === undefined) {
    return true;
  }

  if (!Array.isArray(node.children)) {
    return false;
  }

  return (node.children as unknown[]).every(isTenderDocumentNode);
}

export function TenderPreviewModal({ tender, isOpen, onClose }: TenderPreviewModalProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [documentTree, setDocumentTree] = useState<TenderDocumentNode | null>(null);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
  const [documentsError, setDocumentsError] = useState<string | null>(null);
  const tenderId = tender?.id ?? null;

  useEffect(() => {
    if (!tenderId || !isOpen) {
      return;
    }

    const controller = new AbortController();
    let cancelled = false;

    async function loadDocuments() {
      setIsLoadingDocuments(true);
      setDocumentsError(null);
      setDocumentTree(null);
      setExpandedFolders(new Set());

      try {
        const response = await fetch(`/api/public/tenders/${tenderId}/documents`, {
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({}));
          throw new Error(errorBody?.error ?? "Failed to load documents");
        }

        let payload: unknown = null;
        try {
          payload = await response.json();
        } catch {
          payload = null;
        }
        if (cancelled) {
          return;
        }

        const tree =
          payload && typeof payload === "object"
            ? (payload as Record<string, unknown>).tree
            : undefined;
        if (isTenderDocumentNode(tree)) {
          setDocumentTree(tree);

          const topLevelFolders =
            tree.children
              ?.filter(
                (node) =>
                  node.type === "folder" &&
                  Array.isArray(node.children) &&
                  node.children.length > 0
              )
              ?.map((folder) => folder.id) ?? [];
          setExpandedFolders(new Set(topLevelFolders));
        } else {
          setDocumentTree(null);
        }
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        console.error("Failed to load tender documents:", error);
        if (!cancelled) {
          setDocumentsError(
            error instanceof Error ? error.message : "Failed to load documents"
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoadingDocuments(false);
        }
      }
    }

    loadDocuments();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [tenderId, isOpen]);

  if (!tender) return null;

  const categoryColor = categoryColors[tender.category] || categoryColors["Construction"];

  const toggleFolder = (id: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50"
          />

          {/* Slide-in Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-full md:w-[600px] bg-white shadow-2xl z-50 overflow-y-auto"
          >
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-navy-900 to-primary flex items-center justify-center">
                  <span className="text-white text-sm font-bold">
                    {tender.publisher.name.split(' ').map(w => w[0]).join('').substring(0, 2)}
                  </span>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Quick Preview</h3>
                  <p className="text-xs text-gray-500">{tender.id}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Category Badge */}
              <Badge className={`${categoryColor.bg} ${categoryColor.text} border-0`}>
                {tender.category}
              </Badge>

              {/* Title */}
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">{tender.title}</h2>
                <p className="text-gray-600">{tender.description}</p>
              </div>

              {/* Key Details Grid */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-xl">
                <div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                    <Building2 className="h-4 w-4" />
                    <span>Publisher</span>
                  </div>
                  <p className="font-semibold text-gray-900">{tender.publisher.name}</p>
                </div>

                {tender.location && (
                  <div>
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                      <MapPin className="h-4 w-4" />
                      <span>Location</span>
                    </div>
                    <p className="font-semibold text-gray-900">{tender.location}</p>
                  </div>
                )}

                {tender.budget && (
                  <div>
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                      <DollarSign className="h-4 w-4" />
                      <span>Budget</span>
                    </div>
                    <p className="font-semibold text-gray-900">{tender.budget}</p>
                  </div>
                )}

                <div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                    <Calendar className="h-4 w-4" />
                    <span>Deadline</span>
                  </div>
                  <p className="font-semibold text-gray-900">
                    {new Date(tender.deadline).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </p>
                </div>
              </div>

              {/* Documents Section */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Documents</h4>
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  {isLoadingDocuments ? (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                      <span>Loading documents...</span>
                    </div>
                  ) : documentsError ? (
                    <p className="text-sm text-red-600">{documentsError}</p>
                  ) : documentTree?.children && documentTree.children.length > 0 ? (
                    <DocumentTree
                      nodes={documentTree.children}
                      expanded={expandedFolders}
                      onToggle={toggleFolder}
                    />
                  ) : (
                    <p className="text-sm text-gray-500">
                      No documents have been uploaded for this tender yet.
                    </p>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Click &ldquo;View Full Details&rdquo; to access and download documents
                </p>
              </div>

              {/* Contact Section */}
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                <h4 className="font-semibold text-gray-900 mb-3">Contact Publisher</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <Phone className="h-4 w-4" />
                    <span>+94 11 234 5678</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <Mail className="h-4 w-4" />
                    <span>tenders@{tender.publisher.name.toLowerCase().replace(/\s+/g, '')}.lk</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <Button className="flex-1">
                  View Full Details
                </Button>
                <Button variant="outline" className="flex-1">
                  Save for Later
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}


