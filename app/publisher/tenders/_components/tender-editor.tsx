"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Upload, 
  X, 
  FileText, 
  Calendar, 
  DollarSign, 
  MapPin, 
  User, 
  Phone, 
  Mail, 
  Globe, 
  Key, 
  Plus,
  Clock,
  Loader2,
  Image as ImageIcon,
  File,
  AlertCircle,
  CheckCircle2,
  Trash2
} from "lucide-react";
import { motion } from "framer-motion";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type TenderEditorMode = "create" | "edit";
type UploadStatusValue = "PENDING" | "UPLOADING" | "PROCESSING" | "COMPLETED" | "FAILED";

interface TenderEditorProps {
  mode: TenderEditorMode;
  tenderId?: string;
}

const TENDER_STATUS_OPTIONS: TenderStatusValue[] = [
  "PUBLISHED",
  "DRAFT",
  "CLOSED",
  "AWARDED",
  "CANCELLED",
];

interface UploadedFile {
  id: string;
  uploadId?: string;
  storageKey?: string;
  name: string;
  size: number;
  type: string;
  status: UploadStatusValue;
  error?: string | null;
  isExisting?: boolean;
  downloadUrl?: string | null;
  isDeleting?: boolean;
}

type TenderStatusValue = 'DRAFT' | 'PUBLISHED' | 'CLOSED' | 'AWARDED' | 'CANCELLED';

