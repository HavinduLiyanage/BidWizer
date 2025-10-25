import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { IndexArtifactStatus } from '@prisma/client'
import { z } from 'zod'

import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { ensureTenderAccess } from '@/lib/indexing/access'
import { getRedisClient, readIndexProgress } from '@/lib/redis'

const paramsSchema = z.object({
  tenderId: z.string().min(1),
  docHash: z.string().min(1),
})

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

    const artifact = await db.indexArtifact.findUnique({
      where: { docHash },
    })

    const redis = getRedisClient()
    const progress = await readIndexProgress(redis, docHash)

    if (artifact?.status === IndexArtifactStatus.READY) {
      return NextResponse.json({
        status: 'ready',
        docHash,
        artifact: {
          storageKey: artifact.storageKey,
          updatedAt: artifact.updatedAt.toISOString(),
          version: artifact.version,
          totalChunks: artifact.totalChunks,
          totalPages: artifact.totalPages,
        },
        progress: progress ?? null,
      })
    }

    if (artifact?.status === IndexArtifactStatus.FAILED) {
      return NextResponse.json({
        status: 'failed',
        docHash,
        progress: progress ?? null,
      })
    }

    if (progress) {
      return NextResponse.json({
        status: 'building',
        docHash,
        progress,
      })
    }

    return NextResponse.json({
      status: artifact ? 'building' : 'not-found',
      docHash,
      progress: null,
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
