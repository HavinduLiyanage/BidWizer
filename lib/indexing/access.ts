import { assertOrgAccess, db } from '@/lib/db'

export interface TenderAccessResult {
  tenderId: string
  organizationId: string
}

export async function ensureTenderAccess(
  userId: string,
  tenderId: string,
): Promise<TenderAccessResult> {
  const tender = await db.tender.findUnique({
    where: { id: tenderId },
    select: { id: true, organizationId: true },
  })

  if (!tender) {
    throw new Error('TenderNotFound')
  }

  await assertOrgAccess(userId, tender.organizationId)
  return { tenderId: tender.id, organizationId: tender.organizationId }
}
