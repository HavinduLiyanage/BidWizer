#!/usr/bin/env tsx

import { PrismaClient, type PlanTier } from '@prisma/client'

import { ensureActiveSubscriptionForOrg } from '@/lib/subscription'

const prisma = new PrismaClient()

async function main(): Promise<void> {
  const organizations = await prisma.organization.findMany({
    select: { id: true, planTier: true },
  })

  let processed = 0

  for (const org of organizations) {
    try {
      await ensureActiveSubscriptionForOrg(org.id, {
        preferredTier: org.planTier as PlanTier,
      })
      processed += 1
    } catch (error) {
      console.error(`[bootstrap-subscriptions] Failed for org ${org.id}:`, error)
    }
  }

  console.log(`[bootstrap-subscriptions] Ensured subscriptions for ${processed} organizations`)
}

if (require.main === module) {
  main()
    .catch((error) => {
      console.error('[bootstrap-subscriptions] Unhandled error:', error)
      process.exitCode = 1
    })
    .finally(async () => {
      await prisma.$disconnect()
    })
}
