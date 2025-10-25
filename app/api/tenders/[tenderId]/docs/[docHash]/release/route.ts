import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'

import { authOptions } from '@/lib/auth'
import { ensureTenderAccess } from '@/lib/indexing/access'
import { releaseCachedArtifact } from '@/lib/indexing/loader'

const paramsSchema = z.object({
  tenderId: z.string().min(1),
  docHash: z.string().min(1),
})

export async function POST(request: NextRequest, context: { params: { tenderId: string; docHash: string } }) {
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

    const released = releaseCachedArtifact(docHash)

    return NextResponse.json({
      status: 'ok',
      docHash,
      released,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 },
      )
    }

    console.error('[indexing] Failed to release artifact cache:', error)
    return NextResponse.json({ error: 'Failed to release artifact' }, { status: 500 })
  }
}
