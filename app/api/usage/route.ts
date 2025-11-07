import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'

import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getPlanSpec, type PlanTier } from '@/lib/entitlements'

export async function GET(request: NextRequest): Promise<NextResponse> {
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
    },
  })

  if (!organization) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
  }

  const planTier = organization.planTier as PlanTier
  const planSpec = getPlanSpec(planTier)

  const { searchParams } = request.nextUrl
  const tenderId = searchParams.get('tenderId') ?? undefined

  const [trialUsage, tenderUsage] = await Promise.all([
    prisma.orgTrialUsage.findUnique({
      where: { orgId: organizationId },
    }),
    tenderId
      ? prisma.orgTenderUsage.findUnique({
          where: {
            organizationId_tenderId: {
              organizationId,
              tenderId,
            },
          },
          select: {
            usedChats: true,
            usedBriefs: true,
          },
        })
      : Promise.resolve(null),
  ])

  const briefCredits =
    trialUsage?.briefCredits ??
    (planSpec.briefsPerTrial != null ? planSpec.briefsPerTrial : 0)

  const response: {
    org: { briefCredits: number | null }
    tender?: { usedChats: number; usedBriefs: number }
  } = {
    org: { briefCredits: briefCredits },
  }

  if (planSpec.briefsPerTrial == null && !trialUsage) {
    response.org.briefCredits = null
  }

  if (tenderId) {
    response.tender = {
      usedChats: tenderUsage?.usedChats ?? 0,
      usedBriefs: tenderUsage?.usedBriefs ?? 0,
    }
  }

  return NextResponse.json(response)
}
