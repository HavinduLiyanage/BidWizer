"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  FileText,
  File,
  FileSpreadsheet,
  Archive,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { TenderDocumentNode } from "@/types/tender-documents";

interface FileTreeProps {
  tree: TenderDocumentNode;
  selectedId?: string;
  onSelect: (node: TenderDocumentNode) => void;
  className?: string;
}

export function FileTree({ tree, selectedId, onSelect, className }: FileTreeProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["root"]));

  const toggleExpand = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const getFileIcon = (node: TenderDocumentNode) => {
    if (node.type === "folder") {
      return expanded.has(node.id) ? (
        <FolderOpen className="h-4 w-4 text-blue-500" />
      ) : (
        <Folder className="h-4 w-4 text-blue-500" />
      );
    }

    switch (node.ext) {
      case "pdf":
        return <FileText className="h-4 w-4 text-red-500" />;
      case "docx":
      case "doc":
        return <FileText className="h-4 w-4 text-blue-600" />;
      case "xlsx":
      case "xls":
        return <FileSpreadsheet className="h-4 w-4 text-green-600" />;
      case "zip":
      case "rar":
        return <Archive className="h-4 w-4 text-gray-600" />;
      default:
        return <File className="h-4 w-4 text-gray-500" />;
    }
  };

  const renderNode = (node: TenderDocumentNode, depth: number = 0) => {
    const isExpanded = expanded.has(node.id);
    const isSelected = selectedId === node.id;
    const hasChildren = node.children && node.children.length > 0;

    return (
      <div key={node.id}>
        <button
          onClick={() => {
            if (node.type === "folder") {
              toggleExpand(node.id);
            }
            onSelect(node);
          }}
          className={cn(
            "group flex w-full items-center gap-2 px-2 py-1.5 text-sm transition-colors hover:bg-muted rounded-md",
            isSelected && "bg-muted/60 text-foreground font-medium",
            !isSelected && "text-gray-700"
          )}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
        >
          {/* Expand/collapse icon */}
          {node.type === "folder" && (
            <span className="flex-shrink-0">
              {isExpanded ? (
                <ChevronDown className="h-3.5 w-3.5 text-gray-500" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 text-gray-500" />
              )}
            </span>
          )}
          {node.type === "file" && <span className="w-3.5" />}

          {/* Icon */}
          <span className="flex-shrink-0">{getFileIcon(node)}</span>

          {/* Name */}
          <span className="flex-1 truncate text-left">{node.name}</span>

          {/* Size badge */}
          {node.size && (
            <span className="flex-shrink-0 text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
              {node.size}
            </span>
          )}
        </button>

        {/* Children */}
        {node.type === "folder" && isExpanded && hasChildren && (
          <div>{node.children!.map((child) => renderNode(child, depth + 1))}</div>
        )}
      </div>
    );
  };

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Breadcrumb */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50/50">
        <p className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
          File Explorer
        </p>
      </div>

      {/* Tree */}
      <ScrollArea className="flex-1 px-2 py-2">
        {renderNode(tree)}
      </ScrollArea>
    </div>
  );
}

