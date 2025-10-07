"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import {
  Building2,
  Calendar,
  DollarSign,
  FileText,
  MapPin,
  Eye,
  Users,
  Clock,
  Phone,
  Mail,
  ArrowLeft,
} from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TenderWorkspaceModal } from "@/components/tender-workspace/TenderWorkspaceModal";
import { mockTenders } from "@/lib/mock-data";

export default function TenderDetailPage() {
  const params = useParams();
  const tenderId = params.id as string;
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(false);

  // Find the tender
  const tender = mockTenders.find((t) => t.id === tenderId);

  if (!tender) {
    return (
      <>
        <SiteHeader variant="page" />
        <main className="flex-1 bg-[#F9FAFB] min-h-screen">
          <div className="max-w-5xl mx-auto px-8 py-20">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Tender Not Found</h1>
              <p className="text-gray-600">The tender you're looking for doesn't exist.</p>
            </div>
          </div>
        </main>
        <SiteFooter />
      </>
    );
  }

  const categoryColors: Record<string, { bg: string; text: string }> = {
    Construction: { bg: "bg-blue-50", text: "text-blue-700" },
    Healthcare: { bg: "bg-green-50", text: "text-green-700" },
    Infrastructure: { bg: "bg-amber-50", text: "text-amber-700" },
    "IT & Technology": { bg: "bg-indigo-50", text: "text-indigo-700" },
    Energy: { bg: "bg-rose-50", text: "text-rose-700" },
  };

  const categoryColor = categoryColors[tender.category] || categoryColors.Construction;

  // Calculate time left
  const getTimeLeft = () => {
    const deadline = new Date(tender.deadline);
    const now = new Date();
    const diff = deadline.getTime() - now.getTime();
    const daysLeft = Math.ceil(diff / (1000 * 60 * 60 * 24));
    
    if (daysLeft < 0) return "Expired";
    if (daysLeft === 0) return "Today";
    if (daysLeft === 1) return "1 day left";
    return `${daysLeft} days left`;
  };

  return (
    <>
      <SiteHeader variant="page" />

      <main className="flex-1 bg-[#F9FAFB] min-h-screen">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Back Button */}
          <Link
            href="/tenders"
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-6 transition-colors group"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            Back to Dashboard
          </Link>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Main Details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Title & Status */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h1 className="text-2xl font-bold text-gray-900 mb-3">{tender.title}</h1>
                    <div className="flex flex-wrap items-center gap-3">
                      <Badge className={`${categoryColor.bg} ${categoryColor.text} border-0`}>
                        <Building2 className="h-3 w-3 mr-1" />
                        {tender.category}
                      </Badge>
                      {tender.location && (
                        <div className="flex items-center gap-1.5 text-sm text-gray-600">
                          <MapPin className="h-3.5 w-3.5" />
                          {tender.location}
                        </div>
                      )}
                    </div>
                  </div>
                  <Badge
                    className={`${
                      tender.status === "Active"
                        ? "bg-red-500 text-white"
                        : "bg-gray-500 text-white"
                    } border-0 px-3 py-1`}
                  >
                    {tender.status === "Active" ? "Expired" : tender.status}
                  </Badge>
                </div>
              </motion.div>

              {/* Project Advertisement */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
              >
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-gray-600" />
                    <h2 className="text-base font-semibold text-gray-900">
                      Project Advertisement
                    </h2>
                  </div>
                </div>
                <div className="p-6">
                  {/* Mock Advertisement Image */}
                  <div className="bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 aspect-[4/3] flex items-center justify-center mb-4">
                    <div className="text-center p-8">
                      <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-sm font-medium text-gray-600 mb-1">
                        Tender Advertisement Document
                      </p>
                      <p className="text-xs text-gray-500">
                        Official tender notice and project details
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 text-center">
                    Published by {tender.publisher.name}
                  </p>
                </div>
              </motion.div>

              {/* Key Requirements */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm"
              >
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="h-4 w-4 text-gray-600" />
                  <h2 className="text-base font-semibold text-gray-900">Key Requirements</h2>
                </div>
                <ul className="space-y-2.5 text-sm text-gray-700">
                  <li className="flex gap-3">
                    <span className="text-primary mt-1">•</span>
                    <span>
                      Operate and maintain all four components: transfer stations, sanitary
                      landfill, rail connectivity, and all associated equipment
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-primary mt-1">•</span>
                    <span>
                      Implement innovative resource recovery technologies with minimal
                      environmental impact
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-primary mt-1">•</span>
                    <span>
                      Ensure compliance with Sri Lankan environmental, health, and safety
                      regulations
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-primary mt-1">•</span>
                    <span>Establish an SPV (Special Purpose Vehicle) with government participation</span>
                  </li>
                </ul>
              </motion.div>


            </div>

            {/* Right Column - Sidebar */}
            <div className="space-y-6">
              {/* Submission Deadline */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm"
              >
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Submission Deadline</h3>
                <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <Calendar className="h-5 w-5 text-amber-600" />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {new Date(tender.deadline).toLocaleDateString("en-US", {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* Estimated Value */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm"
              >
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Estimated Value</h3>
                <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-lg font-bold text-gray-900">{tender.budget || "$5M"}</p>
                  </div>
                </div>
              </motion.div>

              {/* Contact Information */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm"
              >
                <div className="flex items-center gap-2 mb-4">
                  <Users className="h-4 w-4 text-gray-600" />
                  <h3 className="text-sm font-semibold text-gray-900">Contact Information</h3>
                </div>
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-gray-600 mb-1">Name:</p>
                    <p className="font-medium text-gray-900">
                      Project Director, {tender.publisher.name}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span>+94 11 2852292</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <span>pmuswmp@gmail.com</span>
                  </div>
                </div>
              </motion.div>

              {/* View Tender Document */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-5 shadow-sm"
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                    <FileText className="h-4 w-4 text-primary" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900">View Tender Document</h3>
                </div>
                <p className="text-xs text-gray-600 mb-4">
                  Access all tender documents and specifications
                </p>
                <Button
                  onClick={() => setIsWorkspaceOpen(true)}
                  className="w-full"
                  size="sm"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Open Document Workspace
                </Button>
              </motion.div>
            </div>
          </div>
        </div>
      </main>

      <SiteFooter />

      {/* Workspace Modal */}
      <TenderWorkspaceModal
        tenderId={tenderId}
        isOpen={isWorkspaceOpen}
        onClose={() => setIsWorkspaceOpen(false)}
      />
    </>
  );
}
