"use client";

import { useState } from "react";
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Download,
  ChevronLeft,
  ChevronRight,
  FileQuestion,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { FileNode } from "@/lib/mocks/files";

interface DocumentViewerProps {
  selectedNode: FileNode | null;
  className?: string;
}

export function DocumentViewer({ selectedNode, className }: DocumentViewerProps) {
  const [zoom, setZoom] = useState(100);
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = 12; // Mock

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 10, 200));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 10, 50));

  if (!selectedNode) {
    return (
      <div className={cn("flex flex-col items-center justify-center h-full bg-gray-50", className)}>
        <div className="w-16 h-16 bg-gray-200 rounded-2xl flex items-center justify-center mb-4">
          <FileQuestion className="h-8 w-8 text-gray-400" />
        </div>
        <p className="text-gray-600 text-sm font-medium">No document selected</p>
        <p className="text-gray-500 text-xs mt-1">Select a file from the tree to preview</p>
      </div>
    );
  }

  if (selectedNode.type === "folder") {
    return (
      <div className={cn("flex flex-col items-center justify-center h-full bg-gray-50", className)}>
        <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-4">
          <svg
            className="h-8 w-8 text-blue-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
            />
          </svg>
        </div>
        <p className="text-gray-700 text-sm font-medium">{selectedNode.name}</p>
        <p className="text-gray-500 text-xs mt-1">
          {selectedNode.children?.length || 0} items
        </p>
      </div>
    );
  }

  const isPdf = selectedNode.ext === "pdf";
  const isImage = ["jpg", "jpeg", "png", "gif", "webp"].includes(selectedNode.ext || "");
  const isPreviewable = isPdf || isImage;

  return (
    <div className={cn("flex flex-col h-full bg-white", className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 bg-gray-50/80">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-900 truncate max-w-md">
            {selectedNode.name}
          </h3>
          {selectedNode.size && (
            <>
              <Separator orientation="vertical" className="h-4" />
              <span className="text-xs text-muted-foreground">{selectedNode.size}</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-1">
          {isPdf && (
            <>
              {/* Page Navigation */}
              <div className="flex items-center gap-1 mr-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="h-7 px-2"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <span className="text-xs text-gray-600 min-w-[60px] text-center">
                  {currentPage} / {totalPages}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="h-7 px-2"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>

              <Separator orientation="vertical" className="h-4" />

              {/* Zoom Controls */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleZoomOut}
                disabled={zoom <= 50}
                aria-label="Zoom out"
                className="h-7 px-2"
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </Button>
              <span className="text-xs text-gray-600 min-w-[50px] text-center">{zoom}%</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleZoomIn}
                disabled={zoom >= 200}
                aria-label="Zoom in"
                className="h-7 px-2"
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </Button>

              <Separator orientation="vertical" className="h-4" />

              <Button
                variant="ghost"
                size="sm"
                aria-label="Fit to width"
                className="h-7 px-2"
              >
                <Maximize2 className="h-3.5 w-3.5" />
              </Button>
            </>
          )}

          {/* Disabled Download Button */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled
                  aria-label="Download disabled"
                  className="h-7 px-2"
                >
                  <Download className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">Downloads disabled</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto bg-gradient-to-b from-gray-50 to-gray-100 p-6">
        {isPreviewable ? (
          <div className="flex items-center justify-center min-h-full py-8">
            <div
              className="bg-white shadow-xl rounded-xl overflow-hidden border border-gray-200"
              style={{
                transform: `scale(${zoom / 100})`,
                transition: "transform 0.2s ease-out",
                transformOrigin: "center top",
              }}
              onContextMenu={(e) => e.preventDefault()}
            >
              {isPdf ? (
                /* PDF Preview - Using iframe for simplicity */
                <div className="w-[700px] min-h-[900px] bg-white flex items-center justify-center">
                  <div className="text-center p-10 max-w-xl">
                    <div className="w-20 h-20 bg-gradient-to-br from-red-50 to-red-100 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                      <FileQuestion className="h-10 w-10 text-red-400" />
                    </div>
                    <p className="text-lg font-semibold text-gray-900 mb-2">PDF Preview</p>
                    <p className="text-sm text-gray-600 mb-1">{selectedNode.name}</p>
                    <p className="text-xs text-gray-500 mb-6">
                      Page {currentPage} of {totalPages}
                    </p>
                    <div className="p-6 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl text-left border border-gray-200">
                      <p className="text-sm font-semibold text-gray-900 mb-3">
                        📄 Document Preview
                      </p>
                      <p className="text-sm text-gray-700 leading-relaxed mb-4">
                        This tender document contains detailed specifications, requirements, and
                        terms for the Construction of Main Government Building Complex project.
                      </p>
                      <div className="space-y-2 text-xs text-gray-600">
                        <div className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
                          <span>Full project specifications</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
                          <span>Technical requirements</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
                          <span>Terms and conditions</span>
                        </div>
                      </div>
                      <div className="mt-4 pt-4 border-t border-gray-300">
                        <p className="text-xs text-gray-500 italic">
                          💡 Full PDF rendering would require react-pdf library integration.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Image Preview */
                <img
                  src={`/placeholder-document.jpg`}
                  alt={selectedNode.name}
                  className="max-w-full h-auto"
                  onContextMenu={(e) => e.preventDefault()}
                />
              )}
            </div>
          </div>
        ) : (
          /* Non-previewable file types */
          <div className="flex flex-col items-center justify-center h-full">
            <div className="w-20 h-20 bg-gray-200 rounded-2xl flex items-center justify-center mb-4">
              <FileQuestion className="h-10 w-10 text-gray-400" />
            </div>
            <p className="text-gray-700 font-medium mb-1">{selectedNode.name}</p>
            <p className="text-sm text-gray-500 mb-4">Preview not available</p>
            <div className="p-4 bg-blue-50 rounded-lg text-center max-w-sm">
              <p className="text-xs text-gray-600">
                This file type ({selectedNode.ext?.toUpperCase()}) cannot be previewed in the
                browser. Use the file tree to browse other documents.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

