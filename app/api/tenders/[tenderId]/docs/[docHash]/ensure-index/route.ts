import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { DocStatus } from '@prisma/client'
import { z } from 'zod'

import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { docPaths } from '@/lib/artifacts'
import { ensureTenderAccess } from '@/lib/indexing/access'
import { log } from '@/lib/log'
import { exists } from '@/lib/storage'

const paramsSchema = z.object({
  tenderId: z.string().min(1),
  docHash: z.string().min(1),
})

type ArtifactSnapshot = {
  extracted: boolean
  chunks: boolean
  summary: boolean
}

type StatusPayload = {
  documentId: string
  docHash: string
  status: DocStatus
  error: string | null
  sections: number
  artifacts: ArtifactSnapshot
  nextStage: 'extract' | 'chunk' | 'embed' | 'summary' | null
}

async function buildStatusPayload(tenderId: string, docHash: string): Promise<StatusPayload | null> {
  const document = await db.document.findFirst({
    where: { tenderId, docHash },
    select: {
      id: true,
      tenderId: true,
      orgId: true,
      docHash: true,
      status: true,
      error: true,
    },
  })

  if (!document) {
    return null
  }

  const paths = docPaths(document.orgId, document.tenderId, document.docHash)
  const [extracted, chunks, summary, sections] = await Promise.all([
    exists(paths.extracted),
    exists(paths.chunks),
    exists(paths.summaries),
    db.documentSection.count({ where: { documentId: document.id } }),
  ])

  let nextStage: StatusPayload['nextStage'] = null
  if (!extracted) {
    nextStage = 'extract'
  } else if (!chunks) {
    nextStage = 'chunk'
  } else if (sections === 0) {
    nextStage = 'embed'
  } else if (!summary) {
    nextStage = 'summary'
  }

  return {
    documentId: document.id,
    docHash: document.docHash,
    status: document.status,
    error: document.error ?? null,
    sections,
    artifacts: {
      extracted,
      chunks,
      summary,
    },
    nextStage,
  }
}

async function handleRequest(
  request: NextRequest,
  context: { params: { tenderId: string; docHash: string } },
): Promise<NextResponse> {
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

    const payload = await buildStatusPayload(tenderId, docHash)
    if (!payload) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    log('api:ensure-index', 'status', {
      tenderId,
      docHash,
      status: payload.status,
      nextStage: payload.nextStage,
    })

    return NextResponse.json(payload)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 },
      )
    }

    const message = error instanceof Error ? error.message : String(error)
    log('api:ensure-index', 'error', { error: message })
    return NextResponse.json({ error: 'Failed to resolve index status' }, { status: 500 })
  }
}

export async function GET(
  request: NextRequest,
  context: { params: { tenderId: string; docHash: string } },
) {
  return handleRequest(request, context)
}

export async function POST(
  request: NextRequest,
  context: { params: { tenderId: string; docHash: string } },
) {
  return handleRequest(request, context)
}
