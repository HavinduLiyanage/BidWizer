"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Mail, CheckCircle, AlertCircle, RefreshCw, ArrowRight } from "lucide-react";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState<string>("");
  const [isInvite, setIsInvite] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    const emailParam = searchParams.get("email");
    const inviteParam = searchParams.get("invite");
    
    if (emailParam) {
      setEmail(emailParam);
    }
    
    if (inviteParam === "true") {
      setIsInvite(true);
    }
  }, [searchParams]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleResendEmail = async () => {
    setIsResending(true);
    setResendSuccess(false);
    
    try {
      // Simulate API call to resend verification email
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log("Resending verification email to:", email);
      
      setResendSuccess(true);
      setCountdown(60); // 60 second cooldown
    } catch (error) {
      console.error("Failed to resend email:", error);
    } finally {
      setIsResending(false);
    }
  };

  const handleCheckVerification = () => {
    // In a real app, you would check with your backend if the email is verified
    // For now, we'll simulate a successful verification
    router.push("/login?registered=true");
  };

  return (
    <>
      <SiteHeader variant="page" />

      <main className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-950 dark:via-gray-950 dark:to-blue-950 flex items-center justify-center">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Card className="w-full bg-white dark:bg-gray-950 border border-gray-100 dark:border-white/10 shadow-md rounded-2xl">
              <CardContent className="p-8 md:p-12 text-center">
                <motion.div
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, duration: 0.5 }}
                  className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-6"
                >
                  <Mail className="h-10 w-10 text-blue-600 dark:text-blue-400" />
                </motion.div>

                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                  Check Your Email
                </h1>
                
                <p className="text-gray-600 dark:text-gray-300 mb-6 text-lg">
                  We've sent a verification link to{" "}
                  <span className="font-semibold text-gray-900 dark:text-white">{email}</span>
                </p>

                {isInvite && (
                  <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      <strong>Welcome to the team!</strong> After verifying your email, you'll be able to access your company's BidWizer workspace.
                    </p>
                  </div>
                )}

                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-6 mb-8">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                    What's next?
                  </h3>
                  <div className="space-y-3 text-left">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold mt-0.5">
                        1
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        Check your email inbox (and spam folder)
                      </p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold mt-0.5">
                        2
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        Click the verification link in the email
                      </p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold mt-0.5">
                        3
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        {isInvite ? "Access your team workspace" : "Start using BidWizer"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Resend Email Section */}
                <div className="space-y-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Didn't receive the email?
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
                        Resend Verification Email
                      </>
                    )}
                  </Button>

                  {resendSuccess && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400 text-sm"
                    >
                      <CheckCircle className="h-4 w-4" />
                      Verification email sent successfully!
                    </motion.div>
                  )}
                </div>

                <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    Already verified your email?
                  </p>
                  <Button
                    onClick={handleCheckVerification}
                    className="w-full sm:w-auto"
                  >
                    Continue to Login
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>

                <div className="mt-6 text-xs text-gray-400 dark:text-gray-500">
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
      </main>

      <SiteFooter />
    </>
  );
}
