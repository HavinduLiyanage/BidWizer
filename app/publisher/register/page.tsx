"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, User, Mail, Lock, ArrowRight, AlertCircle, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

export default function PublisherRegistrationPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    organizationName: "",
    contactPerson: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    if (formData.password !== formData.confirmPassword) {
      setErrorMessage("Passwords do not match. Please re-enter them.");
      setIsSubmitting(false);
      return;
    }

    if (formData.password.length < 8) {
      setErrorMessage("Password must be at least 8 characters long.");
      setIsSubmitting(false);
      return;
    }

    const payload = {
      flow: "publisher" as const,
      organizationName: formData.organizationName.trim(),
      contactPerson: formData.contactPerson.trim(),
      email: formData.email.trim(),
      password: formData.password,
      confirmPassword: formData.confirmPassword,
    };

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.error ?? "Failed to create your account. Please try again.");
        setIsSubmitting(false);
        return;
      }

      router.push(`/verify-email?email=${encodeURIComponent(payload.email)}`);
    } catch (error) {
      console.error("Publisher registration failed:", error);
      setErrorMessage("Unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const benefits = [
    "Publish unlimited tenders",
    "Advanced analytics dashboard",
    "AI-powered insights",
    "Priority customer support",
    "Custom branding options",
  ];

  return (
    <>
      <SiteHeader variant="page" />

      <main className="flex-1 bg-[#F9FAFB] min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Wider balance: 7/5 split on large screens */}
          <div className="grid grid-cols-1 lg:grid-cols-12 lg:gap-12 gap-10 items-start">
            {/* Left: Registration Form */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="lg:col-span-7"
            >
              {/* widen form to avoid cramped inputs */}
              <div className="w-full max-w-lg">
                <div className="mb-8">
                  <motion.h1
                    className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900 mb-2"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1, duration: 0.5 }}
                  >
                    Publisher Registration
                  </motion.h1>
                  <motion.p
                    className="text-gray-600"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                  >
                    Join thousands of organizations publishing tenders on BidWizer
                  </motion.p>
                </div>

                <Card className="bg-white border-gray-200 shadow-sm">
                  <CardContent className="p-6 md:p-8">
                    {errorMessage && (
                      <div className="mb-6 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
                        <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                        <p className="text-sm text-red-700">{errorMessage}</p>
                      </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                      {/* Field */}
                      <div className="space-y-2">
                        <Label htmlFor="organizationName" className="text-sm font-medium text-gray-700">
                          Organization Name <span className="text-red-500">*</span>
                        </Label>
                        <div className="relative">
                          <Building2 className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                          <Input
                            id="organizationName"
                            type="text"
                            placeholder="Enter your organization name"
                            value={formData.organizationName}
                            onChange={(e) =>
                              setFormData({ ...formData, organizationName: e.target.value })
                            }
                            className="pl-11 h-12 text-[15px]"
                            required
                          />
                        </div>
                      </div>

                      {/* Field */}
                      <div className="space-y-2">
                        <Label htmlFor="contactPerson" className="text-sm font-medium text-gray-700">
                          Contact Person Name <span className="text-red-500">*</span>
                        </Label>
                        <div className="relative">
                          <User className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                          <Input
                            id="contactPerson"
                            type="text"
                            placeholder="Enter contact person name"
                            value={formData.contactPerson}
                            onChange={(e) =>
                              setFormData({ ...formData, contactPerson: e.target.value })
                            }
                            className="pl-11 h-12 text-[15px]"
                            required
                          />
                        </div>
                      </div>

                      {/* Field */}
                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                          Email Address <span className="text-red-500">*</span>
                        </Label>
                        <div className="relative">
                          <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                          <Input
                            id="email"
                            type="email"
                            placeholder="Enter your email address"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="pl-11 h-12 text-[15px]"
                            required
                          />
                        </div>
                      </div>

                      {/* Field */}
                      <div className="space-y-2">
                        <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                          Password <span className="text-red-500">*</span>
                        </Label>
                        <div className="relative">
                          <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                          <Input
                            id="password"
                            type="password"
                            placeholder="Create a secure password"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            className="pl-11 h-12 text-[15px]"
                            required
                          />
                        </div>
                      </div>

                      {/* Field */}
                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                          Confirm Password <span className="text-red-500">*</span>
                        </Label>
                        <div className="relative">
                          <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                          <Input
                            id="confirmPassword"
                            type="password"
                            placeholder="Confirm your password"
                            value={formData.confirmPassword}
                            onChange={(e) =>
                              setFormData({ ...formData, confirmPassword: e.target.value })
                            }
                            className="pl-11 h-12 text-[15px]"
                            required
                          />
                        </div>
                      </div>

                      <Button
                        type="submit"
                        className="w-full h-12 text-[15px] font-semibold"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? (
                          "Creating Account..."
                        ) : (
                          <>
                            Create Publisher Account
                            <ArrowRight className="h-4 w-4 ml-2" />
                          </>
                        )}
                      </Button>

                      <div className="text-center text-sm text-gray-600">
                        Already have an account?{" "}
                        <Link href="/login" className="text-primary hover:underline font-medium">
                          Sign In
                        </Link>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              </div>
            </motion.div>

            {/* Right: Benefits */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="hidden lg:block lg:col-span-5"
            >
              <div className="max-w-xl">
                <div className="mb-8">
                  <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
                    Why Choose BidWizer for Publishers?
                  </h2>
                  <p className="text-gray-600 text-lg">
                    Join the leading platform for tender management and reach qualified bidders worldwide.
                  </p>
                </div>

                <div className="space-y-4">
                  {benefits.map((benefit, index) => (
                    <motion.div
                      key={index}
                      className="flex items-center gap-3"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + index * 0.1, duration: 0.5 }}
                    >
                      <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center shrink-0">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      </div>
                      <span className="text-gray-700 font-medium">{benefit}</span>
                    </motion.div>
                  ))}
                </div>

                <motion.div
                  className="mt-8 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8, duration: 0.5 }}
                >
                  <h3 className="font-semibold text-gray-900 mb-2">Trusted by 500+ Organizations</h3>
                  <p className="text-sm text-gray-600">
                    From government agencies to private companies, organizations worldwide trust BidWizer for their tender management needs.
                  </p>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
