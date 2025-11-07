import 'server-only'

import { randomUUID } from 'node:crypto'

import { endOfMonth, startOfMonth } from 'date-fns'
import type { PrismaClient } from '@prisma/client'

import { prisma } from '@/lib/db'
import { flags } from '@/lib/flags'
import { getRedisClient } from '@/lib/redis'

export async function getOrCreateMonthlyUsage(orgId: string) {
  const start = startOfMonth(new Date())
  const end = endOfMonth(new Date())
  let row = await prisma.aiMonthlyUsage.findUnique({
    where: { organizationId_periodStart: { organizationId: orgId, periodStart: start } },
  })
  if (!row) {
    row = await prisma.aiMonthlyUsage.create({
      data: { organizationId: orgId, periodStart: start, periodEnd: end },
    })
  }
  return row
}

export async function incrementMonthly(orgId: string, kind: 'chat' | 'brief'): Promise<void> {
  if (flags.planEnforcement === false) {
    return
  }
  const start = startOfMonth(new Date())
  const sel = { organizationId_periodStart: { organizationId: orgId, periodStart: start } }
  if (kind === 'chat') {
    await prisma.aiMonthlyUsage.update({
      where: sel,
      data: { usedChats: { increment: 1 } },
    })
    return
  }
  await prisma.aiMonthlyUsage.update({
    where: sel,
    data: { usedBriefs: { increment: 1 } },
  })
}

export async function getOrCreateOrgTenderUsage(orgId: string, tenderId: string) {
  let row = await prisma.orgTenderUsage.findUnique({
    where: { organizationId_tenderId: { organizationId: orgId, tenderId } },
  })
  if (!row) {
    row = await prisma.orgTenderUsage.create({
      data: { organizationId: orgId, tenderId },
    })
  }
  return row
}

export async function getOrCreateOrgTrialUsage(orgId: string) {
  let row = await prisma.orgTrialUsage.findUnique({ where: { orgId } })
  if (!row) {
    row = await prisma.orgTrialUsage.create({ data: { orgId } })
  }
  return row
}

export async function incrementOrgTender(
  orgId: string,
  tenderId: string,
  kind: 'chat' | 'brief',
): Promise<void> {
  if (flags.planEnforcement === false) {
    return
  }
  const where = { organizationId_tenderId: { organizationId: orgId, tenderId } }
  if (kind === 'chat') {
    await prisma.orgTenderUsage.update({
      where,
      data: { usedChats: { increment: 1 } },
    })
    return
  }
  await prisma.orgTenderUsage.update({
    where,
    data: { usedBriefs: { increment: 1 } },
  })
}

export async function incrementOrgTenderChats(orgId: string, tenderId: string): Promise<void> {
  if (flags.planEnforcement === false) {
    return
  }
  await prisma.orgTenderUsage.update({
    where: { organizationId_tenderId: { organizationId: orgId, tenderId } },
    data: { usedChats: { increment: 1 } },
  })
}

const BRIEF_LOCK_PREFIX = 'brief:lock:'
const BRIEF_LOCK_TTL_MS = 5_000

function createPlanError(code: string, message: string): Error {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { PlanError } = require('@/lib/entitlements/enforce') as typeof import('@/lib/entitlements/enforce')
  return new PlanError(code as never, message)
}

async function withBriefLock<T>(
  orgId: string,
  handler: () => Promise<T>,
): Promise<T> {
  const redis = getRedisClient()
  const lockKey = `${BRIEF_LOCK_PREFIX}${orgId}`
  const token = randomUUID()
  const acquired = await (redis as any).set(lockKey, token, 'NX', 'PX', BRIEF_LOCK_TTL_MS)
  if (acquired !== 'OK') {
    throw new Error('Unable to acquire brief credit lock.')
  }

  try {
    const result = await handler()
    return result
  } finally {
    const releaseScript =
      'if redis.call("GET", KEYS[1]) == ARGV[1] then return redis.call("DEL", KEYS[1]) else return 0 end'
    await (redis as any).eval(releaseScript, 1, lockKey, token).catch(() => undefined)
  }
}

interface ConsumeBriefArgs<T> {
  orgId: string
  tenderId: string
  prisma?: PrismaClient
  work: () => Promise<T>
}

export async function consumeBriefCreditAtomically<T>({
  orgId,
  tenderId,
  prisma: prismaClient = prisma,
  work,
}: ConsumeBriefArgs<T>): Promise<T> {
  if (flags.planEnforcement === false) {
    return work()
  }

  return withBriefLock(orgId, async () => {
    await prismaClient.$transaction(async (tx) => {
      const trial = await tx.orgTrialUsage.upsert({
        where: { orgId },
        create: { orgId },
        update: {},
      })

      if (trial.briefCredits <= 0) {
        throw createPlanError('TRIAL_LIMIT', 'No trial brief credits remaining.')
      }

      const tenderUsage = await tx.orgTenderUsage.upsert({
        where: { organizationId_tenderId: { organizationId: orgId, tenderId } },
        create: { organizationId: orgId, tenderId },
        update: {},
      })

      if (tenderUsage.usedBriefs >= 1) {
        throw createPlanError('TENDER_BRIEF_LIMIT', 'Only one trial brief is available per tender.')
      }

      await tx.orgTrialUsage.update({
        where: { orgId },
        data: { briefCredits: { decrement: 1 } },
      })

      await tx.orgTenderUsage.update({
        where: { organizationId_tenderId: { organizationId: orgId, tenderId } },
        data: { usedBriefs: { increment: 1 } },
      })
    })

    try {
      const result = await work()
      return result
    } catch (error) {
      await prismaClient.$transaction(async (tx) => {
        await tx.orgTrialUsage.update({
          where: { orgId },
          data: { briefCredits: { increment: 1 } },
        })

        await tx.orgTenderUsage.update({
          where: { organizationId_tenderId: { organizationId: orgId, tenderId } },
          data: { usedBriefs: { decrement: 1 } },
        })
      })
      throw error
    }
  })
}
