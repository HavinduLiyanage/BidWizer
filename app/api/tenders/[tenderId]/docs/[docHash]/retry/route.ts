import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { DocStatus, OrgMemberRole } from '@prisma/client'
import { z } from 'zod'

import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { computeDocumentPriority } from '@/lib/ingest/priority'
import { buildDocumentStoragePaths } from '@/lib/ingest/paths'
import {
  enqueueChunkJob,
  enqueueEmbedJob,
  enqueueExtractJob,
  enqueueSummaryJob,
} from '@/lib/ingest/queues'
import { ensureTenderAccess } from '@/lib/indexing/access'
import { log } from '@/lib/log'
import { exists, getSupabaseIndexBucketName } from '@/lib/storage'

const paramsSchema = z.object({
  tenderId: z.string().min(1),
  docHash: z.string().min(1),
})

type RetryStage = 'extract' | 'chunk' | 'embed' | 'summary' | null

export async function POST(
  request: NextRequest,
  context: { params: { tenderId: string; docHash: string } },
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { tenderId, docHash } = paramsSchema.parse(context.params)

    const access = await ensureTenderAccess(session.user.id, tenderId)

    const membership = await db.orgMember.findUnique({
      where: {
        userId_organizationId: {
          userId: session.user.id,
          organizationId: access.organizationId,
        },
      },
      select: { role: true },
    })

    if (membership?.role !== OrgMemberRole.ADMIN) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const document = await db.document.findFirst({
      where: { tenderId, docHash },
      select: {
        id: true,
        orgId: true,
        tenderId: true,
        docHash: true,
        status: true,
        error: true,
        title: true,
        bytes: true,
        pages: true,
      },
    })

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    if (document.status !== DocStatus.FAILED) {
      return NextResponse.json(
        { error: `Retry available only for FAILED documents (current: ${document.status})` },
        { status: 409 },
      )
    }

    const extractedFile = await db.extractedFile.findUnique({
      where: { docHash },
      select: {
        uploadId: true,
        storageKey: true,
      },
    })

    const storagePaths = buildDocumentStoragePaths({
      orgId: document.orgId,
      tenderId: document.tenderId,
      docHash: document.docHash,
    })

    const storage = {
      ...storagePaths,
      rawKey:
        extractedFile?.storageKey && extractedFile.storageKey.length > 0
          ? extractedFile.storageKey
          : storagePaths.rawKey,
      bucket: getSupabaseIndexBucketName(),
    }

    const [extractedExists, chunksExists, summaryExists, sectionCount] = await Promise.all([
      exists(storage.extractedKey),
      exists(storage.chunksKey),
      exists(storage.summaryKey),
      db.documentSection.count({ where: { documentId: document.id } }),
    ])

    let stage: RetryStage = null
    if (!extractedExists) {
      stage = 'extract'
    } else if (!chunksExists) {
      stage = 'chunk'
    } else if (sectionCount === 0) {
      stage = 'embed'
    } else if (!summaryExists) {
      stage = 'summary'
    }

    if (!stage) {
      return NextResponse.json(
        {
          queued: false,
          message: 'All artifacts already exist; nothing to retry.',
          status: document.status,
        },
        { status: 200 },
      )
    }

    const uploadId = extractedFile?.uploadId ?? document.id
    const priority = computeDocumentPriority(document.title ?? document.docHash, document.bytes ?? 0)
    const basePayload = {
      orgId: document.orgId,
      tenderId: document.tenderId,
      documentId: document.id,
      docHash: document.docHash,
      storage,
      uploadId,
      filename: document.title ?? 'document.pdf',
    }

    switch (stage) {
      case 'extract': {
        await enqueueExtractJob(basePayload, { priority })
        break
      }
      case 'chunk': {
        await enqueueChunkJob(
          {
            ...basePayload,
            extractedPages: document.pages ?? 0,
          },
          { priority },
        )
        break
      }
      case 'embed': {
        await enqueueEmbedJob(
          {
            ...basePayload,
            chunkCount: sectionCount,
          },
          { priority },
        )
        break
      }
      case 'summary': {
        await enqueueSummaryJob(
          {
            ...basePayload,
            chunkCount: sectionCount,
          },
          { priority },
        )
        break
      }
    }

    log('api:retry', 'queued', { docHash, tenderId, stage })

    return NextResponse.json({
      queued: true,
      stage,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 },
      )
    }

    const message = error instanceof Error ? error.message : String(error)
    log('api:retry', 'error', { error: message })
    return NextResponse.json({ error: 'Failed to retry document indexing' }, { status: 500 })
  }
}
