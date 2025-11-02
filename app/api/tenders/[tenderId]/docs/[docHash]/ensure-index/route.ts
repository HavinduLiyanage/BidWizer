import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { IndexArtifactStatus, UploadKind } from '@prisma/client'
import { z } from 'zod'

import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { INDEX_ARTIFACT_VERSION } from '@/lib/indexing'
import { ensureTenderAccess } from '@/lib/indexing/access'
import { indexingQueue, INDEX_QUEUE } from '@/lib/queue'
import {
  buildProgressSnapshot,
  getRedisClient,
  writeIndexProgress,
} from '@/lib/redis'

const paramsSchema = z.object({
  tenderId: z.string().min(1),
  docHash: z.string().min(1),
})

const bodySchema = z
  .object({
    forceRebuild: z.boolean().optional(),
  })
  .default({})

type JsonRecord = Record<string, unknown>

function resolveApproxBytes(metadata: JsonRecord | null, fallbackSize?: number | null): number {
  if (metadata && typeof metadata.size === 'number' && Number.isFinite(metadata.size)) {
    return Math.max(0, metadata.size)
  }
  if (typeof fallbackSize === 'number' && Number.isFinite(fallbackSize)) {
    return Math.max(0, fallbackSize)
  }
  return 0
}

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
    console.log('[ensure-index] per-file request', { tenderId, docHash })

    const rawBody =
      request.headers.get('content-type')?.includes('application/json') === true
        ? await request.json().catch(() => ({}))
        : {}
    const body = bodySchema.parse(rawBody ?? {})

    let tenderAccess
    try {
      tenderAccess = await ensureTenderAccess(session.user.id, tenderId)
    } catch (error) {
      if (error instanceof Error && error.message === 'TenderNotFound') {
        return NextResponse.json({ error: 'Tender not found' }, { status: 404 })
      }
      throw error
    }

    const extractedFile = await db.extractedFile.findUnique({
      where: { docHash },
      select: {
        id: true,
        tenderId: true,
        uploadId: true,
        docHash: true,
        metadata: true,
        storageBucket: true,
        storageKey: true,
        upload: {
          select: {
            id: true,
            storageKey: true,
            size: true,
            tenderId: true,
            kind: true,
            mimeType: true,
          },
        },
      },
    })

    if (!extractedFile || extractedFile.tenderId !== tenderId) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    if (!extractedFile.storageKey || !extractedFile.storageBucket) {
      return NextResponse.json(
        { error: 'Document is missing storage metadata' },
        { status: 422 },
      )
    }

    const metadata =
      extractedFile.metadata && typeof extractedFile.metadata === 'object'
        ? (extractedFile.metadata as JsonRecord)
        : null
    const approxBytes = resolveApproxBytes(metadata, extractedFile.upload?.size ?? null)
    const uploadKind = extractedFile.upload?.kind ?? null
    const uploadMime =
      typeof extractedFile.upload?.mimeType === 'string'
        ? extractedFile.upload.mimeType.toLowerCase()
        : null
    const metadataKind =
      typeof metadata?.kind === 'string' ? String(metadata.kind).toLowerCase() : null
    const metadataMime =
      typeof metadata?.mimeType === 'string' ? String(metadata.mimeType).toLowerCase() : null
    const isImageUpload =
      uploadKind === UploadKind.image ||
      metadataKind === UploadKind.image ||
      metadataKind === 'image' ||
      (uploadMime?.startsWith('image/') ?? false) ||
      (metadataMime?.startsWith('image/') ?? false)

    const existingArtifact = await db.indexArtifact.findUnique({
      where: { docHash },
    })
    const redis = getRedisClient()

    if (isImageUpload) {
      const artifactVersion = existingArtifact?.version ?? INDEX_ARTIFACT_VERSION
      const storageKey = extractedFile.storageKey

      let artifact = existingArtifact
      if (!artifact) {
        artifact = await db.indexArtifact.create({
          data: {
            docHash,
            orgId: tenderAccess.organizationId,
            tenderId: tenderAccess.tenderId,
            version: artifactVersion,
            status: IndexArtifactStatus.READY,
            storageKey,
            totalChunks: 0,
            totalPages: 0,
            bytesApprox: approxBytes,
          },
        })
        console.log('[ensure-index] created READY artifact for image upload', {
          artifactId: artifact.id,
          docHash,
        })
      } else if (
        artifact.status !== IndexArtifactStatus.READY ||
        artifact.bytesApprox !== approxBytes ||
        artifact.storageKey !== storageKey ||
        artifact.totalChunks !== 0 ||
        artifact.totalPages !== 0 ||
        artifact.version !== artifactVersion
      ) {
        artifact = await db.indexArtifact.update({
          where: { id: artifact.id },
          data: {
            status: IndexArtifactStatus.READY,
            version: artifactVersion,
            storageKey,
            totalChunks: 0,
            totalPages: 0,
            bytesApprox: approxBytes,
          },
        })
        console.log('[ensure-index] reset artifact to READY for image upload', {
          artifactId: artifact.id,
          docHash,
        })
      }

      await writeIndexProgress(
        redis,
        docHash,
        buildProgressSnapshot({
          docHash,
          phase: 'ready',
          percent: 100,
          batchesDone: 1,
          totalBatches: 1,
          message: 'Image uploads are stored but skipped for AI indexing',
        }),
      )

      return NextResponse.json({
        status: 'READY',
        docHash,
        fileId: extractedFile.id,
        artifact: {
          id: artifact.id,
          storageKey: artifact.storageKey,
          updatedAt: artifact.updatedAt.toISOString(),
          version: artifact.version,
          totalChunks: artifact.totalChunks,
        },
      })
    }

    if (existingArtifact && existingArtifact.status === IndexArtifactStatus.READY && !body.forceRebuild) {
      console.log('[ensure-index] already READY', {
        docHash,
        artifactId: existingArtifact.id,
      })
      return NextResponse.json({
        status: 'READY',
        docHash,
        fileId: extractedFile.id,
        artifact: {
          id: existingArtifact.id,
          storageKey: existingArtifact.storageKey,
          updatedAt: existingArtifact.updatedAt.toISOString(),
          version: existingArtifact.version,
          totalChunks: existingArtifact.totalChunks,
        },
      })
    }

    const artifactVersion = existingArtifact?.version ?? INDEX_ARTIFACT_VERSION
    const storageKey =
      existingArtifact?.storageKey ??
      extractedFile.storageKey ??
      `extracted:${extractedFile.id}`

    let artifact = existingArtifact
    if (!artifact) {
      artifact = await db.indexArtifact.create({
        data: {
          docHash,
          orgId: tenderAccess.organizationId,
          tenderId: tenderAccess.tenderId,
          version: artifactVersion,
          status: IndexArtifactStatus.BUILDING,
          storageKey,
          totalChunks: 0,
          totalPages: 0,
          bytesApprox: approxBytes,
        },
      })
      console.log('[ensure-index] created artifact', { artifactId: artifact.id, docHash })
    } else if (
      artifact.status !== IndexArtifactStatus.BUILDING ||
      artifact.bytesApprox !== approxBytes ||
      body.forceRebuild
    ) {
      artifact = await db.indexArtifact.update({
        where: { id: artifact.id },
        data: {
          status: IndexArtifactStatus.BUILDING,
          version: artifactVersion,
          totalChunks: 0,
          totalPages: 0,
          bytesApprox: approxBytes,
          storageKey,
        },
      })
      console.log('[ensure-index] reset artifact to BUILDING', {
        artifactId: artifact.id,
        docHash,
      })
    }

    const lockKey = `lock:index:${docHash}`
    let lockValue = await redis.get(lockKey)

    if (lockValue && !body.forceRebuild) {
      console.log('[ensure-index] already building (locked)', { docHash })
      return NextResponse.json({
        status: 'BUILDING',
        docHash,
        fileId: extractedFile.id,
      })
    }

    if (lockValue && body.forceRebuild) {
      console.log('[ensure-index] forceRebuild clearing lock', { docHash })
      await redis.del(lockKey)
      lockValue = null
    }

    await redis.set(lockKey, '1', 'EX', 60 * 30)

    await writeIndexProgress(
      redis,
      docHash,
      buildProgressSnapshot({
        docHash,
        phase: 'queued',
        percent: 1,
        batchesDone: 0,
        totalBatches: 0,
        message: 'Index build queued for file',
      }),
    )

    const job = await indexingQueue.add(
      'index',
      {
        tenderId,
        fileId: extractedFile.id,
        docHash,
      },
      {
        removeOnComplete: 100,
        removeOnFail: 100,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      },
    )

    console.log('[ensure-index] per-file enqueue', {
      jobId: job.id,
      tenderId,
      fileId: extractedFile.id,
      docHash,
      queue: INDEX_QUEUE,
    })

    return NextResponse.json({
      status: 'ENQUEUED',
      docHash,
      fileId: extractedFile.id,
      artifact: {
        id: artifact.id,
        storageKey: artifact.storageKey,
        version: artifact.version,
        totalChunks: artifact.totalChunks,
        updatedAt: artifact.updatedAt.toISOString(),
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 },
      )
    }

    console.error('[ensure-index] failed to enqueue per-file job:', error)
    return NextResponse.json({ error: 'Failed to ensure index' }, { status: 500 })
  }
}
