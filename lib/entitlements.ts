export type PlanTier = "FREE" | "STANDARD" | "PREMIUM" | "ENTERPRISE";

export interface PlanSpec {
  id: PlanTier;
  label: string;
  priceLKR?: number;
  priceUSD?: number;
  seats: number;
  aiMonthlyLimit: number | null;
  pageLimit?: number | null;
  features: string[];
  highlight?: string;
  isPopular?: boolean;
  trialDays?: number;
  includesCoverLetter?: boolean;
  includesFolderChat?: boolean;
  supportLevel: "email" | "priority" | "custom";
}

export const PLANS_ORDER: PlanTier[] = ["FREE", "STANDARD", "PREMIUM", "ENTERPRISE"];

export const PLAN_SPECS: Record<PlanTier, PlanSpec> = {
  FREE: {
    id: "FREE",
    label: "Freemium / Trial",
    trialDays: 7,
    priceLKR: 0,
    priceUSD: 0,
    seats: 1,
    pageLimit: 3,
    aiMonthlyLimit: 0, // global monthly cap; FREE uses per-tender caps below
    features: [
      "View tenders",
      "View tender details",
      "Workspace preview: first 3 pages",
      "AI Brief: 1 per tender",
      "AI Chat: 2 per tender",
      "Email support",
    ],
    highlight: "Try BidWizer with limited previews",
    supportLevel: "email",
    includesCoverLetter: false,
    includesFolderChat: false,
  },
  STANDARD: {
    id: "STANDARD",
    label: "Standard",
    priceLKR: 6000,
    priceUSD: 20,
    seats: 1,
    pageLimit: null,
    aiMonthlyLimit: 120,
    features: [
      "Full access to all tender documents",
      "120 AI Q&A interactions per month",
      "AI Brief: Unlimited",
      "Cover Letter generator",
      "Email + in-app chat support",
    ],
    highlight: "Best for solo bidders",
    supportLevel: "email",
    includesCoverLetter: true,
    includesFolderChat: false,
  },
  PREMIUM: {
    id: "PREMIUM",
    label: "Premium",
    priceLKR: 10000,
    priceUSD: 35,
    seats: 2,
    pageLimit: null,
    aiMonthlyLimit: 300,
    features: [
      "Full access to all tender documents",
      "300 AI Q&A interactions per month",
      "AI Brief: Unlimited",
      "Folder Chat (Beta)",
      "Collaboration (2 seats)",
      "Priority support (24-hour response)",
      "Billing & plan management",
    ],
    highlight: "Most popular for teams",
    isPopular: true,
    supportLevel: "priority",
    includesCoverLetter: true,
    includesFolderChat: true,
  },
  ENTERPRISE: {
    id: "ENTERPRISE",
    label: "Enterprise / Custom",
    seats: 5,
    aiMonthlyLimit: null,
    pageLimit: null,
    features: [
      "Custom seat allocations",
      "Higher AI usage limits & dedicated support",
      "Advanced analytics & team reporting",
      "Private tender hosting or integrations",
      "Custom onboarding & training",
    ],
    supportLevel: "custom",
    highlight: "Contact us for pricing",
  },
};

export function getPlanSpec(id: PlanTier): PlanSpec {
  return PLAN_SPECS[id];
}

export const DEFAULT_TRIAL_DAYS = 7;
