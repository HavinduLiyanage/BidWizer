import { addMonths } from 'date-fns'
import {
  OrgMemberRole,
  PlanInterval,
  type PlanTier,
  Prisma,
  SubscriptionStatus,
} from '@prisma/client'

import { prisma } from '@/lib/db'
import { PLAN_SPECS } from '@/lib/entitlements'
import { flags } from '@/lib/flags'

const DEMO_PLAN_NAME = 'Unlimited Demo Plan'
const FAR_FUTURE = new Date('2100-01-01T00:00:00Z')

interface EnsureOptions {
  preferredTier?: PlanTier | null
  userId?: string
}

export async function ensureActiveSubscriptionForOrg(
  organizationId: string,
  options: EnsureOptions = {},
): Promise<PlanTier> {
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { planTier: true },
  })

  if (!organization) {
    throw new Error(`Organization ${organizationId} not found`)
  }

  let effectiveTier = options.preferredTier ?? (organization.planTier as PlanTier)

  if (flags.planEnforcement === false) {
    if (effectiveTier !== 'ENTERPRISE') {
      await prisma.organization.update({
        where: { id: organizationId },
        data: { planTier: 'ENTERPRISE', planExpiresAt: FAR_FUTURE },
      })
      effectiveTier = 'ENTERPRISE'
    }
  }

  const planSpec = PLAN_SPECS[effectiveTier] ?? PLAN_SPECS.FREE
  const planName = flags.planEnforcement === false ? DEMO_PLAN_NAME : `${planSpec.label} Plan`
  const priceValue = planSpec.priceLKR ?? planSpec.priceUSD ?? 0

  const plan = await prisma.plan.upsert({
    where: {
      organizationId_name: {
        organizationId,
        name: planName,
      },
    },
    update: {
      price: new Prisma.Decimal(priceValue),
      interval: PlanInterval.MONTHLY,
      features: planSpec.features,
      description:
        flags.planEnforcement === false
          ? 'Unlimited access plan for demos and testing'
          : planSpec.label,
      isActive: true,
    },
    create: {
      organizationId,
      name: planName,
      description:
        flags.planEnforcement === false
          ? 'Unlimited access plan for demos and testing'
          : planSpec.label,
      price: new Prisma.Decimal(priceValue),
      interval: PlanInterval.MONTHLY,
      features: planSpec.features,
      isActive: true,
    },
  })

  const activeSubscription = await prisma.subscription.findFirst({
      where: {
        organizationId,
        status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING] },
      },
    orderBy: { createdAt: 'desc' },
  })

  if (!activeSubscription) {
    let subscriberUserId = options.userId

    if (!subscriberUserId) {
      const adminMember = await prisma.orgMember.findFirst({
        where: { organizationId, role: OrgMemberRole.ADMIN },
        select: { userId: true },
      })
      subscriberUserId =
        adminMember?.userId ??
        (await prisma.orgMember.findFirst({
          where: { organizationId },
          select: { userId: true },
        }))?.userId ??
        undefined
    }

    if (!subscriberUserId) {
      throw new Error(`Unable to determine subscriber user for organization ${organizationId}`)
    }

    const now = new Date()
    const currentPeriodEnd =
      flags.planEnforcement === false ? FAR_FUTURE : addMonths(now, 1)

    await prisma.subscription.create({
      data: {
        organizationId,
        userId: subscriberUserId,
        planId: plan.id,
        status: SubscriptionStatus.ACTIVE,
        currentPeriodStart: now,
        currentPeriodEnd,
        cancelAtPeriodEnd: false,
      },
    })
  }

  return effectiveTier
}
