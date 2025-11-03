import 'server-only'

import { endOfMonth, startOfMonth } from 'date-fns'

import { prisma } from '@/lib/db'
import { flags } from '@/lib/flags'

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
