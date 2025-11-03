import { DocStatus } from '@prisma/client'

import { prisma } from '@/lib/db'

export async function recomputeTenderProgress(tenderId: string): Promise<void> {
  const [totalDocs, readyDocs] = await Promise.all([
    prisma.document.count({
      where: { tenderId },
    }),
    prisma.document.count({
      where: { tenderId, status: DocStatus.READY },
    }),
  ])

  const tender = await prisma.tender.findUnique({
    where: { id: tenderId },
    select: { requirements: true },
  })

  if (!tender) {
    return
  }

  const existing =
    tender.requirements && typeof tender.requirements === 'object'
      ? { ...(tender.requirements as Record<string, unknown>) }
      : {}

  const readiness =
    totalDocs === 0
      ? 'PENDING'
      : readyDocs >= totalDocs
      ? 'READY'
      : readyDocs > 0
      ? 'PARTIAL'
      : 'PENDING'

  existing.ingestion = {
    status: readiness,
    readyDocs,
    totalDocs,
    updatedAt: new Date().toISOString(),
  }

  await prisma.tender.update({
    where: { id: tenderId },
    data: { requirements: existing },
  })
}
