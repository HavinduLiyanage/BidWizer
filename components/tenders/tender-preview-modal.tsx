"use client";

import { useState } from "react";
import { X, Building2, MapPin, Calendar, DollarSign, Clock, Phone, Mail, Folder, FileText, ChevronRight, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Tender } from "@/lib/mock-data";

interface TenderPreviewModalProps {
  tender: Tender | null;
  isOpen: boolean;
  onClose: () => void;
}

interface DocumentNode {
  id: string;
  name: string;
  type: "folder" | "file";
  size?: string;
  children?: DocumentNode[];
}

// Mock document structure for the preview
const mockDocumentStructure: DocumentNode[] = [
  {
    id: "main-docs",
    name: "Main Documents",
    type: "folder",
    children: [
      {
        id: "tender-doc",
        name: "Tender Document.pdf",
        type: "file",
        size: "4.6 MB"
      },
      {
        id: "tech-specs",
        name: "Technical Specifications.pdf",
        type: "file",
        size: "4.2 MB"
      },
      {
        id: "terms",
        name: "Terms & Conditions.pdf",
        type: "file",
        size: "5.9 MB"
      }
    ]
  },
  {
    id: "drawings",
    name: "Technical Drawings",
    type: "folder",
    children: [
      {
        id: "architectural",
        name: "Architectural",
        type: "folder",
        children: [
          {
            id: "floor-plans",
            name: "Floor Plans.pdf",
            type: "file",
            size: "2.1 MB"
          },
          {
            id: "elevations",
            name: "Elevations.pdf",
            type: "file",
            size: "1.8 MB"
          }
        ]
      },
      {
        id: "structural",
        name: "Structural",
        type: "folder",
        children: [
          {
            id: "foundation",
            name: "Foundation Plans.pdf",
            type: "file",
            size: "1.5 MB"
          }
        ]
      }
    ]
  },
  {
    id: "specifications",
    name: "Specifications",
    type: "folder",
    children: [
      {
        id: "material-specs",
        name: "Material Specifications.docx",
        type: "file",
        size: "456 KB"
      },
      {
        id: "quality-standards",
        name: "Quality Standards.pdf",
        type: "file",
        size: "1.2 MB"
      }
    ]
  }
];

const categoryColors: Record<string, { bg: string; text: string }> = {
  "Construction": { bg: "bg-blue-50", text: "text-blue-700" },
  "Healthcare": { bg: "bg-green-50", text: "text-green-700" },
  "Infrastructure": { bg: "bg-amber-50", text: "text-amber-700" },
  "IT & Technology": { bg: "bg-indigo-50", text: "text-indigo-700" },
  "Energy": { bg: "bg-rose-50", text: "text-rose-700" }
};

// Document Tree Component
function DocumentTree({ nodes, expanded, onToggle }: { 
  nodes: DocumentNode[], 
  expanded: Set<string>, 
  onToggle: (id: string) => void 
}) {
  const renderNode = (node: DocumentNode, depth: number = 0) => {
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

export function TenderPreviewModal({ tender, isOpen, onClose }: TenderPreviewModalProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(["main-docs"]));

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
                  <DocumentTree 
                    nodes={mockDocumentStructure}
                    expanded={expandedFolders}
                    onToggle={toggleFolder}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Click "View Full Details" to access and download documents
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


