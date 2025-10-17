"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, Info, CheckCircle, AlertCircle, Loader2, Eye, EyeOff } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Stepper } from "@/components/Stepper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function BidderRegistrationStep1() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formData, setFormData] = useState({
    companyName: "",
    firstName: "",
    lastName: "",
    position: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);
  const [isEmailConfirmed, setIsEmailConfirmed] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const stored = localStorage.getItem("bidder_step1");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setFormData((prev) => ({ ...prev, ...parsed }));
      } catch (error) {
        console.error("Failed to parse stored step 1 data:", error);
      }
    }

    const status = localStorage.getItem("bidder_step1_status");
    if (status === "pending") {
      setConfirmationSent(true);
      setIsEmailConfirmed(false);
      setSuccessMessage((prev) => prev ?? "A confirmation email was already sent. Check your inbox to continue to Step 2.");
    } else if (status === "confirmed") {
      setConfirmationSent(true);
      setIsEmailConfirmed(true);
      setSuccessMessage("Email confirmed. You can continue to Step 2.");
    }
  }, []);

  useEffect(() => {
    const confirmationParam = searchParams.get("confirmation");
    if (confirmationParam === "required" && !isEmailConfirmed) {
      setErrorMessage("Please confirm your email using the link we sent before continuing to Step 2.");
    }
  }, [searchParams, isEmailConfirmed]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key === "bidder_step1_status") {
        const newStatus = event.newValue ?? "";
        const isPending = newStatus === "pending";
        const isConfirmed = newStatus === "confirmed";

        setConfirmationSent(isPending || isConfirmed);
        setIsEmailConfirmed(isConfirmed);

        if (isConfirmed) {
          setSuccessMessage("Email confirmed. You can continue to Step 2.");
          setErrorMessage(null);
        }
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const validatePassword = (value: string): string | null => {
    if (value.length < 8) {
      return "Password must be at least 8 characters long.";
    }
    if (!/[A-Z]/.test(value)) {
      return "Password must include at least one uppercase letter.";
    }
    if (!/[a-z]/.test(value)) {
      return "Password must include at least one lowercase letter.";
    }
    if (!/\d/.test(value)) {
      return "Password must include at least one number.";
    }
    if (!/[^A-Za-z0-9]/.test(value)) {
      return "Password must include at least one special character.";
    }
    return null;
  };

  const getPasswordRequirements = (password: string) => {
    return {
      minLength: password.length >= 8,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumber: /\d/.test(password),
      hasSpecialChar: /[^A-Za-z0-9]/.test(password),
    };
  };

  const calculatePasswordStrength = (password: string): { score: number; label: string; color: string } => {
    const requirements = getPasswordRequirements(password);
    const metRequirements = Object.values(requirements).filter(Boolean).length;
    
    if (password.length === 0) {
      return { score: 0, label: "", color: "" };
    }
    
    if (metRequirements < 2) {
      return { score: 1, label: "Very Weak", color: "bg-red-500" };
    } else if (metRequirements < 3) {
      return { score: 2, label: "Weak", color: "bg-orange-500" };
    } else if (metRequirements < 4) {
      return { score: 3, label: "Fair", color: "bg-yellow-500" };
    } else if (metRequirements < 5) {
      return { score: 4, label: "Good", color: "bg-blue-500" };
    } else {
      return { score: 5, label: "Strong", color: "bg-green-500" };
    }
  };

  const passwordsMatch = formData.password === formData.confirmPassword && formData.confirmPassword.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedData = {
      companyName: formData.companyName.trim(),
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      position: formData.position.trim(),
      email: formData.email.trim(),
      password: formData.password,
      confirmPassword: formData.confirmPassword,
    };

    if (trimmedData.password !== trimmedData.confirmPassword) {
      setErrorMessage("Passwords do not match. Please re-enter them.");
      setSuccessMessage(null);
      return;
    }

    const passwordError = validatePassword(trimmedData.password);
    if (passwordError) {
      setErrorMessage(passwordError);
      setSuccessMessage(null);
      return;
    }

    const resumeToken =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
            const rand = Math.random() * 16;
            const value = char === "x" ? Math.floor(rand) : (Math.floor(rand) & 0x3) | 0x8;
            return value.toString(16);
          });

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      localStorage.setItem("bidder_step1", JSON.stringify(trimmedData));
      localStorage.setItem("bidder_step1_resume_token", resumeToken);
      localStorage.setItem("bidder_step1_status", "pending");

      const response = await fetch("/api/auth/register/bidder/send-confirmation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: trimmedData.email,
          firstName: trimmedData.firstName,
          lastName: trimmedData.lastName,
          companyName: trimmedData.companyName,
          position: trimmedData.position,
          resumeToken,
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        localStorage.removeItem("bidder_step1_status");
        localStorage.removeItem("bidder_step1_resume_token");
        setConfirmationSent(false);
        setIsEmailConfirmed(false);
        setErrorMessage(
          result?.error || "We could not send the confirmation email. Please try again."
        );
        setSuccessMessage(null);
        return;
      }

      setConfirmationSent(true);
      setIsEmailConfirmed(false);
      setSuccessMessage(
        typeof result?.message === "string"
          ? result.message
          : "Confirmation email sent. Check your inbox to continue to Step 2."
      );
    } catch (error) {
      console.error("Failed to send confirmation email:", error);
      localStorage.removeItem("bidder_step1_status");
      localStorage.removeItem("bidder_step1_resume_token");
      setConfirmationSent(false);
      setIsEmailConfirmed(false);
      setErrorMessage("Unexpected error sending confirmation email. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push("/");
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 bg-slate-50 py-12">
        <div className="container mx-auto px-4 md:px-6">
          <div className="max-w-2xl mx-auto">
            <div className="text-right mb-4 text-sm text-gray-600">
              Already have an account?{" "}
              <Link href="/login" className="text-primary hover:underline">
                Log in
              </Link>
            </div>

            <Stepper currentStep={1} completedSteps={[]} />

            <div className="bg-white rounded-2xl shadow-sm p-8 md:p-12">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                SET UP YOUR MAIN ACCOUNT
              </h1>
              <p className="text-gray-600 mb-8">
                Complete your profile to unlock powerful bidding tools
              </p>

              <form onSubmit={handleSubmit} className="space-y-6">
                {errorMessage && (
                  <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-500" />
                    <p>{errorMessage}</p>
                  </div>
                )}

                {successMessage && (
                  <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
                    <CheckCircle className="h-5 w-5 flex-shrink-0 text-green-500" />
                    <div className="space-y-2">
                      <p>{successMessage}</p>
                      {!isEmailConfirmed && (
                        <p className="text-xs text-green-600">
                          Confirm the email to unlock Step 2. The link in the message opens Step 2 automatically.
                        </p>
                      )}
                      {isEmailConfirmed && (
                        <div className="space-y-2">
                          <p className="text-xs text-green-600">
                            Email confirmed. You can now proceed to your company profile.
                          </p>
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => router.push("/register/bidder/step2")}
                            className="w-full sm:w-auto"
                          >
                            Continue to Step 2
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="companyName">
                    Company Name<span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="companyName"
                    type="text"
                    placeholder="Enter company name"
                    value={formData.companyName}
                    onChange={(e) =>
                      setFormData({ ...formData, companyName: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">
                      First Name<span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="firstName"
                      type="text"
                      placeholder="Enter first name"
                      value={formData.firstName}
                      onChange={(e) =>
                        setFormData({ ...formData, firstName: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lastName">
                      Last Name<span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="lastName"
                      type="text"
                      placeholder="Enter last name"
                      value={formData.lastName}
                      onChange={(e) =>
                        setFormData({ ...formData, lastName: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="position">
                    Position/Role<span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="position"
                    type="text"
                    placeholder="e.g., CEO, Project Manager"
                    value={formData.position}
                    onChange={(e) =>
                      setFormData({ ...formData, position: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-2">
                    Work email<span className="text-red-500">*</span>
                    <Info className="h-4 w-4 text-gray-400" />
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@company.com"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">
                    Password<span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Create a password"
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                      className="pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  
                  {/* Password Strength Meter */}
                  {formData.password && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all duration-300 ${
                              calculatePasswordStrength(formData.password).color
                            }`}
                            style={{
                              width: `${(calculatePasswordStrength(formData.password).score / 5) * 100}%`,
                            }}
                          />
                        </div>
                        <span className="text-xs font-medium text-gray-600">
                          {calculatePasswordStrength(formData.password).label}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Password Requirements Checklist */}
                  <div className="space-y-1 text-xs">
                    {(() => {
                      const requirements = getPasswordRequirements(formData.password);
                      return (
                        <>
                          <div className={`flex items-center gap-2 ${requirements.minLength ? 'text-green-600' : 'text-gray-500'}`}>
                            <CheckCircle className={`h-3 w-3 ${requirements.minLength ? 'text-green-500' : 'text-gray-400'}`} />
                            At least 8 characters
                          </div>
                          <div className={`flex items-center gap-2 ${requirements.hasUppercase ? 'text-green-600' : 'text-gray-500'}`}>
                            <CheckCircle className={`h-3 w-3 ${requirements.hasUppercase ? 'text-green-500' : 'text-gray-400'}`} />
                            One uppercase letter
                          </div>
                          <div className={`flex items-center gap-2 ${requirements.hasLowercase ? 'text-green-600' : 'text-gray-500'}`}>
                            <CheckCircle className={`h-3 w-3 ${requirements.hasLowercase ? 'text-green-500' : 'text-gray-400'}`} />
                            One lowercase letter
                          </div>
                          <div className={`flex items-center gap-2 ${requirements.hasNumber ? 'text-green-600' : 'text-gray-500'}`}>
                            <CheckCircle className={`h-3 w-3 ${requirements.hasNumber ? 'text-green-500' : 'text-gray-400'}`} />
                            One number
                          </div>
                          <div className={`flex items-center gap-2 ${requirements.hasSpecialChar ? 'text-green-600' : 'text-gray-500'}`}>
                            <CheckCircle className={`h-3 w-3 ${requirements.hasSpecialChar ? 'text-green-500' : 'text-gray-400'}`} />
                            One special character
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">
                    Confirm Password<span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm your password"
                      value={formData.confirmPassword}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          confirmPassword: e.target.value,
                        })
                      }
                      className="pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  
                  {/* Password Match Indicator */}
                  {formData.confirmPassword && (
                    <div className="flex items-center gap-2 text-xs">
                      {passwordsMatch ? (
                        <>
                          <CheckCircle className="h-3 w-3 text-green-500" />
                          <span className="text-green-600">Passwords match</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="h-3 w-3 text-red-500" />
                          <span className="text-red-600">Passwords do not match</span>
                        </>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancel}
                    className="sm:w-auto"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="sm:flex-1"
                    disabled={
                      isSubmitting ||
                      !validatePassword(formData.password) ||
                      !passwordsMatch ||
                      !formData.companyName.trim() ||
                      !formData.firstName.trim() ||
                      !formData.lastName.trim() ||
                      !formData.position.trim() ||
                      !formData.email.trim()
                    }
                  >
                    {isSubmitting ? (
                      <span className="flex items-center justify-center">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </span>
                    ) : confirmationSent ? (
                      "Resend confirmation email"
                    ) : (
                      "Submit"
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

