"use client";

import { useState, useRef, useCallback } from "react";
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
  AlertCircle
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
type UploadStatusValue = 'PENDING' | 'UPLOADING' | 'PROCESSING' | 'FAILED';

interface UploadedFile {
  id: string;
  uploadId?: string;
  storageKey?: string;
  name: string;
  size: number;
  type: string;
  status: UploadStatusValue;
  error?: string;
}

type TenderStatusValue = 'DRAFT' | 'PUBLISHED' | 'CLOSED' | 'AWARDED' | 'CANCELLED';

export default function CreateTenderPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [tenderId, setTenderId] = useState<string | null>(null);
  const [isCreatingTender, setIsCreatingTender] = useState(false);
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
  const [requirements, setRequirements] = useState<string[]>([]);
  const [newRequirement, setNewRequirement] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [advertisementImage, setAdvertisementImage] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);

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
    (status: TenderStatusValue) => {
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
        status,
      };
    },
    [formData, requirements]
  );

  const syncTender = useCallback(
    async (statusOverride: TenderStatusValue = "DRAFT") => {
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

  const uploadFile = useCallback(async (file: File, tenderIdValue: string) => {
    const fileId = Math.random().toString(36).substr(2, 9);

    // Add file to state
    const uploadedFile: UploadedFile = {
      id: fileId,
      name: file.name,
      size: file.size,
      type: file.type,
      status: "PENDING",
    };
    
    setUploadedFiles(prev => [...prev, uploadedFile]);

    try {
      // Get signed URL
      const signedUrlResponse = await fetch('/api/uploads/signed-url', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenderId: tenderIdValue,
          filename: file.name,
          mime: file.type || 'application/octet-stream',
          size: file.size,
        }),
      });

      if (!signedUrlResponse.ok) {
        const message = await readErrorMessage(signedUrlResponse);
        throw new Error(message || 'Failed to get signed URL');
      }

      const { uploadUrl, uploadId, storageKey } = await signedUrlResponse.json();

      setUploadedFiles(prev => 
        prev.map(f => 
          f.id === fileId 
            ? { ...f, status: "UPLOADING", uploadId, storageKey } 
            : f
        )
      );

      // Upload file to storage
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

      // Complete upload
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

      // Update status to completed
      setUploadedFiles(prev => 
        prev.map(f => 
          f.id === fileId 
            ? { ...f, status: "PROCESSING" } 
            : f
        )
      );

    } catch (error) {
      console.error('Upload error:', error);
      setUploadedFiles(prev => 
        prev.map(f => f.id === fileId ? { 
          ...f, 
          status: "FAILED", 
          error: error instanceof Error ? error.message : 'Upload failed' 
        } : f)
      );
    }
  }, [readErrorMessage]);

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
      const currentTenderId = await syncTender("DRAFT");

      for (const file of validFiles) {
        await uploadFile(file, currentTenderId);
      }
    } catch (error) {
      console.error("Tender sync error:", error);
      alert(error instanceof Error ? error.message : "Failed to prepare tender for uploads.");
    }
  }, [syncTender, uploadFile, validateForm]);

  const handleSubmit = async (e: React.FormEvent, isDraft: boolean) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const hasActiveUploads = uploadedFiles.some(
      (file) => file.status === "PENDING" || file.status === "UPLOADING"
    );

    if (hasActiveUploads) {
      alert("Please wait for all document uploads to finish before continuing.");
      return;
    }

    try {
      await syncTender(isDraft ? "DRAFT" : "PUBLISHED");
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
    setUploadedFiles(prev => {
      const target = prev.find(f => f.id === fileId);
      if (target && (target.status === "PENDING" || target.status === "UPLOADING")) {
        return prev;
      }
      return prev.filter(f => f.id !== fileId);
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAdvertisementImage(file);
    }
  };

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
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

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
              Publish New Tender
            </h1>
            <p className="text-gray-600">
              Create and publish a new tender for qualified bidders to respond to.
            </p>
          </motion.div>

          <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-8">
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
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      id="advertisement-upload"
                    />
                    <label htmlFor="advertisement-upload" className="cursor-pointer">
                      <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 mb-2 font-medium">
                        Click to upload tender advertisement image
                      </p>
                      <p className="text-sm text-gray-500">
                        JPG, PNG, GIF files accepted
                      </p>
                    </label>
                  </div>
                  {advertisementImage && (
                    <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
                      <p className="text-sm text-green-700">
                        ✓ {advertisementImage.name} uploaded successfully
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
                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
                      dragActive 
                        ? 'border-orange-500 bg-orange-50' 
                        : 'border-gray-300 hover:border-orange-500'
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
                      disabled={isCreatingTender}
                    >
                      {isCreatingTender ? 'Saving tender...' : 'Select PDF/ZIP'}
                    </Button>
                  </div>

                  {uploadedFiles.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {uploadedFiles.map((file) => (
                        <div key={file.id} className="p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 flex-1">
                              <File className="h-4 w-4 text-gray-500" />
                              <div className="flex-1">
                                <p className="text-sm text-gray-700 font-medium">{file.name}</p>
                                <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                                {file.uploadId && (
                                  <p className="mt-1 font-mono text-[10px] text-gray-400">
                                    #{file.uploadId.slice(0, 8)}
                                  </p>
                                )}
                                {file.error && (
                                  <p className="mt-1 text-[11px] text-red-500">{file.error}</p>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                {file.status === "PENDING" && (
                                  <>
                                    <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
                                    <span className="text-xs font-medium text-orange-600">Preparing</span>
                                  </>
                                )}
                                {file.status === "UPLOADING" && (
                                  <>
                                    <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
                                    <span className="text-xs font-medium text-orange-600">Uploading</span>
                                  </>
                                )}
                                {file.status === "PROCESSING" && (
                                  <>
                                    <Clock className="h-4 w-4 text-blue-500" />
                                    <span className="text-xs font-medium text-blue-600">Processing</span>
                                  </>
                                )}
                                {file.status === "FAILED" && (
                                  <>
                                    <AlertCircle className="h-4 w-4 text-red-500" />
                                    <span className="text-xs font-medium text-red-500">Failed</span>
                                  </>
                                )}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeFile(file.id)}
                              className="ml-2 text-gray-400 hover:text-red-600"
                              disabled={file.status === "UPLOADING" || file.status === "PENDING"}
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>

                        </div>
                      ))}
                    </div>
                  )}
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
                disabled={isCreatingTender}
                className="bg-green-600 hover:bg-green-700 text-white px-12 py-3 text-lg font-semibold disabled:opacity-70"
              >
                {isCreatingTender ? 'Saving...' : 'Publish Tender'}
              </Button>
            </motion.div>
          </form>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
