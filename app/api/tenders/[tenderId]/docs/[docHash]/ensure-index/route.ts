import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { IndexArtifactStatus } from '@prisma/client'
import { z } from 'zod'

import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { loadUploadBuffer } from '@/lib/uploads'
import {
  computeDocHashFromBuffer,
  INDEX_ARTIFACT_VERSION,
} from '@/lib/indexing'
import { ensureTenderAccess } from '@/lib/indexing/access'
import { getSupabaseUploadsBucketName } from '@/lib/storage'
import {
  buildProgressSnapshot,
  getRedisClient,
  writeIndexProgress,
} from '@/lib/redis'
import { indexingQueue, INDEX_QUEUE } from '@/lib/queue'

const paramsSchema = z.object({
  tenderId: z.string().min(1),
  docHash: z.string().min(1),
})

const bodySchema = z.object({
  uploadId: z.string().min(1, 'uploadId is required'),
  forceRebuild: z.boolean().optional(),
})

export async function POST(request: NextRequest, context: { params: { tenderId: string; docHash: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { tenderId, docHash: docHashParam } = paramsSchema.parse(context.params)
    console.log('[ensure-index] hit', { tenderId, docHash: docHashParam })
    const body = bodySchema.parse(await request.json())

    let tenderAccess
    try {
      tenderAccess = await ensureTenderAccess(session.user.id, tenderId)
    } catch (error) {
      if (error instanceof Error && error.message === 'TenderNotFound') {
        return NextResponse.json({ error: 'Tender not found' }, { status: 404 })
      }
      throw error
    }

    const upload = await db.upload.findUnique({
      where: { id: body.uploadId },
      select: {
        id: true,
        storageKey: true,
        status: true,
        tenderId: true,
        size: true,
      },
    })

    if (!upload || upload.tenderId !== tenderId) {
      return NextResponse.json({ error: 'Upload not found' }, { status: 404 })
    }

    if (!upload.storageKey) {
      return NextResponse.json({ error: 'Upload does not have a storage key' }, { status: 400 })
    }

    const payloadBuffer = await loadUploadBuffer(upload.storageKey)
    const computedHash = computeDocHashFromBuffer(payloadBuffer)
    const docHash = computedHash
    const hashMismatch = docHash !== docHashParam

    const existingArtifact = await db.indexArtifact.findUnique({
      where: { docHash },
    })
    console.log(
      '[ensure-index] artifact?',
      existingArtifact
        ? {
            id: existingArtifact.id,
            status: existingArtifact.status,
            updatedAt: existingArtifact.updatedAt.toISOString(),
          }
        : 'none',
    )

    if (existingArtifact && existingArtifact.status === IndexArtifactStatus.READY && !body.forceRebuild) {
      console.log('[ensure-index] already READY')
      return NextResponse.json({
        status: 'READY',
        docHash,
        artifact: {
          id: existingArtifact.id,
          storageKey: existingArtifact.storageKey,
          updatedAt: existingArtifact.updatedAt.toISOString(),
          version: existingArtifact.version,
          totalChunks: existingArtifact.totalChunks,
        },
        mismatch: hashMismatch ? { expected: docHashParam, actual: docHash } : undefined,
      })
    }

    const artifactVersion = existingArtifact?.version ?? INDEX_ARTIFACT_VERSION
    const preservedStorageKey = existingArtifact?.storageKey ?? ''

    let artifact = existingArtifact
    if (!artifact) {
      artifact = await db.indexArtifact.create({
        data: {
          docHash,
          orgId: tenderAccess.organizationId,
          tenderId: tenderAccess.tenderId,
          version: artifactVersion,
          status: IndexArtifactStatus.BUILDING,
          storageKey: preservedStorageKey,
          totalChunks: 0,
          totalPages: 0,
          bytesApprox: upload.size ?? 0,
        },
      })
      console.log('[ensure-index] created artifact row', { id: artifact.id })
    }

    const shouldResetStatus =
      artifact.status !== IndexArtifactStatus.BUILDING || Boolean(body.forceRebuild)

    if (shouldResetStatus) {
      artifact = await db.indexArtifact.update({
        where: { id: artifact.id },
        data: {
          status: IndexArtifactStatus.BUILDING,
          version: artifactVersion,
          totalChunks: 0,
          totalPages: 0,
          bytesApprox: upload.size ?? 0,
          storageKey: preservedStorageKey,
        },
      })
      console.log('[ensure-index] marked BUILDING', { id: artifact.id })
    }

    const redis = getRedisClient()
    const lockKey = `lock:index:${docHash}`
    let lockValue = await redis.get(lockKey)
    console.log('[ensure-index] lock?', lockValue)

    if (lockValue && !body.forceRebuild) {
      console.log('[ensure-index] already building (locked)')
      return NextResponse.json({
        status: 'BUILDING',
        docHash,
        mismatch: hashMismatch ? { expected: docHashParam, actual: docHash } : undefined,
      })
    }

    if (lockValue && body.forceRebuild) {
      console.log('[ensure-index] forceRebuild clearing lock')
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
        message: 'Index build queued',
      }),
    )

    const job = await indexingQueue.add(
      'index',
      {
        tenderId,
        docHash,
        orgId: tenderAccess.organizationId,
        uploadStorageKey: upload.storageKey,
        uploadBucket: getSupabaseUploadsBucketName(),
        artifactVersion,
      },
      {
        removeOnComplete: 100,
        removeOnFail: 100,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      },
    )

    console.log('[ensure-index] enqueued', {
      tenderId,
      docHash,
      queue: INDEX_QUEUE,
      jobId: job.id,
    })

    return NextResponse.json({
      status: 'ENQUEUED',
      docHash,
      mismatch: hashMismatch ? { expected: docHashParam, actual: docHash } : undefined,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 },
      )
    }

    console.error('[indexing] Failed to ensure index:', error)
    return NextResponse.json({ error: 'Failed to ensure index' }, { status: 500 })
  }
}
