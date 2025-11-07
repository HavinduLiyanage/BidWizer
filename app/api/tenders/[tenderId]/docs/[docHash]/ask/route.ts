import { createHash } from 'node:crypto'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { DocStatus, IndexArtifactStatus } from '@prisma/client'
import { z } from 'zod'

import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { openai } from '@/lib/ai/openai'
import { retrieveChunksFromFile, buildContext } from '@/lib/ai/rag'
import { ensureTenderAccess } from '@/lib/indexing/access'
import { enforceAccess, PlanError } from '@/lib/entitlements/enforce'
import { incrementMonthly, incrementOrgTenderChats } from '@/lib/usage'
import { flags } from '@/lib/flags'
import { getRedisClient } from '@/lib/redis'

const paramsSchema = z.object({
  tenderId: z.string().min(1),
  docHash: z.string().min(1),
})

const bodySchema = z.object({
  question: z.string().min(3).max(1000),
  fileId: z.string().min(1),
})

type RetrievedSection = Awaited<ReturnType<typeof retrieveChunksFromFile>>[number]

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
    const { question, fileId } = bodySchema.parse(await request.json())

    const access = await ensureTenderAccess(session.user.id, tenderId)
    const ownerOrganizationId = access.organizationId
    const viewerOrgId = access.viewerOrganizationId ?? access.organizationId
    const accessResult = await enforceAccess({
      orgId: viewerOrgId,
      feature: 'chat',
      tenderId,
      userId: session.user.id,
    })

    const documentRecord = await db.document.findFirst({
      where: {
        docHash,
        tenderId,
        orgId: ownerOrganizationId,
      },
      select: {
        id: true,
        title: true,
        status: true,
      },
    })

    if (documentRecord && documentRecord.status !== DocStatus.READY) {
      return NextResponse.json({ status: 'INDEXING' }, { status: 409 })
    }

    let artifact: { tenderId: string; status: IndexArtifactStatus } | null = null
    if (!documentRecord) {
      artifact = await db.indexArtifact.findUnique({
        where: { docHash },
        select: { tenderId: true, status: true },
      })
      if (!artifact || artifact.tenderId !== tenderId) {
        return NextResponse.json({ error: 'Document not found' }, { status: 404 })
      }
      if (artifact.status !== IndexArtifactStatus.READY) {
        return NextResponse.json(
          { status: 'INDEXING' },
          { status: 409 },
        )
      }
    }

    const extractedFile = await db.extractedFile.findFirst({
      where: { id: fileId, tenderId, docHash },
      select: { id: true, filename: true, docHash: true },
    })
    if (!extractedFile) {
      return NextResponse.json(
        { error: 'Document not found in this tender' },
        { status: 404 },
      )
    }

    const topK = Math.max(1, flags.retrievalTopK || 8)
    const redis = getRedisClient()

    const cacheKey =
      documentRecord != null
        ? `rag:doc:${documentRecord.id}:q:${createHash('sha1')
            .update(question.toLowerCase())
            .digest('hex')}`
        : null

    let cachedSections: unknown = null
    if (cacheKey) {
      try {
        cachedSections = await redis.get(cacheKey)
        if (typeof cachedSections === 'string') {
          cachedSections = JSON.parse(cachedSections)
        }
      } catch {
        cachedSections = null
      }
    }

    let sections: RetrievedSection[] | null = null
    if (Array.isArray(cachedSections) && cachedSections.length > 0) {
      sections = cachedSections as RetrievedSection[]
    }

    if (!sections) {
      sections =
        (await retrieveChunksFromFile({
          tenderId,
          documentId: documentRecord?.id,
          fileId: documentRecord ? undefined : extractedFile.id,
          question,
          k: topK,
        })) ?? []

      if (cacheKey && sections.length > 0) {
        void redis.set(cacheKey, JSON.stringify(sections), 'EX', 300).catch(() => undefined)
      }
    }

    if (!sections || sections.length === 0) {
      return NextResponse.json(
        { error: 'No indexed content for this file' },
        { status: 422 },
      )
    }

    const docTitle = documentRecord?.title ?? extractedFile.filename ?? 'Document'

    const contextText = buildContext(
      sections.map((section) => ({
        docName: section.docName ?? docTitle,
        pageStart: section.pageStart ?? null,
        pageEnd: section.pageEnd ?? null,
        content: section.content,
        heading: section.heading ?? null,
      })),
    )
    if (!contextText.trim()) {
      return NextResponse.json(
        { error: 'No indexed content for this file' },
        { status: 422 },
      )
    }

    const systemPrompt =
      'You are BidWizer AI. Answer ONLY using the provided context from the selected PDF. ' +
      'If the answer is not in context, say "I couldn\'t find that in this file." ' +
      'Cite pages inline like [p.X]. Be concise and specific.'
    const userPrompt = `Context:\n${contextText}\n\nQuestion: ${question}`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.2,
      max_tokens: 900,
    })

    const rawContent = completion.choices?.[0]?.message?.content?.trim() ?? ''
    const answer =
      rawContent.length > 0 ? rawContent : "I couldn't find that in this file."

    const citations = sections.slice(0, Math.min(6, sections.length)).map((section) => ({
      documentId: documentRecord?.id ?? section.documentId,
      docHash,
      docName: section.docName ?? docTitle,
      pageStart: section.pageStart ?? null,
      pageEnd: section.pageEnd ?? null,
      heading: section.heading ?? null,
      snippet: section.content.slice(0, 220),
    }))

    if (accessResult.actions.incrementChats) {
      await incrementOrgTenderChats(viewerOrgId, tenderId)
    }

    if (accessResult.plan === 'STANDARD' || accessResult.plan === 'PREMIUM') {
      await incrementMonthly(viewerOrgId, 'chat')
    }

    return NextResponse.json({
      content: answer,
      citations,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 },
      )
    }
    if (error instanceof PlanError) {
      return NextResponse.json({ code: error.code }, { status: error.http })
    }

    console.error('[ask] failed:', error)
    return NextResponse.json({ error: 'Failed to process question' }, { status: 500 })
  }
}

