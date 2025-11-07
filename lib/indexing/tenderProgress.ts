import { DocStatus, Prisma } from '@prisma/client'

import { prisma } from '@/lib/db'

function isJsonObject(value: unknown): value is Prisma.JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

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

  const existing: Prisma.JsonObject = isJsonObject(tender.requirements)
    ? { ...(tender.requirements as Prisma.JsonObject) }
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
