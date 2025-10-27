import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { IndexArtifactStatus } from '@prisma/client'
import { z } from 'zod'

import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { ensureTenderAccess } from '@/lib/indexing/access'
import { getRedisClient, readIndexProgress } from '@/lib/redis'
import type { IndexProgressSnapshot } from '@/lib/indexing/types'

const paramsSchema = z.object({
  tenderId: z.string().min(1),
  docHash: z.string().min(1),
})

type ProgressPayload = {
  stage: string
  percent: number | null
  message?: string | null
  phase?: string
  updatedAt?: number
  docHash?: string
}

function snapshotToPayload(progress: IndexProgressSnapshot): ProgressPayload {
  if (progress.phase === 'ready') {
    return {
      stage: 'complete',
      percent: 100,
      message: progress.message ?? 'Index is ready',
      updatedAt: progress.updatedAt,
      docHash: progress.docHash,
    }
  }

  if (progress.phase === 'failed') {
    return {
      stage: 'failed',
      percent: progress.percent ?? 0,
      message: progress.message ?? 'Indexing failed',
      updatedAt: progress.updatedAt,
      docHash: progress.docHash,
    }
  }

  return {
    stage: 'building',
    phase: progress.phase,
    percent: Number.isFinite(progress.percent) ? progress.percent : null,
    message: progress.message ?? 'Indexing...',
    updatedAt: progress.updatedAt,
    docHash: progress.docHash,
  }
}

export async function GET(request: NextRequest, context: { params: { tenderId: string; docHash: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { tenderId, docHash } = paramsSchema.parse(context.params)

    try {
      await ensureTenderAccess(session.user.id, tenderId)
    } catch (error) {
      if (error instanceof Error && error.message === 'TenderNotFound') {
        return NextResponse.json({ error: 'Tender not found' }, { status: 404 })
      }
      throw error
    }

    const redis = getRedisClient()
    const snapshot = await readIndexProgress(redis, docHash)

    if (snapshot) {
      const payload = snapshotToPayload(snapshot)
      if (payload.stage === 'failed') {
        return NextResponse.json(payload, { status: 500 })
      }
      return NextResponse.json(payload)
    }

    const artifact = await db.indexArtifact.findFirst({
      where: { tenderId, docHash },
      select: { status: true },
    })

    if (!artifact) {
      return NextResponse.json({
        stage: 'not_started',
        percent: 0,
        message: 'No index artifact exists yet.',
        docHash,
      })
    }

    if (artifact.status === IndexArtifactStatus.READY) {
      return NextResponse.json({
        stage: 'complete',
        percent: 100,
        message: 'Index is ready',
        docHash,
      })
    }

    if (artifact.status === IndexArtifactStatus.FAILED) {
      return NextResponse.json(
        {
          stage: 'failed',
          percent: 0,
          message: 'Indexing failed',
          docHash,
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      stage: 'building',
      percent: null,
      message: 'Indexing...',
      docHash,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 },
      )
    }

    console.error('[indexing] Failed to load progress:', error)
    return NextResponse.json({ error: 'Failed to fetch index progress' }, { status: 500 })
  }
}
