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
import { enqueueIndexBuild } from '@/lib/indexing/queue'
import { getSupabaseUploadsBucketName } from '@/lib/storage'
import {
  buildProgressSnapshot,
  getRedisClient,
  readIndexProgress,
  writeIndexProgress,
} from '@/lib/redis'

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

    if (existingArtifact && existingArtifact.status === IndexArtifactStatus.READY && !body.forceRebuild) {
      return NextResponse.json({
        status: 'ready',
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

    if (existingArtifact && existingArtifact.status === IndexArtifactStatus.BUILDING && !body.forceRebuild) {
      const redis = getRedisClient()
      const progress = await readIndexProgress(redis, docHash)
      return NextResponse.json({
        status: 'building',
        docHash,
        progress,
        mismatch: hashMismatch ? { expected: docHashParam, actual: docHash } : undefined,
      })
    }

    const artifactVersion = existingArtifact?.version ?? INDEX_ARTIFACT_VERSION
    const preservedStorageKey = existingArtifact?.storageKey ?? ''

    await db.indexArtifact.upsert({
      where: { docHash },
      create: {
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
      update: {
        status: IndexArtifactStatus.BUILDING,
        totalChunks: 0,
        totalPages: 0,
        bytesApprox: upload.size ?? 0,
        storageKey: preservedStorageKey,
      },
    })

    const redis = getRedisClient()
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

    await enqueueIndexBuild({
      docHash,
      orgId: tenderAccess.organizationId,
      tenderId: tenderAccess.tenderId,
      uploadStorageKey: upload.storageKey,
      uploadBucket: getSupabaseUploadsBucketName(),
      artifactVersion,
    })

    return NextResponse.json({
      status: 'building',
      docHash,
      queued: true,
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
