import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'

import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getPlanSpec, type PlanTier } from '@/lib/entitlements'

export async function GET(): Promise<NextResponse> {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const organizationId = session.user.organizationId
  if (!organizationId) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
  }

  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      planTier: true,
      planExpiresAt: true,
    },
  })

  if (!organization) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
  }

  const planTier = organization.planTier as PlanTier
  const planSpec = getPlanSpec(planTier)

  return NextResponse.json({
    planTier,
    trialEndsAt: organization.planExpiresAt ? organization.planExpiresAt.toISOString() : null,
    limits: {
      pageLimit: planSpec.pageLimit ?? null,
      chatPerTender: planSpec.chatPerTender ?? null,
      briefPerTender: planSpec.briefPerTender ?? null,
      briefsPerTrial: planSpec.briefsPerTrial ?? null,
      includesCoverLetter: planSpec.includesCoverLetter ?? false,
    },
  })
}
