"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Mail, RefreshCw, ArrowLeft } from "lucide-react";
import SiteHeader from "@/components/site-header";
import { Footer } from "@/components/Footer";
import { Stepper } from "@/components/Stepper";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function WaitingConfirmationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState<string>("");
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    const emailParam = searchParams.get("email");
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [searchParams]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const resolveEmail = () => {
      if (email) {
        return email;
      }

      try {
        const stored =
          localStorage.getItem("bidder_step1_temp") ?? localStorage.getItem("bidder_step1");
        if (!stored) {
          return "";
        }

        const parsed = JSON.parse(stored);
        return typeof parsed.email === "string" ? parsed.email : "";
      } catch (error) {
        console.error("Failed to resolve bidder email for redirect:", error);
        return "";
      }
    };

    const advanceToStep2 = () => {
      const status = localStorage.getItem("bidder_step1_status");
      const token = localStorage.getItem("bidder_step1_resume_token");

      if (status === "confirmed" && token) {
        const targetEmail = resolveEmail();
        const emailQuery = targetEmail ? `&email=${encodeURIComponent(targetEmail)}` : "";

        router.push(
          `/register/bidder/step2?token=${encodeURIComponent(token)}${emailQuery}`
        );
      }
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === "bidder_step1_status" && event.newValue === "confirmed") {
        advanceToStep2();
      }
    };

    advanceToStep2();
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("storage", handleStorage);
    };
  }, [email, router]);

  const handleResendEmail = async () => {
    setIsResending(true);
    setResendSuccess(false);
    
    try {
      // Get the resume token from localStorage
      const resumeToken = localStorage.getItem("bidder_step1_resume_token");
      if (!resumeToken) {
        throw new Error("No resume token found");
      }

      // Get form data from localStorage (we'll need to store it temporarily)
      const formData = localStorage.getItem("bidder_step1_temp");
      if (!formData) {
        throw new Error("No form data found");
      }

      const parsedData = JSON.parse(formData);

      const response = await fetch("/api/auth/register/bidder/send-confirmation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: parsedData.email,
          firstName: parsedData.firstName,
          lastName: parsedData.lastName,
          companyName: parsedData.companyName,
          position: parsedData.position,
          resumeToken,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to resend email");
      }

      setResendSuccess(true);
      setCountdown(60); // 60 second cooldown
    } catch (error) {
      console.error("Failed to resend email:", error);
    } finally {
      setIsResending(false);
    }
  };

  const handleBackToStep1 = () => {
    // Clear temporary data and go back to step 1
    localStorage.removeItem("bidder_step1_temp");
    localStorage.removeItem("bidder_step1_resume_token");
    localStorage.removeItem("bidder_step1_status");
    router.push("/register/bidder/step1");
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader variant="page" />
      
      <main className="flex-1 bg-slate-50 py-12">
        <div className="container mx-auto px-4 md:px-6">
          <div className="max-w-2xl mx-auto">
            <Stepper currentStep={1} completedSteps={[]} />

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <Card className="w-full bg-white border border-gray-100 shadow-md rounded-2xl">
                <CardContent className="p-8 md:p-12 text-center">
                  <motion.div
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                    className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 bg-blue-100"
                  >
                    <Mail className="h-10 w-10 text-blue-600" />
                  </motion.div>

                  <h1 className="text-3xl font-bold text-gray-900 mb-4">
                    Check Your Email
                  </h1>
                  
                  <p className="text-gray-600 mb-6 text-lg">
                    We&apos;ve sent a confirmation link to{" "}
                    <span className="font-semibold text-gray-900">
                      {email || "your email address"}
                    </span>
                  </p>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
                    <h3 className="font-semibold text-gray-900 mb-3">
                      What&apos;s next?
                    </h3>
                    <div className="space-y-3 text-left">
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold mt-0.5">
                          1
                        </div>
                        <p className="text-sm text-gray-600">
                          Check your email inbox (and spam folder)
                        </p>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold mt-0.5">
                          2
                        </div>
                        <p className="text-sm text-gray-600">
                          Click the confirmation link in the email
                        </p>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold mt-0.5">
                          3
                        </div>
                        <p className="text-sm text-gray-600">
                          You&apos;ll be redirected to Step 2 automatically
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <p className="text-sm text-gray-500">
                      Didn&apos;t receive the email?
                    </p>
                    
                    <Button
                      onClick={handleResendEmail}
                      disabled={isResending || countdown > 0}
                      variant="outline"
                      className="w-full sm:w-auto"
                    >
                      {isResending ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Sending...
                        </>
                      ) : countdown > 0 ? (
                        `Resend in ${countdown}s`
                      ) : (
                        <>
                          <Mail className="h-4 w-4 mr-2" />
                          Resend Confirmation Email
                        </>
                      )}
                    </Button>

                    {resendSuccess && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center justify-center gap-2 text-green-600 text-sm"
                      >
                        <Mail className="h-4 w-4" />
                        Confirmation email sent successfully!
                      </motion.div>
                    )}
                  </div>

                  <div className="mt-8 pt-6 border-t border-gray-200">
                    <Button
                      onClick={handleBackToStep1}
                      variant="outline"
                      className="w-full sm:w-auto"
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Back to Step 1
                    </Button>
                  </div>

                  <div className="mt-6 text-xs text-gray-400">
                    <p>
                      Having trouble? Contact our support team at{" "}
                      <a href="mailto:support@bidwizer.com" className="text-primary hover:underline">
                        support@bidwizer.com
                      </a>
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
