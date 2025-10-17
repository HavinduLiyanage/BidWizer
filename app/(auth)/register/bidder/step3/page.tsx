"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Mail, User, Briefcase, CheckCircle, AlertCircle } from "lucide-react";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import { Stepper } from "@/components/Stepper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { PLANS, type PlanTier } from "@/lib/entitlements";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  position: string;
  status: 'pending' | 'invited' | 'active';
}

export default function BidderRegistrationStep3() {
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState<PlanTier>('Basic');
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    position: "",
  });
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [adminEmail, setAdminEmail] = useState("");

  useEffect(() => {
    // Load plan from step 2 or URL params
    const step2Data = localStorage.getItem("bidder_step2");
    if (step2Data) {
      const data = JSON.parse(step2Data);
      // Check if plan was selected in pricing page
      const urlParams = new URLSearchParams(window.location.search);
      const planParam = urlParams.get('plan') as PlanTier;
      if (planParam) {
        setSelectedPlan(planParam);
      }
    }

    const step1Data = localStorage.getItem("bidder_step1");
    if (step1Data) {
      try {
        const data = JSON.parse(step1Data);
        if (data.email) {
          setAdminEmail(String(data.email));
        }
      } catch (error) {
        console.error("Failed to parse step 1 data:", error);
      }
    }
  }, []);

  const planFeatures = PLANS[selectedPlan];
  const maxSeats = planFeatures.seats || 1;
  const adminSeat = 1; // Admin is already registered in step 1
  const remainingSeats = Math.max(maxSeats - adminSeat - teamMembers.length, 0); // Remaining seats for team members

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();

    if (remainingSeats <= 0) {
      setErrorMessage('You have reached the maximum number of team members for your plan.');
      return;
    }

    const trimmedName = formData.name.trim();
    const trimmedEmail = formData.email.trim();
    const trimmedPosition = formData.position.trim();

    if (!trimmedName || !trimmedEmail || !trimmedPosition) {
      setErrorMessage('All fields are required to add a team member.');
      return;
    }

    const duplicate = teamMembers.some(
      (member) => member.email.toLowerCase() === trimmedEmail.toLowerCase()
    );

    if (duplicate) {
      setErrorMessage('This email is already in your invitation list.');
      return;
    }

    if (adminEmail && trimmedEmail.toLowerCase() === adminEmail.toLowerCase()) {
      setErrorMessage('The admin from step 1 is already included. Please invite a different team member.');
      return;
    }

    const newMember: TeamMember = {
      id: Date.now().toString(),
      name: trimmedName,
      email: trimmedEmail,
      position: trimmedPosition,
      status: 'pending',
    };

    setTeamMembers((prev) => [...prev, newMember]);
    setFormData({ name: "", email: "", position: "" });
    setIsAddingMember(false);
    setErrorMessage(null);
    setSuccessMessage(null);
    setSuccessMessage(`Added ${trimmedName}. Invitations will be sent when you finish setup.`);
  };

  const handleRemoveMember = (id: string) => {
    setTeamMembers(teamMembers.filter(member => member.id !== id));
  };

  const completeRegistration = async (membersOverride?: TeamMember[]) => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const step1Raw = typeof window !== "undefined" ? localStorage.getItem("bidder_step1") : null;
      const step2Raw = typeof window !== "undefined" ? localStorage.getItem("bidder_step2") : null;

      if (!step1Raw || !step2Raw) {
        setErrorMessage("We couldn't find your earlier registration steps. Please restart the registration.");
        router.push("/register/bidder/step1");
        return;
      }

      const step1Data = JSON.parse(step1Raw);
      const step2Data = JSON.parse(step2Raw);
      const members = membersOverride ?? teamMembers;

      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          flow: "bidder",
          step1: step1Data,
          step2: step2Data,
          team: {
            plan: selectedPlan,
            teamMembers: members.map((member) => ({
              name: member.name,
              email: member.email,
              position: member.position,
            })),
          },
        }),
      });

      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        details?: Array<{ message?: string }>;
        pendingInvitations?: Array<unknown>;
      };

      if (!response.ok) {
        const detailsList = Array.isArray(data?.details) ? data.details : [];
        const detailsMessage =
          detailsList.length > 0
            ? detailsList
                .map((issue) => issue?.message)
                .filter(Boolean)
                .join(" ")
            : undefined;

        setErrorMessage(
          detailsMessage ||
            data?.error ||
            "Unable to complete registration. Please try again."
        );
        return;
      }

      localStorage.removeItem("bidder_step1");
      localStorage.removeItem("bidder_step2");
      localStorage.removeItem("bidder_step1_status");
      localStorage.removeItem("bidder_step1_resume_token");
      localStorage.removeItem("bidder_registration_summary");

      const loginParams = new URLSearchParams({
        registered: "bidder",
        email: step1Data.email,
        lockEmail: "true",
      });
      if ((data.pendingInvitations ?? []).length > 0) {
        loginParams.set("invites", String((data.pendingInvitations ?? []).length));
      }

      router.push(`/login?${loginParams.toString()}`);
    } catch (error) {
      console.error("Failed to complete registration:", error);
      setErrorMessage("Unexpected error completing registration. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = () => {
    void completeRegistration();
  };

  const handleBack = () => {
    router.push("/register/bidder/step2");
  };

  const handleSkip = () => {
    void completeRegistration([]);
  };

  return (
    <>
      <SiteHeader variant="page" />
      
      <main className="flex-1 bg-slate-50 py-12">
        <div className="container mx-auto px-4 md:px-6">
          <div className="max-w-4xl mx-auto">
            <Stepper currentStep={3} completedSteps={[1, 2]} />

            <div className="bg-white rounded-2xl shadow-sm p-8 md:p-12">
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  INVITE TEAM MEMBERS
                </h1>
                <p className="text-gray-600 mb-4">
                  Add additional team members to collaborate on tenders (admin already registered)
                </p>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Mail className="h-5 w-5 text-green-600" />
                    <span className="font-semibold text-green-900">Invitation Process</span>
                  </div>
                  <p className="text-sm text-green-700">
                    When you add a team member, they'll receive an email invitation with a link to register. 
                    After they complete registration and verify their email, they'll be able to access your workspace.
                  </p>
                </div>
                
                {/* Plan Info */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-5 w-5 text-blue-600" />
                    <span className="font-semibold text-blue-900">Current Plan: {planFeatures.name}</span>
                  </div>
                  <p className="text-sm text-blue-700">
                    You can invite up to <strong>{maxSeats - adminSeat}</strong> team members (admin seat already used). 
                    {remainingSeats > 0 ? ` ${remainingSeats} seats remaining.` : ' All seats are used.'}
                  </p>
                </div>
              </div>

              {errorMessage && (
                <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  {errorMessage}
                </div>
              )}

              {successMessage && (
                <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
                  {successMessage}
                </div>
              )}

              {/* Team Members List */}
              {teamMembers.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Team Members ({teamMembers.length}/{maxSeats - adminSeat})
                  </h3>
                  <div className="space-y-3">
                    {teamMembers.map((member) => (
                      <Card key={member.id} className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                              <User className="h-5 w-5 text-gray-600" />
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">{member.name}</p>
                              <div className="flex items-center gap-4 text-sm text-gray-600">
                                <span className="flex items-center gap-1">
                                  <Mail className="h-4 w-4" />
                                  {member.email}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Briefcase className="h-4 w-4" />
                                  {member.position}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              Queued
                            </span>
                            <button
                              onClick={() => handleRemoveMember(member.id)}
                              className="text-gray-400 hover:text-red-500 transition-colors"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Add Member Form */}
              {remainingSeats > 0 && (
                <div className="mb-8">
                  {!isAddingMember ? (
                    <Button
                      onClick={() => setIsAddingMember(true)}
                      className="flex items-center gap-2"
                      disabled={isSubmitting}
                    >
                      <Plus className="h-4 w-4" />
                      Add Team Member
                    </Button>
                  ) : (
                    <Card className="p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Add New Team Member
                      </h3>
                      <form onSubmit={handleAddMember} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="name">
                              Name<span className="text-red-500">*</span>
                            </Label>
                            <Input
                              id="name"
                              type="text"
                              placeholder="Full name"
                              value={formData.name}
                              onChange={(e) =>
                                setFormData({ ...formData, name: e.target.value })
                              }
                              required
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="email">
                              Email<span className="text-red-500">*</span>
                            </Label>
                            <Input
                              id="email"
                              type="email"
                              placeholder="teammate@company.com"
                              value={formData.email}
                              onChange={(e) =>
                                setFormData({ ...formData, email: e.target.value })
                              }
                              required
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="position">
                              Position<span className="text-red-500">*</span>
                            </Label>
                            <Input
                              id="position"
                              type="text"
                              placeholder="e.g., Bid Specialist"
                              value={formData.position}
                              onChange={(e) =>
                                setFormData({ ...formData, position: e.target.value })
                              }
                              required
                            />
                          </div>
                        </div>

                        <div className="flex gap-3">
                          <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? "Adding..." : "Add Member"}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setIsAddingMember(false);
                              setFormData({ name: "", email: "", position: "" });
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </form>
                    </Card>
                  )}
                </div>
              )}

              {/* Warning if no seats left */}
              {remainingSeats <= 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-yellow-600" />
                    <span className="font-semibold text-yellow-900">All seats are used</span>
                  </div>
                  <p className="text-sm text-yellow-700 mt-1">
                    You've reached the maximum number of team members for your current plan. 
                    Upgrade your plan to add more team members.
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleSkip}
                  className="text-primary hover:underline text-sm font-medium sm:order-1 disabled:cursor-not-allowed disabled:text-gray-400"
                  disabled={isSubmitting}
                >
                  Skip for now
                </button>
                <div className="flex-1 sm:order-3" />
                <div className="flex gap-3 sm:order-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleBack}
                    className="sm:w-auto"
                    disabled={isSubmitting}
                  >
                    Back
                  </Button>
                  <Button onClick={handleSubmit} className="sm:w-auto" disabled={isSubmitting}>
                    {isSubmitting ? "Finishing..." : "Complete Setup"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
