import { DocStatus, PrismaClient } from '@prisma/client'
import { Worker, type Job } from 'bullmq'

import { log } from '@/lib/log'
import { QUEUE_NAMES } from '@/lib/ingest/queues'
import type { SummaryJobPayload } from '@/lib/ingest/types'
import { exists, putJson } from '@/lib/storage'
import { createRedisConnection, withLock } from '@/lib/redis'
import { recomputeTenderProgress } from '@/lib/indexing/tenderProgress'

const prisma = new PrismaClient()
const LOCK_TTL_MS = 60_000
const EMPTY_TEXT_ERROR = 'no text extracted; probably scanned PDF'

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
  const { documentId, tenderId, orgId, docHash, storage } = job.data
  const baseMeta = {
    jobId: job.id ?? null,
    orgId,
    tenderId,
    documentId,
    docHash,
  }

  const lockKey = `lock:${docHash}:summary`
  const result = await withLock(lockKey, LOCK_TTL_MS, async () => {
    try {
      log('ingest:summary', 'starting', baseMeta)

      const summaryExists = await exists(storage.summaryKey)
      if (summaryExists) {
        const sectionCount = await prisma.documentSection.count({ where: { documentId } })
        if (sectionCount === 0) {
          await markFailed(documentId, tenderId, EMPTY_TEXT_ERROR)
          log('ingest:summary', 'artifact-empty', { ...baseMeta, sectionCount })
          return
        }

        await prisma.document.update({
          where: { id: documentId },
          data: { status: DocStatus.READY, error: null },
        })
        await recomputeTenderProgress(tenderId)
        log('ingest:summary', 'artifact-exists', { ...baseMeta, sectionCount })
        return
      }

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

      if (sections.length === 0) {
        await markFailed(documentId, tenderId, EMPTY_TEXT_ERROR)
        log('ingest:summary', 'no-sections', baseMeta)
        return
      }

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

      await putJson(storage.summaryKey, summaryPayload)

      await prisma.document.update({
        where: { id: documentId },
        data: { status: DocStatus.READY, error: null },
      })

      await recomputeTenderProgress(tenderId)

      log('ingest:summary', 'completed', { ...baseMeta, sections: sections.length })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Summary failed'
      await markFailed(documentId, tenderId, message)
      log('ingest:summary', 'error', { ...baseMeta, error: message })
      throw error
    }
  })

  if (result === null) {
    log('ingest:summary', 'lock-skipped', baseMeta)
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

async function markFailed(documentId: string, tenderId: string, reason: string): Promise<void> {
  await prisma.document.update({
    where: { id: documentId },
    data: {
      status: DocStatus.FAILED,
      error: reason.slice(0, 500),
    },
  })
  await recomputeTenderProgress(tenderId)
}
