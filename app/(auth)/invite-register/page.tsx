"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Mail, Lock, User, CheckCircle, AlertCircle, Building2 } from "lucide-react";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface InviteData {
  email: string;
  name?: string | null;
  position?: string | null;
  organizationName: string;
  inviterName: string;
  token: string;
  expiresAt?: string;
}

export default function InviteRegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [inviteData, setInviteData] = useState<InviteData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  useEffect(() => {
    // Legacy route: forward to the new join page so previous links keep working.
    const query = searchParams.toString();
    router.replace(`/team/join${query ? `?${query}` : ""}`);
  }, [router, searchParams]);

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      setError("Invalid invite link. Please use the link provided in your email.");
      setIsLoading(false);
      return;
    }

    async function loadInvitation() {
      try {
        const response = await fetch(`/api/invitations/${token}`);
        const data = await response.json();

        if (!response.ok) {
          setError(data.error ?? "This invitation link is no longer valid.");
          return;
        }

        const invitation = data.invitation as {
          email: string;
          name?: string | null;
          position?: string | null;
          organizationName: string;
          inviterName: string;
          expiresAt?: string;
        };

        const emailParam = searchParams.get("email");
        if (emailParam && emailParam.toLowerCase() !== invitation.email.toLowerCase()) {
          console.warn("Invite email does not match the query parameter email.");
        }

        const normalized: InviteData = {
          email: invitation.email,
          name: invitation.name ?? "",
          position: invitation.position ?? "",
          organizationName: invitation.organizationName,
          inviterName: invitation.inviterName,
          expiresAt: invitation.expiresAt,
          token: token || "",
        };

        setInviteData(normalized);
        setError(null);
        setFormData((prev) => ({
          ...prev,
          email: invitation.email,
          name: invitation.name ?? "",
        }));
      } catch (loadError) {
        console.error("Failed to load invitation:", loadError);
        setError("Unable to load invitation details. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    }

    loadInvitation();
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      setIsSubmitting(false);
      return;
    }

    // Validate password strength
    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters long");
      setIsSubmitting(false);
      return;
    }

    if (!inviteData) {
      setError("Invitation details not found. Please reload the page.");
      setIsSubmitting(false);
      return;
    }

    const nameToSubmit = (formData.name || inviteData.name || "").trim();
    if (!nameToSubmit) {
      setError("Please provide your name.");
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch(`/api/invitations/${inviteData.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: nameToSubmit,
          password: formData.password,
          confirmPassword: formData.confirmPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Registration failed. Please try again.");
        return;
      }

      const nextParams = new URLSearchParams({
        registered: "invite",
        email: inviteData.email,
        lockEmail: "true",
      });
      router.push(`/login?${nextParams.toString()}`);
    } catch (err) {
      console.error("Invitation registration failed:", err);
      setError("Registration failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <>
        <SiteHeader variant="page" />
        <main className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600">Loading invite details...</p>
          </div>
        </main>
        <SiteFooter />
      </>
    );
  }

  if (error && !inviteData) {
    return (
      <>
        <SiteHeader variant="page" />
        <main className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 flex items-center justify-center">
          <Card className="w-full max-w-md bg-white border border-gray-100 shadow-md rounded-2xl">
            <CardContent className="p-8 text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid Invite</h1>
              <p className="text-gray-600 mb-6">{error}</p>
              <Button onClick={() => router.push("/")} className="w-full">
                Go to Homepage
              </Button>
            </CardContent>
          </Card>
        </main>
        <SiteFooter />
      </>
    );
  }

  return (
    <>
      <SiteHeader variant="page" />

      <main className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-950 dark:via-gray-950 dark:to-blue-950">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
            {/* LEFT — Invite details */}
            <motion.section
              initial={{ opacity: 0, x: -24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="hidden lg:flex lg:col-span-6"
            >
              <div className="relative w-full overflow-hidden rounded-3xl border border-blue-100/60 dark:border-white/5 bg-gradient-to-br from-blue-100 via-blue-50 to-white dark:from-blue-950/40 dark:via-blue-950/20 dark:to-gray-950 p-10">
                {/* soft backdrop blobs */}
                <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-blue-300/20 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-indigo-300/20 blur-3xl" />

                <div className="relative">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                      <Mail className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                        You're Invited!
                      </h2>
                      <p className="text-blue-600 dark:text-blue-400 font-medium">
                        Join {inviteData?.organizationName}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-4 bg-white/70 dark:bg-white/5 rounded-xl border border-white/60">
                      <User className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Invited by</p>
                        <p className="font-semibold text-gray-900 dark:text-white">{inviteData?.inviterName}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-4 bg-white/70 dark:bg-white/5 rounded-xl border border-white/60">
                      <Building2 className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Company</p>
                        <p className="font-semibold text-gray-900 dark:text-white">{inviteData?.organizationName}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-4 bg-white/70 dark:bg-white/5 rounded-xl border border-white/60">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Position</p>
                        <p className="font-semibold text-gray-900 dark:text-white">{inviteData?.position}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 p-4 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-xl">
                    <p className="text-sm text-green-800 dark:text-green-200">
                      <strong>Welcome to BidWizer!</strong> Complete your registration to start collaborating on tenders with your team.
                    </p>
                  </div>
                </div>
              </div>
            </motion.section>

            {/* RIGHT — Registration form */}
            <motion.section
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="flex lg:col-span-6 items-center justify-center"
            >
              <Card className="w-full max-w-md bg-white dark:bg-gray-950 border border-gray-100 dark:border-white/10 shadow-md rounded-2xl">
                <CardContent className="p-8 space-y-6">
                  <div className="text-center">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Complete Registration</h1>
                    <p className="text-gray-600 dark:text-gray-300 mt-1">
                    Set up your account to join {inviteData?.organizationName}
                    </p>
                  </div>

                  {/* Error Message */}
                  {error && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
                      <AlertCircle className="h-5 w-5 text-red-600" />
                      <div>
                        <p className="text-sm font-medium text-red-800">{error}</p>
                      </div>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                      <Label htmlFor="name" className="text-sm font-medium text-gray-700 dark:text-gray-200">
                        Full Name <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative mt-1">
                        <User className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
                        <Input
                          id="name"
                          type="text"
                          placeholder="Enter your full name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="pl-11 h-12 rounded-lg border-gray-200 dark:border-white/10"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-200">
                        Email <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative mt-1">
                        <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
                        <Input
                          id="email"
                          type="email"
                          placeholder="you@example.com"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="pl-11 h-12 rounded-lg border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-gray-900"
                          disabled
                          required
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">This email was used for your invitation</p>
                    </div>

                    <div>
                      <Label htmlFor="password" className="text-sm font-medium text-gray-700 dark:text-gray-200">
                        Password <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative mt-1">
                        <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
                        <Input
                          id="password"
                          type="password"
                          placeholder="Create a secure password"
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          className="pl-11 h-12 rounded-lg border-gray-200 dark:border-white/10"
                          required
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Must be at least 8 characters long</p>
                    </div>

                    <div>
                      <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700 dark:text-gray-200">
                        Confirm Password <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative mt-1">
                        <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
                        <Input
                          id="confirmPassword"
                          type="password"
                          placeholder="Confirm your password"
                          value={formData.confirmPassword}
                          onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                          className="pl-11 h-12 rounded-lg border-gray-200 dark:border-white/10"
                          required
                        />
                      </div>
                    </div>

                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button 
                        type="submit" 
                        className="w-full h-12 text-base font-semibold rounded-lg"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? "Creating Account..." : "Create Account"}
                      </Button>
                    </motion.div>

                    <div className="text-center text-sm text-gray-500 dark:text-gray-400">
                      By creating an account, you agree to our{" "}
                      <a href="/terms" className="text-primary hover:underline">Terms of Service</a>
                      {" "}and{" "}
                      <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </motion.section>
          </div>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
