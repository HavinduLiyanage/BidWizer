"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

interface RegistrationSummary {
  email?: string;
  pendingInvitations?: unknown[];
}

export default function BidderRegistrationReady() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const loginParams = new URLSearchParams({
      registered: "bidder",
      lockEmail: "true",
    });

    let emailFromContext = searchParams.get("email") ?? undefined;
    let pendingInviteCount = 0;

    if (typeof window !== "undefined") {
      const summaryRaw = localStorage.getItem("bidder_registration_summary");

      if (summaryRaw) {
        try {
          const summary = JSON.parse(summaryRaw) as RegistrationSummary;
          if (!emailFromContext && summary.email) {
            emailFromContext = summary.email;
          }

          if (Array.isArray(summary.pendingInvitations)) {
            pendingInviteCount = summary.pendingInvitations.length;
          }
        } catch (error) {
          console.error("Failed to parse bidder registration summary:", error);
        } finally {
          localStorage.removeItem("bidder_registration_summary");
        }
      }

      localStorage.removeItem("bidder_step1");
      localStorage.removeItem("bidder_step2");
      localStorage.removeItem("bidder_step1_status");
      localStorage.removeItem("bidder_step1_resume_token");
    }

    if (emailFromContext) {
      loginParams.set("email", emailFromContext);
    }

    if (pendingInviteCount > 0) {
      loginParams.set("invites", String(pendingInviteCount));
    }

    router.replace(`/login?${loginParams.toString()}`);
  }, [router, searchParams]);

  return null;
}
