"use client";

import { useState } from "react";
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
  Image as ImageIcon
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

export default function CreateTenderPage() {
  const router = useRouter();
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
  const [files, setFiles] = useState<string[]>([]);
  const [advertisementImage, setAdvertisementImage] = useState<File | null>(null);

  const handleSubmit = (e: React.FormEvent, isDraft: boolean) => {
    e.preventDefault();
    console.log("Creating tender:", { 
      ...formData, 
      requirements, 
      isDraft, 
      files, 
      advertisementImage 
    });
    router.push("/publisher/dashboard");
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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAdvertisementImage(file);
    }
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
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
                    <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-2 font-medium">
                      Click to upload documents or drag and drop
                    </p>
                    <p className="text-sm text-gray-500">
                      PDF, DOC, DOCX, XLS, XLSX files accepted
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      className="mt-4"
                      onClick={() => setFiles([...files, `Document_${files.length + 1}.pdf`])}
                    >
                      Select Files
                    </Button>
                  </div>

                  {files.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {files.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                          <span className="text-sm text-gray-700">{file}</span>
                          <button
                            type="button"
                            onClick={() =>
                              setFiles(files.filter((_, i) => i !== index))
                            }
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
                className="bg-green-600 hover:bg-green-700 text-white px-12 py-3 text-lg font-semibold"
              >
                Publish Tender
              </Button>
            </motion.div>
          </form>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}

