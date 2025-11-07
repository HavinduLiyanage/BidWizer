"use client";

import { useEffect, useMemo, useState } from "react";
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
  Globe,
} from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TenderWorkspaceModal } from "@/components/tender-workspace/TenderWorkspaceModal";
import { useUser } from "@/lib/hooks/use-session";

type Attachment = {
  id: string;
  name: string;
  url: string | null;
  mimeType: string | null;
  size: number | null | undefined;
  isAdvertisement: boolean;
};

type TenderDetail = {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  deadline: string;
  publishedDate: string;
  estimatedValue: string | null;
  regionLocation: string | null;
  requirements: string[];
  contactPersonName: string | null;
  contactNumber: string | null;
  contactEmail: string | null;
  companyWebsite: string | null;
  preBidMeetingAt: string | null;
  publisher: {
    id: string;
    name: string;
    logo: string | null;
  };
  attachments: Attachment[];
};

const STATUS_LABELS: Record<string, string> = {
  PUBLISHED: "Active",
  DRAFT: "Draft",
  CLOSED: "Closed",
  AWARDED: "Awarded",
  CANCELLED: "Cancelled",
};

const STATUS_BADGE_CLASSES: Record<string, string> = {
  Active: "bg-emerald-50 text-emerald-700 border-0",
  Draft: "bg-amber-50 text-amber-700 border-0",
  Closed: "bg-slate-100 text-slate-700 border-0",
  Awarded: "bg-blue-50 text-blue-700 border-0",
  Cancelled: "bg-rose-50 text-rose-700 border-0",
};

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  Construction: { bg: "bg-blue-50", text: "text-blue-700" },
  Healthcare: { bg: "bg-green-50", text: "text-green-700" },
  Infrastructure: { bg: "bg-amber-50", text: "text-amber-700" },
  "IT & Technology": { bg: "bg-indigo-50", text: "text-indigo-700" },
  Energy: { bg: "bg-rose-50", text: "text-rose-700" },
};

function toStatusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status ?? "Active";
}

function formatDate(value: string | null | undefined, options?: Intl.DateTimeFormatOptions) {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    ...options,
  }).format(date);
}

function computeTimeLeft(deadline: string | null | undefined): string {
  if (!deadline) {
    return "No deadline";
  }

  const deadlineDate = new Date(deadline);
  if (Number.isNaN(deadlineDate.getTime())) {
    return "No deadline";
  }

  const now = new Date();
  const diff = deadlineDate.getTime() - now.getTime();
  const daysLeft = Math.ceil(diff / (1000 * 60 * 60 * 24));

  if (daysLeft < 0) return "Expired";
  if (daysLeft === 0) return "Due today";
  if (daysLeft === 1) return "1 day left";
  return `${daysLeft} days left`;
}

