"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
  const [formData, setFormData] = useState({
    companyName: "",
    industry: "",
    otherIndustry: "",
    website: "",
    about: "",
  });

  useEffect(() => {
    // Load company name from step 1
    const step1Data = localStorage.getItem("bidder_step1");
    if (step1Data) {
      const data = JSON.parse(step1Data);
      setFormData((prev) => ({ ...prev, companyName: data.companyName }));
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate that industry is selected
    if (!formData.industry) {
      alert('Please select an industry');
      return;
    }
    
    // Validate that if "other" is selected, otherIndustry is filled
    if (formData.industry === 'other' && !formData.otherIndustry) {
      alert('Please specify your industry');
      return;
    }
    
    localStorage.setItem("bidder_step2", JSON.stringify(formData));
    router.push("/register/bidder/step3");
  };

  const handleBack = () => {
    router.push("/register/bidder/step1");
  };

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
                  <Button type="submit" className="sm:flex-1">
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

