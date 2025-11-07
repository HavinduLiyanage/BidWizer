import 'server-only'

import { prisma } from '@/lib/db'
import { getPlanSpec, isTrial, type PlanTier } from '@/lib/entitlements'
import {
  getOrCreateMonthlyUsage,
  getOrCreateOrgTenderUsage,
  getOrCreateOrgTrialUsage,
} from '@/lib/usage'
import { flags } from '@/lib/flags'
import { ensureActiveSubscriptionForOrg } from '@/lib/subscription'
import { log } from '@/lib/log'

export function planLimitsEnabled(): boolean {
  return flags.planEnforcement !== false
}

type Feature = 'pageView' | 'chat' | 'brief' | 'coverLetter' | 'folderChat'

export class PlanError extends Error {
  code:
    | 'PAGE_LOCKED'
    | 'PLAN_LIMIT_REACHED'
    | 'UPGRADE_REQUIRED'
    | 'TRIAL_EXPIRED'
    | 'PREVIEW_LIMIT'
    | 'TRIAL_LIMIT'
    | 'TENDER_BRIEF_LIMIT'
    | 'FEATURE_NOT_AVAILABLE'
  http = 403

  constructor(code: PlanError['code'], msg?: string) {
    super(msg ?? code)
    this.code = code
  }
}

interface EnforceAccessParams {
  orgId: string
  feature: Feature
  pageNumber?: number
  tenderId?: string
  documentId?: string
  userId?: string
}

interface EnforceActions {
  incrementChats?: boolean
  incrementBriefs?: boolean
  debitTrialBriefCredit?: boolean
}

export interface EnforceAccessResult {
  ok: true
  plan: PlanTier
  actions: EnforceActions
}

interface GateLogMeta extends Record<string, unknown> {
  event: 'gate_check'
  feature: Feature
  orgId: string
  tenderId: string | null
  documentId: string | null
  pageNumber: number | null
  result: 'allow' | 'deny'
  reason?: string
  planTier?: PlanTier
}

function emitGateLog(meta: GateLogMeta): void {
  log('entitlements.enforce', 'gate_check', meta)
}

export async function enforceAccess(params: EnforceAccessParams): Promise<EnforceAccessResult> {
  const org = await prisma.organization.findUnique({ where: { id: params.orgId } })
  if (!org) {
    throw new PlanError('UPGRADE_REQUIRED', 'Org not found')
  }

  const baseLog: Omit<GateLogMeta, 'result'> = {
    event: 'gate_check',
    feature: params.feature,
    orgId: params.orgId,
    tenderId: params.tenderId ?? null,
    documentId: params.documentId ?? null,
    pageNumber: params.pageNumber ?? null,
  }

  const emit = (details: Pick<GateLogMeta, 'result' | 'reason' | 'planTier'>) => {
    emitGateLog({ ...baseLog, ...details } as GateLogMeta)
  }

  const now = new Date()
  if (
    org.planTier === 'FREE_EXPIRED' ||
    (org.planTier === 'FREE' && org.planExpiresAt && org.planExpiresAt < now)
  ) {
    emit({ result: 'deny', reason: 'trial_expired' })
    throw new PlanError('TRIAL_EXPIRED', 'Trial ended. Upgrade to continue.')
  }

  const plan = await ensureActiveSubscriptionForOrg(org.id, {
    preferredTier: org.planTier as PlanTier,
    userId: params.userId,
  })

  if (!planLimitsEnabled()) {
    emit({ result: 'allow', reason: 'enforcement_disabled', planTier: plan })
    return { ok: true, plan, actions: {} }
  }

  const spec = getPlanSpec(plan)
  const actions: EnforceActions = {}

  try {
    switch (params.feature) {
      case 'pageView': {
        const limit = spec.pageLimit
        const page = params.pageNumber ?? 1
        if (limit != null && limit > 0 && page > limit) {
          emit({ result: 'deny', reason: 'preview_limit', planTier: plan })
          throw new PlanError('PREVIEW_LIMIT', 'Preview limit reached. Upgrade to continue.')
        }
        break
      }
      case 'coverLetter': {
        if (!spec.includesCoverLetter || plan === 'FREE' || plan === 'FREE_EXPIRED') {
          emit({ result: 'deny', reason: 'feature_not_available', planTier: plan })
          throw new PlanError('FEATURE_NOT_AVAILABLE', 'Cover letters require a paid plan.')
        }
        break
      }
      case 'chat': {
        if (!params.tenderId) {
          throw new Error('tenderId required for chat access checks')
        }

        if (plan === 'FREE') {
          const usage = await getOrCreateOrgTenderUsage(params.orgId, params.tenderId)
          const limit = spec.chatPerTender ?? 0
          if (limit >= 0 && usage.usedChats >= limit) {
            emit({ result: 'deny', reason: 'trial_limit', planTier: plan })
            throw new PlanError('TRIAL_LIMIT', 'Trial chat limit reached for this tender.')
          }
          actions.incrementChats = true
        } else if (spec.aiMonthlyLimit != null) {
          const monthly = await getOrCreateMonthlyUsage(params.orgId)
          if (monthly.usedChats >= spec.aiMonthlyLimit) {
            emit({ result: 'deny', reason: 'plan_limit_reached', planTier: plan })
            throw new PlanError('PLAN_LIMIT_REACHED', 'Monthly chat limit reached.')
          }
        }
        break
      }
      case 'brief': {
        if (!params.tenderId) {
          throw new Error('tenderId required for brief access checks')
        }

        if (plan === 'FREE') {
          const [trialUsage, tenderUsage] = await Promise.all([
            getOrCreateOrgTrialUsage(params.orgId),
            getOrCreateOrgTenderUsage(params.orgId, params.tenderId),
          ])

          if ((spec.briefsPerTrial ?? 0) <= 0 || trialUsage.briefCredits <= 0) {
            emit({ result: 'deny', reason: 'trial_limit', planTier: plan })
            throw new PlanError('TRIAL_LIMIT', 'No trial brief credits remaining.')
          }

          const tenderLimit = spec.briefPerTender ?? 0
          if (tenderLimit >= 0 && tenderUsage.usedBriefs >= tenderLimit) {
            emit({
              result: 'deny',
              reason: 'tender_brief_limit',
              planTier: plan,
            })
            throw new PlanError(
              'TENDER_BRIEF_LIMIT',
              'Only one trial brief is available per tender.',
            )
          }

          actions.debitTrialBriefCredit = true
        } else {
          actions.incrementBriefs = true
          if (spec.aiMonthlyLimit != null) {
            const monthly = await getOrCreateMonthlyUsage(params.orgId)
            if (monthly.usedBriefs >= spec.aiMonthlyLimit) {
              emit({
                result: 'deny',
                reason: 'plan_limit_reached',
                planTier: plan,
              })
              throw new PlanError('PLAN_LIMIT_REACHED', 'Monthly brief limit reached.')
            }
          }
        }
        break
      }
      case 'folderChat': {
        if (!spec.includesFolderChat) {
          emit({ result: 'deny', reason: 'feature_not_available', planTier: plan })
          throw new PlanError('UPGRADE_REQUIRED', 'Folder chat requires Premium.')
        }
        break
      }
      default:
        break
    }
  } catch (error) {
    if (error instanceof PlanError) {
      throw error
    }
    throw error
  }

  emit({ result: 'allow', reason: plan, planTier: plan })
  return { ok: true, plan, actions }
}