function formatFileSize(size: number | null | undefined): string {
  if (!size || size <= 0) {
    return "";
  }

  const units = ["B", "KB", "MB", "GB"];
  let value = size;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(1)} ${units[unitIndex]}`;
}

function isImageAttachment(attachment: Attachment): boolean {
  const mime = attachment.mimeType?.toLowerCase() ?? "";
  if (mime.startsWith("image/")) {
    return true;
  }
  const normalizedName = attachment.name ? attachment.name.toLowerCase() : "";
  return /\.(png|jpe?g|gif|webp|bmp|svg)$/.test(normalizedName);
}

function isZipAttachment(attachment: Attachment): boolean {
  const mime = attachment.mimeType?.toLowerCase() ?? "";
  if (mime.includes("zip")) {
    return true;
  }
  const normalizedName = attachment.name ? attachment.name.toLowerCase() : "";
  return /\.zip$/.test(normalizedName);
}

function buildDocumentStreamUrl(tenderId: string, attachmentId: string): string {
  return `/api/public/tenders/${encodeURIComponent(tenderId)}/documents/${encodeURIComponent(
    attachmentId,
  )}/stream`;
}

function resolveAttachmentUrl(
  tenderId: string | null | undefined,
  attachment?: Attachment | null,
): string | null {
  if (!attachment) {
    return null;
  }

  if (attachment.url) {
    return attachment.url;
  }

  if (!tenderId) {
    return null;
  }

  return buildDocumentStreamUrl(tenderId, attachment.id);
}

export default function TenderDetailPage() {
  const params = useParams();
  const tenderId = params.id as string;
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(false);
  const [tender, setTender] = useState<TenderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useUser();

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    async function loadTender() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/public/tenders/${tenderId}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload?.error ?? "Failed to load tender");
        }

        const payload = await response.json();
        if (isMounted) {
          const requirements = Array.isArray(payload.requirements)
            ? payload.requirements.filter((item: unknown) => typeof item === "string").map((item: string) => item.trim()).filter(Boolean)
            : [];

          const attachments = Array.isArray(payload.attachments)
            ? payload.attachments.map((item: any) => ({
                id: item.id ?? crypto.randomUUID(),
                name: typeof item.name === "string" && item.name.length > 0 ? item.name : "Document",
                url: typeof item.url === "string" ? item.url : null,
                mimeType: typeof item.mimeType === "string" ? item.mimeType : null,
                size: typeof item.size === "number" ? item.size : null,
                isAdvertisement: Boolean(item.isAdvertisement),
              }))
            : [];

          const detail: TenderDetail = {
            id: payload.id,
            title: payload.title ?? "Untitled tender",
            description: payload.description ?? "",
            category: payload.category ?? "General",
            status: payload.status ?? "PUBLISHED",
            deadline: payload.deadline,
            publishedDate: payload.publishedDate,
            estimatedValue: payload.estimatedValue ?? null,
            regionLocation: payload.regionLocation ?? null,
            requirements,
            contactPersonName: payload.contactPersonName ?? null,
            contactNumber: payload.contactNumber ?? null,
            contactEmail: payload.contactEmail ?? null,
            companyWebsite: payload.companyWebsite ?? null,
            preBidMeetingAt: payload.preBidMeetingAt ?? null,
            publisher: {
              id: payload.publisher?.id ?? "publisher",
              name: payload.publisher?.name ?? "Publisher",
              logo: payload.publisher?.logo ?? null,
            },
            attachments,
          };

          setTender(detail);
        }
      } catch (fetchError) {
        if (controller.signal.aborted) {
          return;
        }
        console.error("Failed to load tender details:", fetchError);
        if (isMounted) {
          setError(fetchError instanceof Error ? fetchError.message : "Unable to load tender");
          setTender(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadTender();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [tenderId]);

  const statusLabel = tender ? toStatusLabel(tender.status) : "Active";
  const statusBadgeClass = STATUS_BADGE_CLASSES[statusLabel] ?? STATUS_BADGE_CLASSES.Active;

  const categoryColor = useMemo(() => {
    if (!tender) {
      return CATEGORY_COLORS.Construction;
    }
    return CATEGORY_COLORS[tender.category] ?? CATEGORY_COLORS.Construction;
  }, [tender]);

  const timeLeft = tender ? computeTimeLeft(tender.deadline) : "";

  const requirementList = tender?.requirements ?? [];
  const advertisementImage = useMemo(() => {
    if (!tender) {
      return null;
    }
    const primary = tender.attachments.find(
      (attachment) =>
        attachment.isAdvertisement && isImageAttachment(attachment)
    );

    if (primary) {
      return primary;
    }

    return tender.attachments.find(
      (attachment) => isImageAttachment(attachment)
    ) ?? null;
  }, [tender]);

  const advertisementImageSrc = advertisementImage
    ? resolveAttachmentUrl(tenderId, advertisementImage)
    : null;

  // Bidder accounts must not be able to download tender documents
  const canDownloadAttachments = (user?.organizationType ?? null) !== "BIDDER";

  const downloadableAttachments = useMemo(() => {
    if (!tender) {
      return [];
    }
    return tender.attachments.filter(
      (attachment) =>
        !attachment.isAdvertisement &&
        !isImageAttachment(attachment)
    );
  }, [tender]);

  const showAttachments = canDownloadAttachments && downloadableAttachments.length > 0;

  const preBidMeetingTime = useMemo(() => {
    if (!tender?.preBidMeetingAt) {
      return null;
    }
    const meetingDate = new Date(tender.preBidMeetingAt);
    if (Number.isNaN(meetingDate.getTime())) {
      return null;
    }
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "numeric",
    }).format(meetingDate);
  }, [tender?.preBidMeetingAt]);

  const preBidMeetingAtValue = tender?.preBidMeetingAt ?? null;

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex-1 min-h-[50vh] flex items-center justify-center">
          <span className="text-sm text-gray-500">Loading tender details...</span>
        </div>
      );
    }

    if (error || !tender) {
      return (
        <div className="flex-1 min-h-[50vh] flex items-center justify-center">
          <div className="text-center space-y-2">
            <h2 className="text-xl font-semibold text-gray-900">Tender unavailable</h2>
            <p className="text-sm text-gray-600">
              {error ?? "The tender you are looking for could not be found."}
            </p>
        </div>
      </div>
    );
    }

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Title & Status */}
            <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm"
          >
            <div className="flex items-start justify-between mb-4 gap-4">
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-900 mb-3">{tender.title}</h1>
                <div className="flex flex-wrap items-center gap-3">
                  <Badge className={`${categoryColor.bg} ${categoryColor.text} border-0`}>
                    <Building2 className="h-3 w-3 mr-1" />
                    {tender.category}
                  </Badge>
                  {tender.regionLocation && (
                    <div className="flex items-center gap-1.5 text-sm text-gray-600">
                      <MapPin className="h-3.5 w-3.5" />
                      {tender.regionLocation}
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 text-sm text-gray-600">
                    <Calendar className="h-3.5 w-3.5" />
                    Published {formatDate(tender.publishedDate)}
                  </div>
                </div>
              </div>
              <Badge className={`${statusBadgeClass} px-3 py-1`}>{statusLabel}</Badge>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
              {tender.description || "No description provided for this tender."}
            </p>
          </motion.div>

          {/* Project Overview */}
          {false && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm"
          >
            <div className="flex items-center gap-2 mb-4">
              <Clock className="h-4 w-4 text-primary" />
              <h2 className="text-lg font-semibold text-gray-900">Project Timeline</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-xs uppercase tracking-wide text-amber-700 font-semibold">
                  Submission Deadline
                </p>
                <p className="mt-1 text-sm text-gray-900 font-medium">
                  {formatDate(tender!.deadline, { weekday: "long" })}
                </p>
                <p className="text-xs text-amber-700 mt-2 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {timeLeft}
                </p>
              </div>
              {preBidMeetingAtValue && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-xs uppercase tracking-wide text-blue-700 font-semibold">
                    Pre-bid Meeting
                  </p>
                  <p className="mt-1 text-sm text-gray-900 font-medium">
                    {formatDate(preBidMeetingAtValue, { weekday: "long" })}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
          )}

          {/* Project Advertisement */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm"
          >
          <div className="flex items-center gap-2 mb-4">
            <Eye className="h-4 w-4 text-primary" />
            <h2 className="text-lg font-semibold text-gray-900">Project Advertisement</h2>
          </div>
          {advertisementImage && advertisementImageSrc ? (
            <div className="flex flex-col items-center gap-3">
              <div className="w-full max-w-xl">
                <div className="relative w-full overflow-hidden rounded-lg border border-gray-200 bg-white">
                  <Image
                    src={advertisementImageSrc}
                    alt={`${tender.title} advertisement`}
                    width={800}
                    height={1100}
                    className="h-auto w-full object-contain"
                    priority
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500 text-center">
                  Uploaded by the publisher for this tender opportunity.
                </p>
              </div>
            ) : (
              <p className="text-sm text-gray-600">
                The publisher has not provided an advertisement image for this tender.
              </p>
            )}
          </motion.div>

          {/* Requirements */}
          {requirementList.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm"
            >
              <div className="flex items-center gap-2 mb-4">
                <FileText className="h-4 w-4 text-primary" />
                <h2 className="text-lg font-semibold text-gray-900">Key Requirements</h2>
              </div>
              <ul className="space-y-3 text-sm text-gray-700">
                {requirementList.map((requirement) => (
                  <li key={requirement} className="flex items-start gap-3">
                    <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-primary" aria-hidden />
                    <span>{requirement}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          )}

          {/* Attachments */}
          {showAttachments && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm"
            >
              <div className="flex items-center gap-2 mb-4">
                <FileText className="h-4 w-4 text-primary" />
                <h2 className="text-lg font-semibold text-gray-900">Attachments</h2>
              </div>
              <ul className="space-y-3">
                {downloadableAttachments.map((attachment) => {
                  const downloadUrl = resolveAttachmentUrl(tenderId, attachment);
                  const showDownloadLink = downloadUrl && !isZipAttachment(attachment);
                  return (
                    <li
                      key={attachment.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 px-4 py-3 text-sm text-gray-700"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                        <span className="truncate font-medium">{attachment.name}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        {attachment.size ? (
                          <span className="text-xs text-gray-500">{formatFileSize(attachment.size)}</span>
                        ) : null}
                        {showDownloadLink ? (
                          <Link
                            href={downloadUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-medium text-primary hover:underline"
                          >
                            Download
                          </Link>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </motion.div>
          )}
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
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Project Timeline</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                <Calendar className="h-5 w-5 text-amber-600" />
                <div>
                  <p className="text-sm font-semibold text-gray-900">Submission deadline</p>
                  <p className="text-xs text-gray-600">
                    {formatDate(tender!.deadline, { weekday: "long" })}
                  </p>
                  <p className="text-xs text-amber-600">{timeLeft}</p>
                </div>
              </div>
              {preBidMeetingAtValue && (
                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <Users className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Pre-bid meeting</p>
                    <p className="text-xs text-gray-600">
                      {formatDate(preBidMeetingAtValue, { weekday: "long" })}
                    </p>
                    {preBidMeetingTime && (
                      <p className="text-xs text-blue-600">{preBidMeetingTime}</p>
                    )}
                  </div>
                </div>
              )}
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
                <p className="text-lg font-bold text-gray-900">
                  {tender.estimatedValue ?? "Not specified"}
                </p>
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
                  {tender.contactPersonName ?? tender.publisher.name}
                </p>
              </div>
              {tender.contactNumber && (
                <div className="flex items-center gap-2 text-gray-700">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <span>{tender.contactNumber}</span>
                </div>
              )}
              {tender.contactEmail && (
                <div className="flex items-center gap-2 text-gray-700">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <span>{tender.contactEmail}</span>
                </div>
              )}
              {tender.companyWebsite && (
                <div className="flex items-center gap-2 text-gray-700">
                  <Globe className="h-4 w-4 text-gray-400" />
                  <Link
                    href={tender.companyWebsite.startsWith("http") ? tender.companyWebsite : `https://${tender.companyWebsite}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {tender.companyWebsite}
                  </Link>
                </div>
              )}
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
              <h3 className="text-sm font-semibold text-gray-900">View Tender Workspace</h3>
            </div>
            <p className="text-xs text-gray-600 mb-4">
              Open the workspace to review tender documents and collaborate with your team.
            </p>
            <Button onClick={() => setIsWorkspaceOpen(true)} className="w-full" size="sm">
              <Eye className="h-4 w-4 mr-2" />
              Open Workspace
            </Button>
          </motion.div>
        </div>
      </div>
      </div>
    );
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
            Back to tenders
          </Link>

          {renderContent()}
        </div>
      </main>

      <SiteFooter />

      <TenderWorkspaceModal tenderId={tenderId} isOpen={isWorkspaceOpen} onClose={() => setIsWorkspaceOpen(false)} />
    </>
  );
}
