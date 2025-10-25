import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { IndexArtifactStatus } from '@prisma/client'
import { z } from 'zod'

import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { ensureTenderAccess } from '@/lib/indexing/access'
import {
  loadArtifact,
  searchArtifactVectors,
} from '@/lib/indexing'
import type { LoadedArtifact, VectorMatch } from '@/lib/indexing/types'
import { openai } from '@/lib/ai/openai'
import { embedTexts } from '@/lib/embedding'

const paramsSchema = z.object({
  tenderId: z.string().min(1),
  docHash: z.string().min(1),
})

const bodySchema = z.object({
  question: z.string().min(1, 'question is required'),
  topK: z.number().int().min(1).max(10).optional(),
  maxContextChars: z.number().int().min(500).max(12000).optional(),
})

const DEFAULT_TOP_K = 6
const DEFAULT_CONTEXT_LIMIT = 8000

export async function POST(request: NextRequest, context: { params: { tenderId: string; docHash: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { tenderId, docHash } = paramsSchema.parse(context.params)
    const body = bodySchema.parse(await request.json())

    try {
      await ensureTenderAccess(session.user.id, tenderId)
    } catch (error) {
      if (error instanceof Error && error.message === 'TenderNotFound') {
        return NextResponse.json({ error: 'Tender not found' }, { status: 404 })
      }
      throw error
    }

    const artifactRecord = await db.indexArtifact.findUnique({
      where: { docHash },
    })

    if (!artifactRecord) {
      return NextResponse.json({ error: 'Artifact not found', status: 'not-found' }, { status: 404 })
    }

    if (artifactRecord.status !== IndexArtifactStatus.READY) {
      return NextResponse.json(
        { error: 'Artifact is not ready', status: artifactRecord.status.toLowerCase() },
        { status: 409 },
      )
    }

    const artifact = await loadArtifact({
      storageKey: artifactRecord.storageKey,
      docHash,
      preferCache: true,
    })

    const embeddingBatch = await embedTexts([body.question])
    if (embeddingBatch.embeddings.length === 0) {
      return NextResponse.json(
        { error: 'Failed to embed question', status: 'embedding-error' },
        { status: 500 },
      )
    }

    const matches = await searchArtifactVectors(
      artifact,
      embeddingBatch.embeddings,
      body.topK ?? DEFAULT_TOP_K,
    )

    if (matches.length === 0) {
      return NextResponse.json({
        status: 'no-context',
        docHash,
        answer: null,
        citations: [],
        context: '',
      })
    }

    const { context, usedMatches } = buildContextFromMatches(
      artifact,
      matches,
      body.maxContextChars ?? DEFAULT_CONTEXT_LIMIT,
    )

    const response = await openai.responses.create({
      model: 'gpt-4.1-mini',
      input: [
        {
          role: 'system',
          content:
            'You are BidWizer, an assistant that answers questions about tender documents. ' +
            'Only use the provided context. When you cannot find the answer, say that explicitly. ' +
            'Cite your sources as [S1], [S2], etc. referencing the provided sections.',
        },
        {
          role: 'user',
          content: `Context:\n${context}\n\nQuestion:\n${body.question}\n\nAnswer with clear bullet points when appropriate and include citations.`,
        },
      ],
    })

    const answerText = response.output_text ?? response.outputs?.map((output) =>
      output.content?.map((item) => ('text' in item ? item.text : '')).join(''),
    ).join('\n')

    const citations = usedMatches.map((entry, index) => ({
      label: `S${index + 1}`,
      chunkId: entry.chunk.chunkId,
      fileId: entry.chunk.fileId,
      filePath: entry.meta?.path ?? entry.chunk.fileId,
      fileName: entry.meta?.name ?? entry.chunk.fileId,
      page: entry.chunk.page,
      score: entry.match.score,
    }))

    return NextResponse.json({
      status: 'ok',
      docHash,
      answer: answerText?.trim() ?? null,
      citations,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 },
      )
    }

    console.error('[indexing] Ask endpoint failed:', error)
    return NextResponse.json({ error: 'Failed to process question' }, { status: 500 })
  }
}

function buildContextFromMatches(
  artifact: LoadedArtifact,
  matches: VectorMatch[],
  maxChars: number,
) {
  const sections: string[] = []
  const usedMatches: Array<{
    chunk: LoadedArtifact['chunks'][number]
    match: VectorMatch
    meta: { path: string; name: string } | undefined
  }> = []

  let totalChars = 0
  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index]
    const chunk = artifact.chunks[match.index]
    if (!chunk?.text) {
      continue
    }

    const meta = artifact.names[chunk.fileId]
    const header = `Section ${index + 1}: ${meta?.name ?? chunk.fileId} (Page ${chunk.page})`
    const section = `${header}\nSource: ${meta?.path ?? chunk.fileId}\n\n${chunk.text}`
    const sectionLength = section.length

    if (totalChars + sectionLength > maxChars && sections.length > 0) {
      break
    }

    sections.push(section)
    usedMatches.push({ chunk, match, meta })
    totalChars += sectionLength
  }

  return {
    context: sections.join('\n\n'),
    usedMatches,
  }
}
