import 'server-only'

import { prisma } from '@/lib/db'
import { PLAN_SPECS, type PlanTier } from '@/lib/entitlements'
import { getOrCreateMonthlyUsage, getOrCreateOrgTenderUsage } from '@/lib/usage'
import { flags } from '@/lib/flags'
import { ensureActiveSubscriptionForOrg } from '@/lib/subscription'

export function planLimitsEnabled(): boolean {
  return flags.planEnforcement !== false
}

export class PlanError extends Error {
  code: 'PAGE_LOCKED' | 'PLAN_LIMIT_REACHED' | 'UPGRADE_REQUIRED' | 'TRIAL_EXPIRED'
  http = 403

  constructor(code: PlanError['code'], msg?: string) {
    super(msg ?? code)
    this.code = code
  }
}

type Feature = 'pageView' | 'chat' | 'brief' | 'coverLetter' | 'folderChat'

export async function enforceAccess(params: {
  orgId: string
  feature: Feature
  page?: number
  tenderId?: string
  userId?: string
}): Promise<PlanTier> {
  const org = await prisma.organization.findUnique({ where: { id: params.orgId } })
  if (!org) {
    throw new PlanError('UPGRADE_REQUIRED', 'Org not found')
  }
  const tier = await ensureActiveSubscriptionForOrg(org.id, {
    preferredTier: org.planTier as PlanTier,
    userId: params.userId,
  })
  const spec = PLAN_SPECS[tier]

  if (!planLimitsEnabled()) {
    console.log('[plan] enforcement disabled', {
      orgId: params.orgId,
      feature: params.feature,
      tier,
    })
    return tier
  }

  if (tier === 'FREE' && org.planExpiresAt && org.planExpiresAt < new Date()) {
    throw new PlanError('TRIAL_EXPIRED', 'Trial ended. Upgrade to continue.')
  }

  switch (params.feature) {
    case 'pageView': {
      if (spec.pageLimit && params.page && params.page > spec.pageLimit) {
        throw new PlanError('PAGE_LOCKED', 'Upgrade to view full document.')
      }
      break
    }
    case 'coverLetter': {
      if (!spec?.includesCoverLetter) {
        throw new PlanError('UPGRADE_REQUIRED', 'Cover letter requires Standard or Premium.')
      }
      break
    }
    case 'folderChat': {
      if (!spec?.includesFolderChat) {
        throw new PlanError('UPGRADE_REQUIRED', 'Folder chat requires Premium.')
      }
      break
    }
    case 'chat':
    case 'brief': {
      if (tier === 'FREE') {
        if (!params.tenderId) {
          throw new Error('tenderId required for FREE usage checks')
        }
        const usage = await getOrCreateOrgTenderUsage(params.orgId, params.tenderId)
        if (params.feature === 'chat' && usage.usedChats >= 2) {
          throw new PlanError('PLAN_LIMIT_REACHED', 'Free plan chat limit reached')
        }
        if (params.feature === 'brief' && usage.usedBriefs >= 1) {
          throw new PlanError('PLAN_LIMIT_REACHED', 'Free plan brief limit reached')
        }
        break
      }

      if (spec.aiMonthlyLimit != null) {
        const monthly = await getOrCreateMonthlyUsage(params.orgId)
        const used = params.feature === 'chat' ? monthly.usedChats : monthly.usedBriefs
        const limit = params.feature === 'chat' ? spec.aiMonthlyLimit : null
        if (limit != null && used >= limit) {
          throw new PlanError('PLAN_LIMIT_REACHED', 'Monthly limit reached')
        }
      }
      break
    }
    default:
      break
  }

  return tier
}
