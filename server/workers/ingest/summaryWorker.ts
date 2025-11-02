import { DocStatus, PrismaClient } from '@prisma/client'
import { Worker, type Job } from 'bullmq'

import { flags } from '@/lib/flags'
import { QUEUE_NAMES } from '@/lib/ingest/queues'
import type { SummaryJobPayload } from '@/lib/ingest/types'
import { createRedisConnection } from '@/lib/redis'

const prisma = new PrismaClient()

export function startSummaryWorker(): Worker<SummaryJobPayload> {
  return new Worker<SummaryJobPayload>(
    QUEUE_NAMES.summary,
    async (job) => {
      await processSummaryJob(job)
    },
    {
      connection: createRedisConnection(),
      concurrency: 4,
    },
  )
}

async function processSummaryJob(job: Job<SummaryJobPayload>): Promise<void> {
  const { documentId, tenderId, orgId } = job.data

  try {
    const sections = await prisma.documentSection.findMany({
      where: { documentId },
      orderBy: { pageStart: 'asc' },
      take: 8,
      select: {
        pageStart: true,
        pageEnd: true,
        heading: true,
        text: true,
      },
    })

    const abstract = buildAbstract(sections)
    const summaryPayload = {
      abstract,
      sections: sections.map((section) => ({
        pageStart: section.pageStart,
        pageEnd: section.pageEnd,
        heading: section.heading,
      })),
    }

    await prisma.documentSummary.upsert({
      where: { documentId },
      update: {
        abstract,
        sectionsJson: summaryPayload,
      },
      create: {
        documentId,
        abstract,
        sectionsJson: summaryPayload,
      },
    })

    await prisma.document.update({
      where: { id: documentId },
      data: { status: DocStatus.READY, error: null },
    })

    await updateTenderReadiness(orgId, tenderId)
  } catch (error) {
    await prisma.document.update({
      where: { id: documentId },
      data: {
        status: DocStatus.FAILED,
        error: error instanceof Error ? error.message : 'Summary failed',
      },
    })
    throw error
  }
}

function buildAbstract(
  sections: Array<{ text: string; heading: string | null; pageStart: number; pageEnd: number }>,
): string | null {
  if (sections.length === 0) {
    return null
  }
  const combined = sections
    .slice(0, 3)
    .map((section) => section.text.trim())
    .filter((text) => text.length > 0)
    .join(' ')
  return combined.length > 0 ? combined.slice(0, 800) : null
}

async function updateTenderReadiness(orgId: string, tenderId: string): Promise<void> {
  const [readyDocs, totalDocs] = await Promise.all([
    prisma.document.count({
      where: {
        orgId,
        tenderId,
        status: DocStatus.READY,
      },
    }),
    prisma.document.count({
      where: {
        orgId,
        tenderId,
      },
    }),
  ])

  if (totalDocs === 0) {
    return
  }

  const ratio = readyDocs / totalDocs
  const status =
    readyDocs >= totalDocs
      ? 'READY'
      : ratio >= flags.partialReadyThreshold
      ? 'PARTIALLY_READY'
      : 'PENDING'

  const tender = await prisma.tender.findUnique({
    where: { id: tenderId },
    select: { requirements: true },
  })

  const requirements =
    tender?.requirements && typeof tender.requirements === 'object'
      ? { ...(tender.requirements as Record<string, unknown>) }
      : {}

  requirements.ingestion = {
    status,
    readyDocs,
    totalDocs,
    updatedAt: new Date().toISOString(),
  }

  await prisma.tender.update({
    where: { id: tenderId },
    data: {
      requirements,
    },
  })
}
