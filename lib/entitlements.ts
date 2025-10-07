/**
 * Entitlements and plan management (stub implementation)
 */

export type PlanTier = "Basic" | "Team" | "ENTERPRISE";

export interface PlanFeatures {
  name: string;
  price: number;
  features: string[];
  monthlyAIQuestions: number;
  seats?: number;
}

export const PLANS: Record<PlanTier, PlanFeatures> = {
  Basic: {
    name: "Basic Plan",
    price: 20,
    monthlyAIQuestions: 120,
    seats: 3,
    features: [
      "3 Seats total → 1 Admin (CEO) + 2 team members",
      "120 AI Q&A interactions per month",
      "Full access to all tender documents",
      "Follow up to 5 publishers (email alerts)",
      "Standard support (email + in-app chat)",
      "Dashboard access with usage tracker",
      "Company profile management"
    ],
  },
  Team: {
    name: "Team Plan",
    price: 35,
    monthlyAIQuestions: 300,
    seats: 5,
    features: [
      "5 Seats total → 1 Admin (CEO) + 4 team members",
      "300 AI Q&A interactions per month",
      "Full access to all tender documents",
      "Follow up to 15 publishers (email alerts)",
      "Priority support (24-hour response)",
      "Advanced dashboard with AI usage bar",
      "Billing section & plan management"
    ],
  },
  ENTERPRISE: {
    name: "Enterprise / Custom",
    price: 0, // Contact for pricing
    monthlyAIQuestions: 500,
    seats: 10, // Custom seat allocations
    features: [
      "Custom seat allocations",
      "Higher AI usage limits & dedicated support",
      "Advanced analytics & team reporting",
      "Private tender hosting or integrations",
      "Custom onboarding & training"
    ],
  },
};

export function getPlanFeatures(tier: PlanTier): PlanFeatures {
  return PLANS[tier];
}

