import { PLAN_SPECS, type PlanTier } from "@/lib/entitlements";

type StepDefinition = { number: 1 | 2 | 3; label: string };

const SOLO_PLAN_STEPS: StepDefinition[] = [
  { number: 1, label: "Account Setup" },
  { number: 2, label: "Email Confirmation" },
  { number: 3, label: "Company Profile" },
];

const TEAM_PLAN_STEPS: StepDefinition[] = [
  { number: 1, label: "Account Setup" },
  { number: 2, label: "Company Profile" },
  { number: 3, label: "Team Invite" },
];

export function getPlanStepperSteps(plan: PlanTier | null | undefined): StepDefinition[] {
  return planRequiresTeamSetup(plan) ? TEAM_PLAN_STEPS : SOLO_PLAN_STEPS;
}

export function normalizePlanTier(value: string | null | undefined): PlanTier | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toUpperCase();
  return Object.prototype.hasOwnProperty.call(PLAN_SPECS, normalized)
    ? (normalized as PlanTier)
    : null;
}

export function planRequiresTeamSetup(plan: PlanTier | null | undefined): boolean {
  if (!plan) {
    return false;
  }

  const spec = PLAN_SPECS[plan];
  return (spec.seats ?? 1) > 1;
}

export interface RegistrationTeamMemberInput {
  name: string;
  email: string;
  position: string;
}

export type RegistrationSubmissionResult =
  | { status: "success"; loginUrl: string; pendingInvitations?: number }
  | { status: "missing-data"; errorMessage: string }
  | { status: "error"; errorMessage: string };

export async function submitBidderRegistration(
  plan: PlanTier,
  teamMembers: RegistrationTeamMemberInput[]
): Promise<RegistrationSubmissionResult> {
  if (typeof window === "undefined") {
    return { status: "error", errorMessage: "Registration must be completed in the browser." };
  }

  const step1Raw = localStorage.getItem("bidder_step1");
  const step2Raw = localStorage.getItem("bidder_step2");

  if (!step1Raw || !step2Raw) {
    return {
      status: "missing-data",
      errorMessage: "We couldn't find your earlier registration steps. Please restart the registration.",
    };
  }

  let step1Data: Record<string, unknown>;
  let step2Data: Record<string, unknown>;

  try {
    step1Data = JSON.parse(step1Raw);
    step2Data = JSON.parse(step2Raw);
  } catch (error) {
    console.error("Failed to parse registration data:", error);
    return {
      status: "missing-data",
      errorMessage: "We couldn't read your saved registration details. Please restart the registration.",
    };
  }

  try {
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        flow: "bidder",
        step1: step1Data,
        step2: step2Data,
        team: {
          plan,
          teamMembers,
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

      return {
        status: "error",
        errorMessage:
          detailsMessage || data?.error || "Unable to complete registration. Please try again.",
      };
    }

    localStorage.removeItem("bidder_step1");
    localStorage.removeItem("bidder_step2");
    localStorage.removeItem("bidder_step1_status");
    localStorage.removeItem("bidder_step1_resume_token");
    localStorage.removeItem("bidder_registration_summary");

    const loginParams = new URLSearchParams({
      registered: "bidder",
      email: String((step1Data as { email?: string }).email ?? ""),
      lockEmail: "true",
    });

    const pendingInvites = Array.isArray(data.pendingInvitations)
      ? data.pendingInvitations.length
      : 0;

    if (pendingInvites > 0) {
      loginParams.set("invites", String(pendingInvites));
    }

    return {
      status: "success",
      loginUrl: `/login?${loginParams.toString()}`,
      pendingInvitations: pendingInvites,
    };
  } catch (error) {
    console.error("Failed to complete registration:", error);
    return {
      status: "error",
      errorMessage: "Unexpected error completing registration. Please try again.",
    };
  }
}
