"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Mail, Users } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Stepper } from "@/components/Stepper";
import { Button } from "@/components/ui/button";

interface PendingInvite {
  email: string;
  name?: string | null;
  position?: string | null;
  expiresAt?: string;
}

interface RegistrationSummary {
  email?: string;
  organizationName?: string;
  pendingInvitations?: PendingInvite[];
}

export default function BidderRegistrationReady() {
  const searchParams = useSearchParams();
  const [summary, setSummary] = useState<RegistrationSummary>({});

  useEffect(() => {
    const stored = localStorage.getItem("bidder_registration_summary");
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as RegistrationSummary;
        setSummary(parsed);
      } catch (error) {
        console.error("Failed to load registration summary:", error);
      } finally {
        localStorage.removeItem("bidder_registration_summary");
      }
    }
  }, []);

  const primaryEmail = searchParams.get("email") ?? summary.email ?? "";
  const organizationName = summary.organizationName ?? "your workspace";
  const pendingInvites = summary.pendingInvitations ?? [];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-slate-50 py-12">
        <div className="container mx-auto px-4 md:px-6">
          <div className="max-w-2xl mx-auto">
            <Stepper currentStep={3} completedSteps={[1, 2, 3]} />

            <div className="bg-white rounded-2xl shadow-sm p-8 md:p-12 text-center space-y-6">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full">
                <CheckCircle2 className="h-12 w-12 text-success" />
              </div>

              <div className="space-y-3">
                <h1 className="text-4xl font-bold text-gray-900">
                  Check your inbox
                </h1>
                <p className="text-lg text-gray-600">
                  We just sent a verification email to{" "}
                  <span className="font-semibold text-gray-900">{primaryEmail || "your inbox"}</span>.
                  Please confirm your email to activate access to{" "}
                  <span className="font-semibold text-gray-900">{organizationName}</span>.
                </p>
              </div>

              <div className="flex flex-col gap-4 rounded-xl border border-blue-100 bg-blue-50 p-5 text-left">
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-semibold text-blue-900">Didn't receive the email?</p>
                    <p className="text-sm text-blue-700">
                      Check your spam or promotions folder. You can request a new verification email from the login page if needed.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Users className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-semibold text-blue-900">Team invitations</p>
                    {pendingInvites.length > 0 ? (
                      <div className="text-sm text-blue-700 space-y-2">
                        <p>We queued invitation emails for:</p>
                        <ul className="list-disc list-inside space-y-1">
                          {pendingInvites.map((invite) => (
                            <li key={invite.email}>
                              <span className="font-medium text-blue-900">{invite.email}</span>
                              {invite.position ? ` · ${invite.position}` : ""}
                              {invite.expiresAt ? (
                                <span className="text-xs text-blue-600">
                                  {" "}
                                  (expires {new Date(invite.expiresAt).toLocaleDateString()})
                                </span>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <p className="text-sm text-blue-700">
                        Finish verifying your account to invite teammates from your dashboard.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto pt-4">
                <Link href="/login?registered=true" className="flex-1">
                  <Button className="w-full">Go to Login</Button>
                </Link>
                <Link href="/" className="flex-1">
                  <Button variant="outline" className="w-full">
                    Return Home
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