export default function TenderEditor({ mode, tenderId: initialTenderId }: TenderEditorProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [tenderId, setTenderId] = useState<string | null>(() => initialTenderId ?? null);
  const [isCreatingTender, setIsCreatingTender] = useState(false);
  const [isLoadingExisting, setIsLoadingExisting] = useState(mode === "edit");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    category: "",
    description: "",
    submissionDeadline: "",
    estimatedValue: "",
    preBidMeetingDate: "",
    preBidMeetingTime: "",
    regionLocation: "",
    contactPersonName: "",
    contactNumber: "",
    contactEmail: "",
    companyWebsite: "",
  });
  const [tenderStatus, setTenderStatus] = useState<TenderStatusValue>("PUBLISHED");
  const [requirements, setRequirements] = useState<string[]>([]);
  const [newRequirement, setNewRequirement] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [advertisementImageName, setAdvertisementImageName] = useState<string | null>(null);
  const [advertisementUploadStatus, setAdvertisementUploadStatus] = useState<UploadStatusValue | null>(null);
  const [advertisementUploadError, setAdvertisementUploadError] = useState<string | null>(null);
  const [advertisementImagePreview, setAdvertisementImagePreview] = useState<string | null>(null);
  const [advertisementUploadId, setAdvertisementUploadId] = useState<string | null>(null);
  const [isRemovingAdvertisement, setIsRemovingAdvertisement] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    setTenderId(initialTenderId ?? null);
  }, [initialTenderId]);

  useEffect(() => {
    return () => {
      if (advertisementImagePreview && advertisementImagePreview.startsWith("blob:")) {
        URL.revokeObjectURL(advertisementImagePreview);
      }
    };
  }, [advertisementImagePreview]);

  useEffect(() => {
    if (mode !== "edit" || !initialTenderId) {
      setIsLoadingExisting(false);
      return;
    }

    let isCancelled = false;

    const formatDateInput = (value: string | null | undefined) => {
      if (!value) return "";
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) {
        return "";
      }
      return date.toISOString().split("T")[0] ?? "";
    };

    const formatTimeInput = (value: string | null | undefined) => {
      if (!value) return "";
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) {
        return "";
      }
      return date.toISOString().split("T")[1]?.slice(0, 5) ?? "";
    };

    async function loadTender() {
      setIsLoadingExisting(true);
      setLoadError(null);

      try {
        const response = await fetch(`/api/tenders/${initialTenderId}`, {
          credentials: "include",
        });

        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body?.error ?? "Failed to load tender");
        }

        const tender = await response.json();
        if (isCancelled) {
          return;
        }

        setTenderId(tender.id ?? initialTenderId);
        setFormData({
          title: tender.title ?? "",
          category: tender.category ?? "",
          description: tender.description ?? "",
          submissionDeadline: formatDateInput(tender.deadline),
          estimatedValue: tender.estimatedValue ?? "",
          preBidMeetingDate: formatDateInput(tender.preBidMeetingAt),
          preBidMeetingTime: formatTimeInput(tender.preBidMeetingAt),
          regionLocation: tender.regionLocation ?? "",
          contactPersonName: tender.contactPersonName ?? "",
          contactNumber: tender.contactNumber ?? "",
          contactEmail: tender.contactEmail ?? "",
          companyWebsite: tender.companyWebsite ?? "",
        });
        const statusValue = TENDER_STATUS_OPTIONS.includes(tender.status as TenderStatusValue)
          ? (tender.status as TenderStatusValue)
          : "PUBLISHED";
        setTenderStatus(statusValue);

        const requirementValues: string[] = Array.isArray(tender.requirements)
          ? tender.requirements.map((item: unknown) =>
              typeof item === "string" ? item : JSON.stringify(item)
            )
          : [];
        setRequirements(requirementValues);

        const advertisementUpload = Array.isArray(tender.uploads)
          ? tender.uploads.find((upload: any) => upload.isAdvertisement)
          : undefined;

        if (advertisementUpload) {
          setAdvertisementImageName(advertisementUpload.originalName ?? advertisementUpload.filename ?? null);
          setAdvertisementImagePreview(advertisementUpload.url ?? null);
          setAdvertisementUploadStatus(null);
          setAdvertisementUploadError(null);
          setAdvertisementUploadId(advertisementUpload.id ?? null);
        } else {
          setAdvertisementImageName(null);
          setAdvertisementImagePreview(null);
          setAdvertisementUploadId(null);
        }

        const documentUploads = Array.isArray(tender.uploads)
          ? tender.uploads.filter((upload: any) => !upload.isAdvertisement)
          : [];

        setUploadedFiles(
          documentUploads.map((upload: any) => ({
            id: upload.id,
            uploadId: upload.id,
            storageKey: upload.storageKey ?? undefined,
            name: upload.originalName ?? upload.filename ?? `Document-${upload.id.slice(0, 6)}`,
            size: typeof upload.size === "number" ? upload.size : 0,
            type: upload.mimeType ?? "application/octet-stream",
            status: (upload.status ?? "COMPLETED") as UploadStatusValue,
            isExisting: true,
            downloadUrl: upload.url ?? null,
            error: upload.error ?? null,
            isDeleting: false,
          }))
        );
      } catch (error) {
        console.error("Failed to load tender:", error);
        if (!isCancelled) {
          setLoadError(error instanceof Error ? error.message : "Unable to load tender");
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingExisting(false);
        }
      }
    }

    loadTender();

    return () => {
      isCancelled = true;
    };
  }, [mode, initialTenderId, reloadToken]);

  const validateForm = useCallback(() => {
    const missing: string[] = [];

    if (!formData.title.trim()) missing.push("Title");
    if (!formData.category.trim()) missing.push("Category");
    if (!formData.submissionDeadline) missing.push("Submission deadline");
    if (!formData.regionLocation.trim()) missing.push("Region/location");
    if (!formData.contactPersonName.trim()) missing.push("Contact name");
    if (!formData.contactNumber.trim()) missing.push("Contact number");
    if (!formData.contactEmail.trim()) missing.push("Contact email");

    if (missing.length > 0) {
      alert(`Please complete the required fields: ${missing.join(", ")}`);
      return false;
    }

    return true;
  }, [formData]);

  const buildTenderPayload = useCallback(
    (statusOverride?: TenderStatusValue) => {
      const trimmedRequirements = requirements
        .map((req) => req.trim())
        .filter((req) => req.length > 0);

      const contactEmail = formData.contactEmail.trim().toLowerCase();

      return {
        title: formData.title.trim(),
        category: formData.category.trim(),
        description: formData.description.trim(),
        submissionDeadline: formData.submissionDeadline,
        estimatedValue: formData.estimatedValue.trim(),
        preBidMeetingDate: formData.preBidMeetingDate.trim(),
        preBidMeetingTime: formData.preBidMeetingTime.trim(),
        regionLocation: formData.regionLocation.trim(),
        contactPersonName: formData.contactPersonName.trim(),
        contactNumber: formData.contactNumber.trim(),
        contactEmail,
        companyWebsite: formData.companyWebsite.trim(),
        requirements: trimmedRequirements,
        status: statusOverride ?? tenderStatus,
      };
    },
    [formData, requirements, tenderStatus]
  );

  const syncTender = useCallback(
    async (statusOverride?: TenderStatusValue) => {
      const payload = buildTenderPayload(statusOverride);

      setIsCreatingTender(true);
      try {
        if (tenderId) {
          const response = await fetch(`/api/tenders/${tenderId}`, {
            method: "PATCH",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

          if (!response.ok) {
            const errorBody = await response.json().catch(() => ({}));
            throw new Error(errorBody?.error ?? "Failed to update tender");
          }

          return tenderId;
        }

        const response = await fetch("/api/tenders", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({}));
          throw new Error(errorBody?.error ?? "Failed to create tender");
        }

        const data = await response.json();
        setTenderId(data.id);
        return data.id as string;
      } finally {
        setIsCreatingTender(false);
      }
    },
    [buildTenderPayload, tenderId]
  );

  // File upload function
  const readErrorMessage = useCallback(async (response: Response) => {
    try {
      const payload = await response.clone().json();
      if (payload?.error) {
        return payload.error as string;
      }
      if (payload?.message) {
        return payload.message as string;
      }
    } catch {
      // ignore JSON parse errors
    }

    try {
      const text = await response.text();
      if (text) {
        return text;
      }
    } catch {
      // ignore text parse errors
    }

    return response.statusText || "Request failed";
  }, []);

  const uploadFile = useCallback(
    async (
      file: File,
      tenderIdValue: string,
      options?: { isAdvertisement?: boolean; suppressState?: boolean }
    ): Promise<{ uploadId: string; storageKey: string } | undefined> => {
      const { isAdvertisement = false, suppressState = false } = options ?? {};
      const fileId = Math.random().toString(36).substr(2, 9);

      if (!suppressState) {
        const uploadedFile: UploadedFile = {
          id: fileId,
          name: file.name,
          size: file.size,
          type: file.type,
          status: "PENDING",
          isExisting: false,
          isDeleting: false,
        };

        setUploadedFiles((prev) => [...prev, uploadedFile]);
      }

      try {
        const signedUrlResponse = await fetch('/api/uploads/signed-url', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tenderId: tenderIdValue,
            filename: file.name,
            mime: file.type || 'application/octet-stream',
            size: file.size,
            isAdvertisement,
          }),
        });

        if (!signedUrlResponse.ok) {
          const message = await readErrorMessage(signedUrlResponse);
          throw new Error(message || 'Failed to get signed URL');
        }

        const { uploadUrl, uploadId, storageKey } = await signedUrlResponse.json();

        if (!suppressState) {
          setUploadedFiles((prev) =>
            prev.map((f) =>
              f.id === fileId
                ? { ...f, status: "UPLOADING", uploadId, storageKey }
                : f
            )
          );
        }

        const uploadResponse = await fetch(uploadUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': file.type || 'application/octet-stream',
          },
          body: file,
        });

        if (!uploadResponse.ok) {
          const message = await readErrorMessage(uploadResponse);
          throw new Error(message || 'Failed to upload file');
        }

        const completeResponse = await fetch('/api/uploads/complete', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uploadId }),
        });

        if (!completeResponse.ok) {
          const message = await readErrorMessage(completeResponse);
          throw new Error(message || 'Failed to complete upload');
        }

        if (!suppressState) {
          setUploadedFiles((prev) =>
            prev.map((f) =>
              f.id === fileId
                ? { ...f, status: "PROCESSING" }
                : f
            )
          );
        }

        return { uploadId, storageKey };
      } catch (error) {
        console.error('Upload error:', error);

        if (!suppressState) {
          setUploadedFiles((prev) =>
            prev.map((f) =>
              f.id === fileId
                ? {
                    ...f,
                    status: "FAILED",
                    error: error instanceof Error ? error.message : 'Upload failed',
                  }
                : f
            )
          );
          return undefined;
        }

        throw error instanceof Error ? error : new Error('Upload failed');
      }
    },
    [readErrorMessage]
  );

  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files) return;

    const fileArray = Array.from(files);
    const allowedExtensions = ['pdf', 'zip'];
    const validFiles = fileArray.filter(file => {
      const extension = file.name.split('.').pop()?.toLowerCase();
      return extension ? allowedExtensions.includes(extension) : false;
    });

    if (validFiles.length !== fileArray.length) {
      alert('Some files were skipped. Only PDF or ZIP files are supported.');
    }

    if (validFiles.length === 0) {
      return;
    }

    if (!validateForm()) {
      return;
    }

    try {
      const currentTenderId = await syncTender(mode === "edit" ? tenderStatus : "DRAFT");

      for (const file of validFiles) {
        await uploadFile(file, currentTenderId);
      }
    } catch (error) {
      console.error("Tender sync error:", error);
      alert(error instanceof Error ? error.message : "Failed to prepare tender for uploads.");
    }
  }, [mode, syncTender, tenderStatus, uploadFile, validateForm]);

  useEffect(() => {
    if (!tenderId) {
      return;
    }

    const shouldPoll = uploadedFiles.some((file) =>
      file.status === "PROCESSING" || file.status === "PENDING" || file.status === "UPLOADING"
    );

    if (!shouldPoll) {
      return;
    }
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const pollUploads = async () => {
      try {
        const response = await fetch(`/api/tenders/${tenderId}`, {
          credentials: "include",
        });

        if (!response.ok) {
          return;
        }

        const data = await response.json();
        if (cancelled) {
          return;
        }

        const serverUploads = Array.isArray(data?.uploads)
          ? data.uploads.filter((upload: any) => !upload.isAdvertisement)
          : [];

        setUploadedFiles((prev) => {
          let changed = false;

          const next = prev.map((file) => {
            if (file.isDeleting) {
              return file;
            }

            const match = serverUploads.find(
              (upload: any) => upload.id === file.uploadId || upload.id === file.id
            );

            if (!match) {
              return file;
            }

            const nextStatus = (match.status as UploadStatusValue) ?? file.status;
            const nextDownloadUrl = match.url ?? file.downloadUrl ?? null;
            const nextError =
              match.error ??
              (nextStatus === "FAILED"
                ? file.error ?? "Processing failed. Please retry."
                : null);
            const nextStorageKey = match.storageKey ?? file.storageKey;
            const nextSize = typeof match.size === "number" ? match.size : file.size;
            const nextType = match.mimeType ?? file.type;

            if (
              file.status === nextStatus &&
              file.downloadUrl === nextDownloadUrl &&
              file.error === nextError &&
              file.storageKey === nextStorageKey &&
              file.size === nextSize &&
              file.type === nextType
            ) {
              return file;
            }

            changed = true;

            return {
              ...file,
              uploadId: match.id,
              status: nextStatus,
              downloadUrl: nextDownloadUrl,
              error: nextError,
              storageKey: nextStorageKey,
              size: nextSize,
              type: nextType,
              isExisting: true,
              isDeleting: false,
            };
          });

          const newFiles: UploadedFile[] = [];
          for (const upload of serverUploads) {
            const exists = next.some(
              (file) => file.uploadId === upload.id || file.id === upload.id
            );

            if (!exists) {
              changed = true;
              newFiles.push({
                id: upload.id,
                uploadId: upload.id,
                storageKey: upload.storageKey ?? undefined,
                name:
                  upload.originalName ??
                  upload.filename ??
                  `Document-${String(upload.id).slice(0, 6)}`,
                size: typeof upload.size === "number" ? upload.size : 0,
                type: upload.mimeType ?? "application/octet-stream",
                status: (upload.status ?? "PENDING") as UploadStatusValue,
                isExisting: true,
                downloadUrl: upload.url ?? null,
                error:
                  upload.error ??
                  ((upload.status as UploadStatusValue) === "FAILED"
                    ? "Processing failed. Please retry."
                    : null),
                isDeleting: false,
              });
            }
          }

          if (!changed) {
            return prev;
          }

          return [...next, ...newFiles];
        });
      } catch (error) {
        console.error("Upload polling error:", error);
      } finally {
        if (!cancelled) {
          timeoutId = setTimeout(pollUploads, 4000);
        }
      }
    };

    pollUploads();

    return () => {
      cancelled = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [tenderId, uploadedFiles]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const hasActiveUploads = uploadedFiles.some(
      (file) =>
        file.status === "PENDING" ||
        file.status === "UPLOADING" ||
        file.isDeleting
    );

    if (hasActiveUploads) {
      alert("Please wait for all document uploads to finish before continuing.");
      return;
    }

    try {
      await syncTender(tenderStatus);
      router.push("/publisher/dashboard");
    } catch (error) {
      console.error("Error saving tender:", error);
      alert(error instanceof Error ? error.message : "Failed to save tender. Please try again.");
    }
  };

  const addRequirement = () => {
    if (newRequirement.trim()) {
      setRequirements([...requirements, newRequirement.trim()]);
      setNewRequirement("");
    }
  };

  const removeRequirement = (index: number) => {
    setRequirements(requirements.filter((_, i) => i !== index));
  };

  const removeFile = (fileId: string) => {
    setUploadedFiles((prev) =>
      prev.filter((file) => (file.isExisting ? true : file.id !== fileId))
    );
  };

  const deleteExistingFile = useCallback(
    async (file: UploadedFile) => {
      if (!tenderId || !file.uploadId) {
        setUploadedFiles((prev) => prev.filter((f) => f.id !== file.id));
        return;
      }

      const confirmed =
        typeof window === "undefined"
          ? true
          : window.confirm("Remove this document from the tender?");

      if (!confirmed) {
        return;
      }

      setUploadedFiles((prev) =>
        prev.map((f) => (f.id === file.id ? { ...f, isDeleting: true } : f))
      );

      try {
        const response = await fetch(`/api/tenders/${tenderId}/uploads/${file.uploadId}`, {
          method: "DELETE",
          credentials: "include",
        });

        if (!response.ok) {
          const message = await readErrorMessage(response);
          throw new Error(message || "Failed to delete document");
        }

        setUploadedFiles((prev) =>
          prev.filter((f) => f.id !== file.id && f.uploadId !== file.uploadId)
        );
      } catch (error) {
        console.error("Delete upload error:", error);
        const message = error instanceof Error ? error.message : "Failed to delete document.";
        alert(message);
        setUploadedFiles((prev) =>
          prev.map((f) => (f.id === file.id ? { ...f, isDeleting: false } : f))
        );
      }
    },
    [readErrorMessage, tenderId]
  );

  const clearAdvertisementState = useCallback(() => {
    setAdvertisementUploadError(null);
    setAdvertisementUploadStatus(null);
    setAdvertisementImageName(null);
    setAdvertisementUploadId(null);
    setAdvertisementImagePreview((prev) => {
      if (prev && prev.startsWith("blob:")) {
        URL.revokeObjectURL(prev);
      }
      return null;
    });
  }, []);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;

    if (e.target) {
      e.target.value = "";
    }

    if (!file) {
      return;
    }

    const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

    if (!allowedExtensions.includes(extension)) {
      alert('Please upload a JPG, PNG, GIF, or WEBP image for the advertisement.');
      return;
    }

    if (!validateForm()) {
      return;
    }

    let previewUrl: string | null = null;

    try {
      setAdvertisementUploadError(null);
      setAdvertisementUploadStatus('PENDING');
      setAdvertisementImageName(file.name);
      previewUrl = URL.createObjectURL(file);
      setAdvertisementImagePreview((prev) => {
        if (prev && prev.startsWith("blob:")) {
          URL.revokeObjectURL(prev);
        }
        return previewUrl;
      });

      const currentTenderId = await syncTender(mode === "edit" ? tenderStatus : "DRAFT");

      setAdvertisementUploadStatus('UPLOADING');
      const uploadResult = await uploadFile(file, currentTenderId, {
        isAdvertisement: true,
        suppressState: true,
      });
      if (uploadResult?.uploadId) {
        setAdvertisementUploadId(uploadResult.uploadId);
      }

      setAdvertisementUploadStatus('PROCESSING');
      setTimeout(() => {
        setAdvertisementUploadStatus((status) =>
          status === 'PROCESSING' ? null : status
        );
      }, 1500);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to upload advertisement image.';
      console.error('Advertisement upload error:', error);
      setAdvertisementUploadError(message);
      setAdvertisementUploadStatus('FAILED');
      setAdvertisementImageName(null);
      setAdvertisementUploadId(null);
      setAdvertisementImagePreview((prev) => {
        if (prev && prev.startsWith("blob:")) {
          URL.revokeObjectURL(prev);
        }
        return null;
      });
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      alert(message);
    }
  };

  const handleRemoveAdvertisement = useCallback(async () => {
    if (isRemovingAdvertisement) {
      return;
    }

    if (advertisementUploadStatus === "UPLOADING" || advertisementUploadStatus === "PENDING") {
      alert("Please wait for the advertisement upload to finish before removing it.");
      return;
    }

    if (!advertisementUploadId || !tenderId) {
      clearAdvertisementState();
      return;
    }

    const confirmed =
      typeof window === "undefined"
        ? true
        : window.confirm("Remove this advertisement image from the tender?");

    if (!confirmed) {
      return;
    }

    setIsRemovingAdvertisement(true);
    try {
      const response = await fetch(`/api/tenders/${tenderId}/uploads/${advertisementUploadId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        const message = await readErrorMessage(response);
        throw new Error(message || "Failed to delete advertisement image");
      }

      clearAdvertisementState();
    } catch (error) {
      console.error("Advertisement delete error:", error);
      const message =
        error instanceof Error ? error.message : "Failed to remove advertisement image.";
      alert(message);
    } finally {
      setIsRemovingAdvertisement(false);
    }
  }, [
    advertisementUploadId,
    advertisementUploadStatus,
    clearAdvertisementState,
    isRemovingAdvertisement,
    readErrorMessage,
    tenderId,
  ]);

  // Drag and drop handlers
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files);
    }
  }, [handleFileSelect]);

  const formatFileSize = (bytes: number) => {
    if (!Number.isFinite(bytes) || bytes <= 0) return 'Unknown size';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getUploadStatusMeta = (status: UploadStatusValue) => {
    switch (status) {
      case "PENDING":
        return {
          label: "Preparing",
          icon: <Loader2 className="h-4 w-4 animate-spin text-orange-500" />,
          textClass: "text-orange-600",
          barClass: "bg-orange-400",
          progress: 25,
        };
      case "UPLOADING":
        return {
          label: "Uploading",
          icon: <Loader2 className="h-4 w-4 animate-spin text-orange-500" />,
          textClass: "text-orange-600",
          barClass: "bg-orange-500",
          progress: 60,
        };
      case "PROCESSING":
        return {
          label: "Processing",
          icon: <Clock className="h-4 w-4 text-blue-500" />,
          textClass: "text-blue-600",
          barClass: "bg-blue-500",
          progress: 100,
        };
      case "COMPLETED":
        return {
          label: "Uploaded",
          icon: <CheckCircle2 className="h-4 w-4 text-green-500" />,
          textClass: "text-green-600",
          barClass: "bg-green-500",
          progress: 100,
        };
      case "FAILED":
      default:
        return {
          label: "Failed",
          icon: <AlertCircle className="h-4 w-4 text-red-500" />,
          textClass: "text-red-600",
          barClass: "bg-red-500",
          progress: 100,
        };
    }
  };

  const isEditMode = mode === "edit";
  const pageTitle = isEditMode ? "Edit Tender" : "Publish New Tender";
  const pageDescription = isEditMode
    ? "Update your tender details to keep bidders informed."
    : "Create and publish a new tender for qualified bidders to respond to.";
  const primaryButtonLabel = isCreatingTender
    ? "Saving..."
    : isEditMode
    ? tenderStatus === "PUBLISHED"
      ? "Update & Publish"
      : tenderStatus === "DRAFT"
      ? "Save Draft"
      : "Save Changes"
    : tenderStatus === "PUBLISHED"
    ? "Publish Tender"
    : tenderStatus === "DRAFT"
    ? "Save Draft"
    : "Save Tender";
  const isBusy = isCreatingTender || (isEditMode && isLoadingExisting);

  return (
    <>
      <SiteHeader variant="page" />
      
      <main className="flex-1 bg-[#F9FAFB] min-h-screen">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8"
          >
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {pageTitle}
            </h1>
            <p className="text-gray-600">
              {pageDescription}
            </p>
          </motion.div>

          {isEditMode && loadError ? (
            <Card className="bg-white border-red-200 shadow-sm">
              <CardContent className="p-8 text-center space-y-4">
                <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Unable to load tender</h2>
                  <p className="text-sm text-gray-600">{loadError}</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button variant="outline" onClick={() => router.back()}>
                    Go Back
                  </Button>
                  <Button
                    onClick={() => {
                      if (initialTenderId) {
                        setLoadError(null);
                        setIsLoadingExisting(true);
                        setReloadToken((token) => token + 1);
                      }
                    }}
                  >
                    Retry
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : isEditMode && isLoadingExisting ? (
            <Card className="bg-white border-gray-200 shadow-sm">
              <CardContent className="p-10 text-center space-y-4">
                <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Loading tender details</h2>
                  <p className="text-sm text-gray-600">Please wait while we fetch the latest information.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Tender Information */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
            >
              <Card className="bg-white border-gray-200 shadow-sm">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <FileText className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Tender Information</CardTitle>
                      <p className="text-sm text-gray-600 mt-1">
                        Fill in all the details about your tender opportunity
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="title" className="text-sm font-semibold text-gray-700">
                      Tender Title <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="title"
                      type="text"
                      placeholder="e.g., Construction of Solar Power Facility"
                      value={formData.title}
                      onChange={(e) =>
                        setFormData({ ...formData, title: e.target.value })
                      }
                      className="h-11"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category" className="text-sm font-semibold text-gray-700">
                      Category <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) =>
                        setFormData({ ...formData, category: value })
                      }
                    >
                      <SelectTrigger id="category" className="h-11">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="construction">Construction</SelectItem>
                        <SelectItem value="healthcare">Healthcare</SelectItem>
                        <SelectItem value="infrastructure">Infrastructure</SelectItem>
                        <SelectItem value="it">IT & Technology</SelectItem>
                        <SelectItem value="energy">Energy</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="status" className="text-sm font-semibold text-gray-700">
                      Tender Status <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={tenderStatus}
                      onValueChange={(value) => setTenderStatus(value as TenderStatusValue)}
                    >
                      <SelectTrigger id="status" className="h-11">
                        <SelectValue placeholder="Select tender status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PUBLISHED">Publish immediately</SelectItem>
                        <SelectItem value="DRAFT">Save as draft</SelectItem>
                        <SelectItem value="CLOSED">Mark as closed</SelectItem>
                        <SelectItem value="AWARDED">Mark as awarded</SelectItem>
                        <SelectItem value="CANCELLED">Cancel tender</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-sm font-semibold text-gray-700">
                      Tender Description
                    </Label>
                    <Textarea
                      id="description"
                      placeholder="Provide a detailed description of the tender requirements, scope of work, and any specific instructions..."
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({ ...formData, description: e.target.value })
                      }
                      rows={6}
                      className="resize-none"
                    />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Tender Advertisement Image */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <Card className="bg-white border-gray-200 shadow-sm">
                <CardContent className="p-6">
                  <Label className="text-sm font-semibold text-gray-700 mb-4 block">
                    Tender Advertisement Image <span className="text-red-500">*</span>
                  </Label>
                  <label
                    htmlFor="advertisement-upload"
                    className={`block relative cursor-pointer`}
                  >
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      id="advertisement-upload"
                    />
                    <div
                      className={`relative border-2 border-dashed rounded-lg overflow-hidden transition-colors ${
                        advertisementUploadStatus === "FAILED"
                          ? "border-red-300"
                          : advertisementImagePreview
                            ? "border-transparent"
                            : "border-gray-300 hover:border-primary/50"
                      }`}
                    >
                      {advertisementImagePreview ? (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={advertisementImagePreview}
                            alt={advertisementImageName ?? "Tender advertisement preview"}
                            className="w-full h-64 object-cover"
                          />
                          <button
                            type="button"
                            className="absolute top-3 right-3 rounded-full bg-white/90 text-gray-600 hover:text-red-600 shadow-sm p-2 transition-colors disabled:opacity-60"
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              handleRemoveAdvertisement();
                            }}
                            disabled={
                              advertisementUploadStatus === "UPLOADING" ||
                              advertisementUploadStatus === "PENDING" ||
                              isRemovingAdvertisement
                            }
                            aria-label="Remove advertisement image"
                          >
                            {isRemovingAdvertisement ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </button>
                        </>
                      ) : (
                        <div className="p-8 text-center bg-gray-50 flex flex-col items-center justify-center gap-3">
                          <ImageIcon className="h-12 w-12 text-gray-400" />
                          <p className="text-gray-600 font-medium">
                            Click to upload tender advertisement image
                          </p>
                          <p className="text-sm text-gray-500">
                            JPG, PNG, GIF files accepted
                          </p>
                        </div>
                      )}

                      {(advertisementUploadStatus === "PENDING" ||
                        advertisementUploadStatus === "UPLOADING" ||
                        advertisementUploadStatus === "PROCESSING" ||
                        isRemovingAdvertisement) && (
                        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center gap-2 pointer-events-none">
                          <Loader2 className="h-8 w-8 text-primary animate-spin" />
                          <p className="text-sm font-medium text-gray-700">
                            {isRemovingAdvertisement
                              ? "Removing image..."
                              : advertisementUploadStatus === "PROCESSING"
                              ? "Processing image..."
                              : "Uploading image..."}
                          </p>
                        </div>
                      )}
                    </div>
                  </label>
                  {advertisementUploadStatus === "FAILED" && (
                    <div className="mt-4 p-3 rounded-lg border bg-red-50 border-red-200">
                      <p className="text-sm text-red-700">
                        {advertisementUploadError ?? "Failed to upload advertisement image. Please try again."}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Key Dates and Values */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              <Card className="bg-white border-gray-200 shadow-sm">
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="submissionDeadline" className="text-sm font-semibold text-gray-700">
                        Submission Deadline <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          id="submissionDeadline"
                          type="date"
                          value={formData.submissionDeadline}
                          onChange={(e) =>
                            setFormData({ ...formData, submissionDeadline: e.target.value })
                          }
                          className="pl-10 h-11"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="estimatedValue" className="text-sm font-semibold text-gray-700">
                        Estimated Value
                      </Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          id="estimatedValue"
                          type="text"
                          placeholder="e.g., $2.5M - $5M"
                          value={formData.estimatedValue}
                          onChange={(e) =>
                            setFormData({ ...formData, estimatedValue: e.target.value })
                          }
                          className="pl-10 h-11"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="preBidMeetingDate" className="text-sm font-semibold text-gray-700">
                        Pre-Bid Meeting Date
                      </Label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          id="preBidMeetingDate"
                          type="date"
                          value={formData.preBidMeetingDate}
                          onChange={(e) =>
                            setFormData({ ...formData, preBidMeetingDate: e.target.value })
                          }
                          className="pl-10 h-11"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="preBidMeetingTime" className="text-sm font-semibold text-gray-700">
                        Pre-Bid Meeting Time
                      </Label>
                      <div className="relative">
                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          id="preBidMeetingTime"
                          type="time"
                          value={formData.preBidMeetingTime}
                          onChange={(e) =>
                            setFormData({ ...formData, preBidMeetingTime: e.target.value })
                          }
                          className="pl-10 h-11"
                        />
                      </div>
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="regionLocation" className="text-sm font-semibold text-gray-700">
                        Region/Location <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          id="regionLocation"
                          type="text"
                          placeholder="e.g., California, USA"
                          value={formData.regionLocation}
                          onChange={(e) =>
                            setFormData({ ...formData, regionLocation: e.target.value })
                          }
                          className="pl-10 h-11"
                          required
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Contact Person Details */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
            >
              <Card className="bg-white border-gray-200 shadow-sm">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                      <User className="h-4 w-4 text-green-600" />
                    </div>
                    <CardTitle className="text-lg">Contact Person Details</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="contactPersonName" className="text-sm font-semibold text-gray-700">
                        Contact Person Name <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          id="contactPersonName"
                          type="text"
                          placeholder="e.g., John Smith"
                          value={formData.contactPersonName}
                          onChange={(e) =>
                            setFormData({ ...formData, contactPersonName: e.target.value })
                          }
                          className="pl-10 h-11"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="contactNumber" className="text-sm font-semibold text-gray-700">
                        Contact Number <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          id="contactNumber"
                          type="tel"
                          placeholder="e.g., +1 (555) 123-4567"
                          value={formData.contactNumber}
                          onChange={(e) =>
                            setFormData({ ...formData, contactNumber: e.target.value })
                          }
                          className="pl-10 h-11"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="contactEmail" className="text-sm font-semibold text-gray-700">
                        Contact Email <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          id="contactEmail"
                          type="email"
                          placeholder="e.g., john@company.com"
                          value={formData.contactEmail}
                          onChange={(e) =>
                            setFormData({ ...formData, contactEmail: e.target.value })
                          }
                          className="pl-10 h-11"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="companyWebsite" className="text-sm font-semibold text-gray-700">
                        Company Website
                      </Label>
                      <div className="relative">
                        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          id="companyWebsite"
                          type="url"
                          placeholder="e.g., https://company.com"
                          value={formData.companyWebsite}
                          onChange={(e) =>
                            setFormData({ ...formData, companyWebsite: e.target.value })
                          }
                          className="pl-10 h-11"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Key Requirements */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
            >
              <Card className="bg-white border-gray-200 shadow-sm">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Key className="h-4 w-4 text-purple-600" />
                    </div>
                    <CardTitle className="text-lg">Key Requirements</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      placeholder="Enter a requirement"
                      value={newRequirement}
                      onChange={(e) => setNewRequirement(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addRequirement())}
                      className="flex-1 h-11"
                    />
                    <Button
                      type="button"
                      onClick={addRequirement}
                      className="h-11 px-4"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Requirement
                    </Button>
                  </div>
                  
                  {requirements.length > 0 && (
                    <div className="space-y-2">
                      {requirements.map((requirement, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                          <span className="text-sm text-gray-700">{requirement}</span>
                          <button
                            type="button"
                            onClick={() => removeRequirement(index)}
                            className="text-gray-400 hover:text-red-600"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Tender Documents */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.5 }}
            >
              <Card className="bg-white border-gray-200 shadow-sm">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                      <Upload className="h-4 w-4 text-orange-600" />
                    </div>
                    <CardTitle className="text-lg">Tender Documents</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div
                    className={`relative rounded-lg transition-colors ${
                      dragActive
                        ? 'border-2 border-orange-500 bg-orange-50'
                        : uploadedFiles.length > 0
                          ? 'border border-gray-200 bg-gray-50/50'
                          : 'border-2 border-dashed border-gray-300 hover:border-orange-500 cursor-pointer'
                    }`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept=".pdf,.zip"
                      onChange={(e) => handleFileSelect(e.target.files)}
                      className="hidden"
                    />

                    {uploadedFiles.length === 0 ? (
                      <div className="p-8 text-center">
                        <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600 mb-2 font-medium">
                          Click to upload tender documents or drag and drop
                        </p>
                        <p className="text-sm text-gray-500">
                          Only PDF or ZIP files accepted
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          className="mt-4"
                          disabled={isBusy}
                          onClick={(e) => {
                            e.stopPropagation();
                            fileInputRef.current?.click();
                          }}
                        >
                          {isCreatingTender ? 'Saving tender...' : 'Select PDF/ZIP'}
                        </Button>
                      </div>
                    ) : (
                      <div className="p-4 sm:p-6 space-y-4">
                        <div className="space-y-3">
                          {uploadedFiles.map((file) => {
                            const { icon, label, textClass, barClass, progress } = getUploadStatusMeta(file.status);
                            return (
                              <div key={file.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                                <div className="flex items-start gap-3">
                                  <File className="mt-1 h-5 w-5 text-gray-500" />
                                  <div className="flex-1 space-y-1">
                                    <div className="flex items-center justify-between gap-3">
                                      <div>
                                        <p className="text-sm font-semibold text-gray-800">{file.name}</p>
                                        <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                                        {file.uploadId && (
                                          <p className="font-mono text-[10px] text-gray-400 mt-1">
                                            #{file.uploadId.slice(0, 8)}
                                          </p>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2">
                                        {file.isExisting ? (
                                          file.downloadUrl ? (
                                            <a
                                              href={file.downloadUrl}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                                              onClick={(e) => e.stopPropagation()}
                                            >
                                              View file
                                            </a>
                                          ) : (
                                            <span className="text-xs font-medium text-gray-400">
                                              Existing file
                                            </span>
                                          )
                                        ) : null}
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (file.isExisting) {
                                              deleteExistingFile(file);
                                            } else {
                                              removeFile(file.id);
                                            }
                                          }}
                                          className="text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50"
                                          aria-label={`Remove ${file.name}`}
                                          disabled={file.isDeleting}
                                        >
                                          {file.isDeleting ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                          ) : (
                                            <X className="h-4 w-4" />
                                          )}
                                        </button>
                                      </div>
                                    </div>
                                    {file.error && (
                                      <p className="text-[11px] text-red-500">{file.error}</p>
                                    )}
                                    <div className="mt-3 space-y-2">
                                      <div className="flex items-center gap-2">
                                        {icon}
                                        <span className={`text-xs font-medium ${textClass}`}>{label}</span>
                                      </div>
                                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
                                        <div
                                          className={`h-full transition-all duration-500 ${barClass}`}
                                          style={{ width: `${progress}%` }}
                                        />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 pt-3">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={isBusy}
                            onClick={(e) => {
                              e.stopPropagation();
                              fileInputRef.current?.click();
                            }}
                          >
                            {isCreatingTender ? 'Saving tender...' : 'Upload more documents'}
                          </Button>
                          <p className="text-xs text-gray-500">
                            Drag & drop additional PDF or ZIP files to add them.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Submit Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.5 }}
              className="flex justify-center"
            >
              <Button
                type="submit"
                size="lg"
                disabled={isBusy}
                className="bg-green-600 hover:bg-green-700 text-white px-12 py-3 text-lg font-semibold disabled:opacity-70"
              >
                {primaryButtonLabel}
              </Button>
            </motion.div>
          </form>
          )}
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
