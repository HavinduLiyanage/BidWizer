"use client";

import { useState, useEffect } from "react";
import { X, Search, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { DocumentViewer } from "./DocumentViewer";
import { AiAssistantPanel } from "./AiAssistantPanel";
import { getTenderTree, type FileNode } from "@/lib/mocks/files";
import { cn } from "@/lib/utils";
import { FileTree } from "./FileTree";
import { UploadPanel } from "./UploadPanel";
import { useUserSession } from "@/lib/hooks/use-session";

interface TenderWorkspaceModalProps {
  tenderId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function TenderWorkspaceModal({
  tenderId,
  isOpen,
  onClose,
}: TenderWorkspaceModalProps) {
  const [tree, setTree] = useState<FileNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<FileNode | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFileTreeCollapsed, setIsFileTreeCollapsed] = useState(false);
  const [isAiPanelCollapsed, setIsAiPanelCollapsed] = useState(false);
  const { user } = useUserSession();
  
  // Check if user is a publisher (only publishers can upload files)
  const canUpload = user?.organizationType === 'PUBLISHER';

  // Load tree data
  useEffect(() => {
    if (isOpen) {
      loadTree();
      // Load last selected file from localStorage
      const lastFileId = localStorage.getItem(`tender_${tenderId}_lastFile`);
      if (lastFileId && tree) {
        const findNode = (node: FileNode): FileNode | null => {
          if (node.id === lastFileId) return node;
          if (node.children) {
            for (const child of node.children) {
              const found = findNode(child);
              if (found) return found;
            }
          }
          return null;
        };
        const node = findNode(tree);
        if (node) setSelectedNode(node);
      }
    }
  }, [isOpen, tenderId]);

  const loadTree = async () => {
    setIsLoading(true);
    try {
      const data = await getTenderTree(tenderId);
      setTree(data);
    } catch (error) {
      console.error("Failed to load tree:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectNode = (node: FileNode) => {
    setSelectedNode(node);
    // Save to localStorage
    if (node.type === "file") {
      localStorage.setItem(`tender_${tenderId}_lastFile`, node.id);
    }
  };

  const handleClose = () => {
    onClose();
  };

  // Prevent default context menu
  useEffect(() => {
    const preventContextMenu = (e: MouseEvent) => {
      if (isOpen) {
        const target = e.target as HTMLElement;
        if (target.closest(".document-viewer")) {
          e.preventDefault();
        }
      }
    };

    document.addEventListener("contextmenu", preventContextMenu);
    return () => document.removeEventListener("contextmenu", preventContextMenu);
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent
        className="max-w-full w-screen h-screen p-0 gap-0 bg-white border-0 rounded-none"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        {/* Top Bar */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-gray-200 bg-white shadow-sm">
          <div className="flex items-center gap-4 flex-1">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm">
              <span className="font-semibold text-gray-900">Tender Workspace</span>
              {selectedNode && (
                <>
                  <span className="text-gray-400">/</span>
                  <span className="text-gray-600 truncate max-w-md text-xs">
                    {selectedNode.name}
                  </span>
                </>
              )}
            </div>

            {/* Quick Search */}
            <div className="relative max-w-sm ml-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <Input
                placeholder="Search documents..."
                className="pl-9 h-9 text-xs bg-gray-50 border-gray-200 focus:bg-white"
              />
            </div>
          </div>

          {/* Close Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="ml-4 hover:bg-gray-100"
            aria-label="Close workspace"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
              <p className="text-sm text-gray-600">Loading documents...</p>
            </div>
          </div>
        )}

        {/* Main Content - 3 Panes */}
        {!isLoading && tree && (
          <div className="flex-1 flex overflow-hidden bg-gray-50">
            {/* Left: File Tree */}
            <div
              className={cn(
                "border-r border-gray-200 bg-white transition-all duration-300 relative flex-shrink-0",
                isFileTreeCollapsed ? "w-12" : "w-72"
              )}
            >
              {isFileTreeCollapsed ? (
                <div className="flex flex-col items-center py-4 gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsFileTreeCollapsed(false)}
                    className="p-2 hover:bg-gray-100"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex h-full flex-col">
                    {canUpload && (
                      <UploadPanel tenderId={tenderId} onUploadQueued={loadTree} />
                    )}
                    <FileTree
                      tree={tree}
                      selectedId={selectedNode?.id}
                      onSelect={handleSelectNode}
                      className="flex-1"
                    />
                  </div>
                  <button
                    onClick={() => setIsFileTreeCollapsed(true)}
                    className="absolute top-3 right-2 p-1.5 hover:bg-gray-100 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                    aria-label="Collapse file tree"
                  >
                    <ChevronLeft className="h-3.5 w-3.5 text-gray-500" />
                  </button>
                </>
              )}
            </div>

            {/* Center: Document Viewer */}
            <div className="flex-1 overflow-hidden document-viewer min-w-0">
              <DocumentViewer selectedNode={selectedNode} />
            </div>

            {/* Right: AI Assistant */}
            <div
              className={cn(
                "border-l border-gray-200 bg-white transition-all duration-300 relative flex-shrink-0",
                isAiPanelCollapsed ? "w-12" : "w-[420px]"
              )}
            >
              {isAiPanelCollapsed ? (
                <div className="flex flex-col items-center py-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsAiPanelCollapsed(false)}
                    className="p-2 hover:bg-gray-100"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <AiAssistantPanel
                    tenderId={tenderId}
                    selectedFileId={selectedNode?.type === "file" ? selectedNode.id : undefined}
                    selectedFolderPath={
                      selectedNode?.type === "folder" ? selectedNode.path : undefined
                    }
                    className="h-full"
                  />
                  <button
                    onClick={() => setIsAiPanelCollapsed(true)}
                    className="absolute top-3 left-2 p-1.5 hover:bg-gray-100 rounded-md transition-colors z-10 opacity-0 group-hover:opacity-100"
                    aria-label="Collapse AI panel"
                  >
                    <ChevronRight className="h-3.5 w-3.5 text-gray-500" />
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

