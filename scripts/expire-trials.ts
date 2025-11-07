/**
 * Manual run: npm run cron:expire-trials
 * Schedule: hourly in staging/prod (via CI or platform cron).
 * Idempotent: safe to run multiple times.
 */

import { prisma } from '@/lib/db'

type OrganizationClient = {
  findMany: (args: {
    where: {
      planTier: string
      planExpiresAt: { lt: Date }
    }
    select: { id: true }
  }) => Promise<Array<{ id: string }>>
  updateMany: (args: {
    where: {
      id: { in: string[] }
      planTier: string
      planExpiresAt: { lt: Date }
    }
    data: {
      planTier: string
      planExpiresAt: null
    }
  }) => Promise<{ count: number }>
}

export type ExpireTrialsPrisma = {
  organization: OrganizationClient
}

interface ExpireTrialsResult {
  event: 'trial_expired_batch'
  count: number
  orgIds: string[]
}

export async function runExpireTrials(
  client: ExpireTrialsPrisma = prisma as unknown as ExpireTrialsPrisma,
): Promise<ExpireTrialsResult> {
  const now = new Date()

  const candidates = await client.organization.findMany({
    where: {
      planTier: 'FREE',
      planExpiresAt: {
        lt: now,
      },
    },
    select: { id: true },
  })

  if (candidates.length === 0) {
    const summary: ExpireTrialsResult = {
      event: 'trial_expired_batch',
      count: 0,
      orgIds: [],
    }
    console.info(JSON.stringify(summary))
    return summary
  }

  const orgIds = candidates.map((org) => org.id)

  const updateResult = await client.organization.updateMany({
    where: {
      id: { in: orgIds },
      planTier: 'FREE',
      planExpiresAt: { lt: now },
    },
    data: {
      planTier: 'FREE_EXPIRED',
      planExpiresAt: null,
    },
  })

  const summary: ExpireTrialsResult = {
    event: 'trial_expired_batch',
    count: updateResult.count,
    orgIds,
  }
  console.info(JSON.stringify(summary))
  return summary
}

async function main(): Promise<void> {
  await runExpireTrials()
}

if (require.main === module) {
  void main()
    .then(() => {
      process.exit(0)
    })
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.message : 'Unknown error'
      const stack = error instanceof Error ? error.stack : undefined
      console.error(
        JSON.stringify({
          event: 'trial_expired_batch_error',
          message,
          stack,
        }),
      )
      process.exit(1)
    })
}
