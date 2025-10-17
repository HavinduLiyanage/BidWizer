"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { CheckCircle, ArrowRight } from "lucide-react";
import SiteHeader from "@/components/site-header";
import { Footer } from "@/components/Footer";
import { Stepper } from "@/components/Stepper";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function EmailConfirmedPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState<string>("");
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    const emailParam = searchParams.get("email");
    const tokenParam = searchParams.get("token");
    
    if (emailParam) {
      setEmail(emailParam);
    }

    // Ensure step 1 data is preserved before marking as confirmed
    const step1Temp = localStorage.getItem("bidder_step1_temp");
    if (step1Temp) {
      // Move temp data to permanent storage
      localStorage.setItem("bidder_step1", step1Temp);
      localStorage.removeItem("bidder_step1_temp");
    }

    // Always mark email as confirmed when user reaches this page
    localStorage.setItem("bidder_step1_status", "confirmed");

    // If token is present, redirect to step 2 with token
    if (tokenParam) {
      setTimeout(() => {
        setIsRedirecting(true);
        router.push(`/register/bidder/step2?token=${encodeURIComponent(tokenParam)}&email=${encodeURIComponent(emailParam || "")}`);
      }, 3000);
    } else {
      // No token, just redirect to step 2
      const timer = setTimeout(() => {
        setIsRedirecting(true);
        router.push("/register/bidder/step2");
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [searchParams, router]);

  const handleContinueToStep2 = () => {
    setIsRedirecting(true);
    const tokenParam = searchParams.get("token");
    const emailParam = searchParams.get("email");
    
    // Ensure step 1 data is preserved before redirecting
    const step1Temp = localStorage.getItem("bidder_step1_temp");
    if (step1Temp) {
      localStorage.setItem("bidder_step1", step1Temp);
      localStorage.removeItem("bidder_step1_temp");
    }
    
    // Ensure status is confirmed before redirecting
    localStorage.setItem("bidder_step1_status", "confirmed");
    
    if (tokenParam) {
      router.push(`/register/bidder/step2?token=${encodeURIComponent(tokenParam)}&email=${encodeURIComponent(emailParam || "")}`);
    } else {
      router.push("/register/bidder/step2");
    }
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
                  {/* Tick Animation */}
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ 
                      delay: 0.3, 
                      duration: 0.5,
                      type: "spring",
                      stiffness: 200,
                      damping: 15
                    }}
                    className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 bg-green-100"
                  >
                    <motion.div
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ 
                        delay: 0.8, 
                        duration: 0.6,
                        ease: "easeInOut"
                      }}
                    >
                      <CheckCircle className="h-16 w-16 text-green-600" />
                    </motion.div>
                  </motion.div>

                  {/* Success Message */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.2, duration: 0.5 }}
                  >
                    <h1 className="text-3xl font-bold text-gray-900 mb-4">
                      Email Confirmed!
                    </h1>
                    
                    <p className="text-gray-600 mb-6 text-lg">
                      Your email{" "}
                      <span className="font-semibold text-gray-900">
                        {email || "has been confirmed"}
                      </span>
                      {" "}successfully. You can now continue with your registration.
                    </p>
                  </motion.div>

                  {/* Success Details */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.4, duration: 0.5 }}
                    className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8"
                  >
                    <div className="flex items-center justify-center gap-2 text-green-700 mb-2">
                      <CheckCircle className="h-5 w-5" />
                      <span className="font-semibold">Verification Complete</span>
                    </div>
                    <p className="text-sm text-green-600">
                      Your account is now verified and ready for the next step.
                    </p>
                  </motion.div>

                  {/* Action Buttons */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.6, duration: 0.5 }}
                    className="space-y-4"
                  >
                    <Button
                      onClick={handleContinueToStep2}
                      disabled={isRedirecting}
                      className="w-full sm:w-auto"
                    >
                      {isRedirecting ? (
                        <>
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            className="mr-2"
                          >
                            <ArrowRight className="h-4 w-4" />
                          </motion.div>
                          Redirecting...
                        </>
                      ) : (
                        <>
                          Continue to Step 2
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </>
                      )}
                    </Button>

                    <p className="text-sm text-gray-500">
                      {isRedirecting 
                        ? "Redirecting automatically..." 
                        : "You'll be redirected automatically in a few seconds"
                      }
                    </p>
                  </motion.div>

                  {/* Support Info */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.8, duration: 0.5 }}
                    className="mt-8 pt-6 border-t border-gray-200"
                  >
                    <div className="text-xs text-gray-400">
                      <p>
                        Having trouble? Contact our support team at{" "}
                        <a href="mailto:support@bidwizer.com" className="text-primary hover:underline">
                          support@bidwizer.com
                        </a>
                      </p>
                    </div>
                  </motion.div>
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
