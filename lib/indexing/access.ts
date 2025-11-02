import 'server-only'

import { OrganizationType, TenderStatus } from '@prisma/client'

import { assertOrgAccess, db } from '@/lib/db'

export interface TenderAccessResult {
  tenderId: string
  organizationId: string
}

export async function ensureTenderAccess(
  userId: string,
  tenderId: string,
  options: { allowPublishedRead?: boolean } = {},
): Promise<TenderAccessResult> {
  const { allowPublishedRead = true } = options

  const tender = await db.tender.findUnique({
    where: { id: tenderId },
    select: { id: true, organizationId: true, status: true },
  })

  if (!tender) {
    throw new Error('TenderNotFound')
  }

  try {
    await assertOrgAccess(userId, tender.organizationId)
    return { tenderId: tender.id, organizationId: tender.organizationId }
  } catch (error) {
    if (
      allowPublishedRead &&
      tender.status === TenderStatus.PUBLISHED
    ) {
      const membership = await db.orgMember.findFirst({
        where: { userId },
        select: { organization: { select: { type: true } } },
      })

      if (membership?.organization?.type === OrganizationType.BIDDER) {
        return { tenderId: tender.id, organizationId: tender.organizationId }
      }
    }

    throw error
  }
}
