import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { IndexArtifactStatus } from '@prisma/client'
import { z } from 'zod'

import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { ensureTenderAccess } from '@/lib/indexing/access'
import { retrieveChunksFromFile, buildContext } from '@/lib/ai/rag'
import { openai } from '@/lib/ai/openai'

const paramsSchema = z.object({
  tenderId: z.string().min(1),
  docHash: z.string().min(1),
})

const bodySchema = z.object({
  length: z.enum(['short', 'medium', 'long']).default('medium'),
  fileId: z.string().min(1),
})

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
    const { length, fileId } = bodySchema.parse(await request.json())

    await ensureTenderAccess(session.user.id, tenderId)

    const artifact = await db.indexArtifact.findUnique({
      where: { docHash },
      select: { tenderId: true, status: true },
    })
    if (!artifact || artifact.tenderId !== tenderId) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }
    if (artifact.status !== IndexArtifactStatus.READY) {
      return NextResponse.json(
        { error: 'Document index is not ready' },
        { status: 422 },
      )
    }

    const extractedFile = await db.extractedFile.findFirst({
      where: { id: fileId, tenderId },
      select: { id: true, filename: true },
    })
    if (!extractedFile) {
      return NextResponse.json(
        { error: 'Document not found in this tender' },
        { status: 404 },
      )
    }

    const retrievalQuestion =
      'Provide a structured tender brief covering purpose, key requirements, eligibility, submission details, and risks.'
    const chunks = await retrieveChunksFromFile({
      tenderId,
      fileId: extractedFile.id,
      question: retrievalQuestion,
      k: 18,
    })
    if (chunks.length === 0) {
      return NextResponse.json(
        { error: 'No indexed content for this file' },
        { status: 422 },
      )
    }

    const contextText = buildContext(chunks)
    if (!contextText.trim()) {
      return NextResponse.json(
        { error: 'No indexed content for this file' },
        { status: 422 },
      )
    }

    const systemPrompt =
      'You are BidWizer. Create a structured brief ONLY from the provided context.'
    const userPrompt = [
      'Context:',
      contextText,
      '',
      'Return JSON with keys:',
      '{',
      '  "purpose": [],',
      '  "key_requirements": [],',
      '  "eligibility": [],',
      '  "submission": { "deadline":"", "method":"", "bid_security":"" },',
      '  "risks": []',
      '}',
      'Then provide a clean Markdown brief based on the JSON.',
      `Length: ${length}`,
    ].join('\n')

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.2,
      max_tokens: 1200,
    })

    const rawOutput = completion.choices?.[0]?.message?.content?.trim() ?? ''

    if (!rawOutput) {
      return NextResponse.json({
        briefJson: null,
        markdown: "I couldn't find that in this file.",
      })
    }

    let briefJson: unknown = null
    let markdown = rawOutput
    const jsonMatch = rawOutput.match(/\{[\s\S]*?\}/)
    if (jsonMatch) {
      try {
        briefJson = JSON.parse(jsonMatch[0])
        markdown = rawOutput.slice(jsonMatch.index! + jsonMatch[0].length).trim()
      } catch {
        briefJson = null
        markdown = rawOutput
      }
    }

    if (!markdown) {
      markdown = "I couldn't find that in this file."
    }

    return NextResponse.json({
      briefJson,
      markdown,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 },
      )
    }

    console.error('[brief] failed:', error)
    return NextResponse.json({ error: 'Failed to generate brief' }, { status: 500 })
  }
}
