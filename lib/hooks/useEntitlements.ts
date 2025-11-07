import { useMemo } from 'react'
import useSWR from 'swr'

import { isTrial, type PlanTier } from '@/lib/entitlements'

interface EntitlementLimits {
  pageLimit: number | null
  chatPerTender: number | null
  briefPerTender: number | null
  briefsPerTrial: number | null
  includesCoverLetter: boolean
}

export interface EntitlementsResponse {
  planTier: PlanTier
  trialEndsAt: string | null
  limits: EntitlementLimits
}

type FetchError = Error & { status?: number }

async function fetcher(url: string): Promise<EntitlementsResponse> {
  const response = await fetch(url, { cache: 'no-store' })

  if (!response.ok) {
    const error = new Error('Failed to load entitlements') as FetchError
    error.status = response.status
    throw error
  }

  return response.json()
}

export function useEntitlements() {
  const {
    data,
    error,
    isLoading,
    mutate,
  } = useSWR<EntitlementsResponse>('/api/me/entitlements', fetcher, {
    revalidateOnFocus: false,
  })

  const derived = useMemo(() => {
    if (!data) {
      return {
        isTrial: false,
        isExpired: false,
        daysRemaining: null as number | null,
      }
    }

    const trialEndsAt = data.trialEndsAt ? new Date(data.trialEndsAt) : null
    const now = new Date()

    const expiredByDate =
      trialEndsAt != null && Number.isFinite(trialEndsAt.getTime())
        ? trialEndsAt.getTime() < now.getTime()
        : false

    const expiredTier = data.planTier === 'FREE_EXPIRED'
    const isTrialPlan = isTrial(data.planTier)
    const isExpired = expiredTier || (isTrialPlan && expiredByDate)

    let daysRemaining: number | null = null
    if (trialEndsAt && Number.isFinite(trialEndsAt.getTime())) {
      const diffMs = trialEndsAt.getTime() - now.getTime()
      daysRemaining = diffMs <= 0 ? 0 : Math.ceil(diffMs / (1000 * 60 * 60 * 24))
    }

    return {
      isTrial: isTrialPlan && !isExpired,
      isExpired,
      daysRemaining,
    }
  }, [data])

  return {
    data,
    isLoading,
    error,
    mutate,
    ...derived,
  }
}
