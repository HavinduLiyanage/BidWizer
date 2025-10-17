"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import { Stepper } from "@/components/Stepper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function BidderRegistrationStep2() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formData, setFormData] = useState({
    companyName: "",
    industry: "",
    otherIndustry: "",
    website: "",
    about: "",
  });
  const [isAccessReady, setIsAccessReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const token = searchParams.get("token");
    const step1Raw = localStorage.getItem("bidder_step1_temp");
    const step1Permanent = localStorage.getItem("bidder_step1");
    const status = localStorage.getItem("bidder_step1_status");
    const storedToken = localStorage.getItem("bidder_step1_resume_token");

    // If email is confirmed, allow access regardless of token validation
    if (status === "confirmed") {
      // Move any temp data to permanent storage
      if (step1Raw) {
        localStorage.setItem("bidder_step1", step1Raw);
        localStorage.removeItem("bidder_step1_temp");
      }
      
      // Clean up tokens
      localStorage.removeItem("bidder_step1_resume_token");
      
      setIsAccessReady(true);

      // Clean up URL if there's a token
      if (token) {
        const params = new URLSearchParams(window.location.search);
        params.delete("token");
        const nextUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`;
        router.replace(nextUrl);
      }
      return;
    }

    // If no confirmed status, check token validation
    if (token && storedToken && token === storedToken) {
      if (!step1Raw) {
        localStorage.removeItem("bidder_step1_status");
        localStorage.removeItem("bidder_step1_resume_token");
        router.replace("/register/bidder/step1");
        return;
      }

      // Move temp data to permanent storage and mark as confirmed
      localStorage.setItem("bidder_step1", step1Raw);
      localStorage.setItem("bidder_step1_status", "confirmed");
      localStorage.removeItem("bidder_step1_resume_token");
      localStorage.removeItem("bidder_step1_temp");
      setIsAccessReady(true);

      const params = new URLSearchParams(window.location.search);
      params.delete("token");
      const nextUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`;
      router.replace(nextUrl);
      return;
    }

    // No valid access - redirect to step 1
    if (!step1Raw && !step1Permanent) {
      router.replace("/register/bidder/step1");
      return;
    }

    router.replace("/register/bidder/step1?confirmation=required");
  }, [router, searchParams]);

  useEffect(() => {
    if (!isAccessReady || typeof window === "undefined") {
      return;
    }

    const step2Stored = localStorage.getItem("bidder_step2");
    if (step2Stored) {
      try {
        const parsed = JSON.parse(step2Stored);
        setFormData((prev) => ({ ...prev, ...parsed }));
      } catch (error) {
        console.error("Failed to parse stored step 2 data:", error);
      }
    }

    const step1Data = localStorage.getItem("bidder_step1");
    if (step1Data) {
      try {
        const data = JSON.parse(step1Data);
        if (data?.companyName) {
          setFormData((prev) => ({ ...prev, companyName: data.companyName }));
        }
      } catch (error) {
        console.error("Failed to parse step 1 data:", error);
      }
    }
  }, [isAccessReady]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate that industry is selected
    if (!formData.industry) {
      alert('Please select an industry');
      return;
    }

    // Validate that if "other" is selected, otherIndustry is filled
    if (formData.industry === 'other' && !formData.otherIndustry.trim()) {
      alert('Please specify your industry');
      return;
    }

    // Validate company description length
    if (formData.about.trim().length < 20) {
      alert('Please provide at least 20 characters in the company description');
      return;
    }

    const trimmedData = {
      companyName: formData.companyName.trim(),
      industry: formData.industry,
      otherIndustry: formData.industry === 'other' ? formData.otherIndustry.trim() : '',
      website: formData.website.trim(),
      about: formData.about.trim(),
    };

    localStorage.setItem("bidder_step2", JSON.stringify(trimmedData));
    router.push("/register/bidder/step3");
  };

  const handleBack = () => {
    router.push("/register/bidder/step1");
  };

  // Form validation
  const isFormValid = 
    formData.companyName.trim() &&
    formData.industry &&
    (formData.industry !== 'other' || formData.otherIndustry.trim()) &&
    formData.website.trim() &&
    formData.about.trim().length >= 20;

  if (!isAccessReady) {
    return (
      <>
        <SiteHeader variant="page" />

        <main className="flex-1 bg-slate-50 py-12">
          <div className="container mx-auto px-4 md:px-6">
            <div className="max-w-2xl mx-auto">
              <Stepper currentStep={2} completedSteps={[1]} />

              <div className="bg-white rounded-2xl shadow-sm p-12 flex flex-col items-center justify-center gap-4 text-center">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <div className="space-y-2">
                  <p className="text-lg font-semibold text-gray-900">
                    Hold tight...
                  </p>
                  <p className="text-sm text-gray-600">
                    We&apos;re verifying your confirmation link so you can continue your
                    registration.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </main>

        <SiteFooter />
      </>
    );
  }

  return (
    <>
      <SiteHeader variant="page" />
      
      <main className="flex-1 bg-slate-50 py-12">
        <div className="container mx-auto px-4 md:px-6">
          <div className="max-w-2xl mx-auto">
            <Stepper currentStep={2} completedSteps={[1]} />

            <div className="bg-white rounded-2xl shadow-sm p-8 md:p-12">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                COMPLETE YOUR COMPANY PROFILE
              </h1>
              <p className="text-gray-600 mb-8">
                Provide key information about your organization
              </p>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="companyName">
                    Company name<span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="companyName"
                    type="text"
                    placeholder="Your company name"
                    value={formData.companyName}
                    onChange={(e) =>
                      setFormData({ ...formData, companyName: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="industry">
                    Industry<span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.industry}
                    onValueChange={(value) =>
                      setFormData({ ...formData, industry: value, otherIndustry: value !== 'other' ? '' : formData.otherIndustry })
                    }
                  >
                    <SelectTrigger id="industry">
                      <SelectValue placeholder="Select your industry" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="construction">Construction</SelectItem>
                      <SelectItem value="healthcare">Healthcare</SelectItem>
                      <SelectItem value="it">IT & Technology</SelectItem>
                      <SelectItem value="manufacturing">Manufacturing</SelectItem>
                      <SelectItem value="education">Education</SelectItem>
                      <SelectItem value="transportation">Transportation</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.industry === 'other' && (
                  <div className="space-y-2">
                    <Label htmlFor="otherIndustry">
                      Please specify your industry<span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="otherIndustry"
                      type="text"
                      placeholder="Enter your industry/sector"
                      value={formData.otherIndustry}
                      onChange={(e) =>
                        setFormData({ ...formData, otherIndustry: e.target.value })
                      }
                      required
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="website">
                    Company Website<span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="website"
                    type="url"
                    placeholder="https://www.yourcompany.com"
                    value={formData.website}
                    onChange={(e) =>
                      setFormData({ ...formData, website: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="about">
                    About the company<span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="about"
                    placeholder="Tell us about your company, your main activities, and your experience with tenders..."
                    value={formData.about}
                    onChange={(e) =>
                      setFormData({ ...formData, about: e.target.value })
                    }
                    rows={6}
                    required
                  />
                  <div className="flex justify-between items-center text-xs">
                    <span className={`${formData.about.length < 20 ? 'text-red-500' : 'text-green-600'}`}>
                      {formData.about.length < 20 
                        ? `Please provide at least ${20 - formData.about.length} more characters`
                        : 'Description meets minimum requirements'
                      }
                    </span>
                    <span className="text-gray-500">
                      {formData.about.length}/20+ characters
                    </span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleBack}
                    className="sm:w-auto"
                  >
                    Back
                  </Button>
                  <Button type="submit" className="sm:flex-1" disabled={!isFormValid}>
                    Complete the profile
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}

