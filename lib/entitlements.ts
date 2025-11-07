export type PlanTier = "FREE" | "FREE_EXPIRED" | "STANDARD" | "PREMIUM" | "ENTERPRISE";

export interface PlanSpec {
  id: PlanTier;
  label: string;
  priceLKR?: number;
  priceUSD?: number;
  seats: number;
  aiMonthlyLimit: number | null;
  pageLimit?: number | null;
  chatPerTender?: number | null;
  briefPerTender?: number | null;
  briefsPerTrial?: number | null;
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
    pageLimit: null,
    chatPerTender: 2,
    briefPerTender: 1,
    briefsPerTrial: 3,
    aiMonthlyLimit: 0, // global monthly cap; FREE uses per-tender caps below
    features: [
      "7-day trial period",
      "3 questions per tender",
      "2 tender brief generations across the platform",
      "No cover letter generation",
      "No company following",
    ],
    highlight: "Try BidWizer with full workspace previews",
    supportLevel: "email",
    includesCoverLetter: false,
    includesFolderChat: false,
  },
  FREE_EXPIRED: {
    id: "FREE_EXPIRED",
    label: "Trial Expired",
    priceLKR: 0,
    priceUSD: 0,
    seats: 0,
    pageLimit: 0,
    chatPerTender: 0,
    briefPerTender: 0,
    briefsPerTrial: 0,
    aiMonthlyLimit: 0,
    features: ["Trial expired. Upgrade to resume access."],
    highlight: "Upgrade required to continue",
    supportLevel: "email",
    includesCoverLetter: false,
    includesFolderChat: false,
    trialDays: 0,
  },
  STANDARD: {
    id: "STANDARD",
    label: "Standard",
    priceLKR: 6000,
    priceUSD: 20,
    seats: 1,
    pageLimit: null,
    chatPerTender: null,
    briefPerTender: null,
    briefsPerTrial: null,
    aiMonthlyLimit: 120,
    features: [
      "120 questions per month",
      "No cover letter generation limits",
      "No tender brief limits",
      "Follow up to 3 companies",
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
    chatPerTender: null,
    briefPerTender: null,
    briefsPerTrial: null,
    aiMonthlyLimit: 300,
    features: [
      "300 questions per month",
      "2 user seats",
      "No tender brief limits",
      "No cover letter generation limits",
      "Follow up to 5 companies",
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
    chatPerTender: null,
    briefPerTender: null,
    briefsPerTrial: null,
    features: [
      "Custom seat allocations",
      "Higher AI usage limits & dedicated support",
      "Advanced analytics & team reporting",
      "Private tender hosting or integrations",
      "Custom onboarding & training",
    ],
    supportLevel: "custom",
    highlight: "Contact us for pricing",
    includesCoverLetter: true,
    includesFolderChat: true,
  },
};

export function getPlanSpec(id: PlanTier): PlanSpec {
  return PLAN_SPECS[id];
}

export const DEFAULT_TRIAL_DAYS = 7;

export function isTrial(planTier: string | null | undefined): boolean {
  if (!planTier) {
    return false;
  }
  return planTier === "FREE" || planTier === "FREE_EXPIRED";
}
