// Manual test steps:
// - Anonymous GET on /api/public/tenders/.../stream -> 401 or 404 (depending on approach).
// - Trial org session: /ai/cover-letter -> 403 { code: "FEATURE_NOT_AVAILABLE" }.
// - Trial org session: /stream -> 200 with full document access.
// - Paid org session: /ai/cover-letter -> 200 (unchanged behavior).

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'

import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { openai } from '@/lib/ai/openai'
import { enforceAccess, PlanError } from '@/lib/entitlements/enforce'
import { log } from '@/lib/log'
import type {
  ResponseOutputItem,
  ResponseOutputMessage,
  ResponseOutputText,
} from 'openai/resources/responses/responses'

const bodySchema = z.object({
  tone: z.enum(['professional', 'confident', 'concise']).default('professional'),
  length: z.enum(['short', 'standard', 'detailed']).default('standard'),
  customNotes: z.string().optional(),
})

function isOutputMessage(item: ResponseOutputItem): item is ResponseOutputMessage {
  return item.type === 'message'
}

function extractTextFromMessage(message: ResponseOutputMessage): string {
  return message.content
    .map((contentItem) =>
      contentItem.type === 'output_text' ? (contentItem as ResponseOutputText).text : '',
    )
    .join('')
}

export async function POST(
  request: NextRequest,
  context: { params: { tenderId: string } },
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { tenderId } = context.params
    const { tone, length, customNotes } = bodySchema.parse(await request.json())

    const tender = await db.tender.findUnique({
      where: { id: tenderId },
      include: { organization: true },
    })

    if (!tender) {
      return NextResponse.json({ error: 'Tender not found' }, { status: 404 })
    }

    const membership = await db.orgMember.findFirst({
      where: { userId: session.user.id },
      include: { organization: true },
    })

    const bidder = membership?.organization
    if (!bidder) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 400 })
    }

    try {
      const accessResult = await enforceAccess({
        orgId: bidder.id,
        feature: 'coverLetter',
        tenderId,
        userId: session.user.id,
      })
      log('api.tenders.cover-letter', 'gate_check', {
        event: 'gate_check',
        feature: 'coverLetter',
        orgId: bidder.id,
        tenderId,
        result: 'allow',
        reason: accessResult.plan,
      })
    } catch (error) {
      if (error instanceof PlanError) {
        log('api.tenders.cover-letter', 'gate_check', {
          event: 'gate_check',
          feature: 'coverLetter',
          orgId: bidder.id,
          tenderId,
          result: 'deny',
          reason: error.code,
        })
        return NextResponse.json({ code: 'FEATURE_NOT_AVAILABLE' }, { status: 403 })
      }
      throw error
    }

    const systemPrompt =
      'You are BidWizer AI writing a professional tender cover letter.\n' +
      'Use ONLY the metadata provided (tender + bidder organization).\n' +
      'Do NOT use or reference any PDF content. Omit unknown fields; never fabricate. Return Markdown only.'

    const userPrompt = [
      'Tender Metadata:',
      `- Procuring Entity: ${tender.organization?.name ?? ''}`,
      `- Tender Reference: ${tender.reference ?? ''}`,
      `- Project Title: ${tender.title ?? ''}`,
      `- Submission Deadline: ${tender.deadline?.toISOString() ?? ''}`,
      `- Region/Location: ${tender.regionLocation ?? ''}`,
      `- Estimated Value: ${tender.estimatedValue ?? ''}`,
      `- Contact: ${tender.contactPersonName ?? ''}${
        tender.contactNumber ? ` (${tender.contactNumber})` : ''
      }`,
      '',
      'Bidder Organization:',
      `- Company: ${bidder.name}`,
      `- Website: ${bidder.website ?? ''}`,
      `- Industry: ${bidder.industry ?? ''}`,
      `- Summary: ${bidder.description ?? ''}`,
      '',
      `Tone: ${tone}`,
      `Length: ${length}`,
      `Custom Notes: ${customNotes ?? ''}`,
      '',
      'Write a cover letter with:',
      '- Polite salutation (no specific person if unknown)',
      '- 1-2 lines acknowledging tender reference and project title',
      '- 1 short paragraph on company fit/strengths (use bidder fields only)',
      '- 1 paragraph confirming compliance intent (no quoting figures)',
      '- Clear closing with contact point.',
    ].join('\n')

    const response = await openai.responses.create({
      model: 'gpt-4.1-mini',
      temperature: tone === 'confident' ? 0.7 : 0.5,
      max_output_tokens: 900,
      input: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    })

    const letterMarkdown =
      response.output_text ??
      response.output
        ?.map((entry) => (isOutputMessage(entry) ? extractTextFromMessage(entry) : ''))
        .join('\n') ??
      ''

    return NextResponse.json({
      status: 'ok',
      letterMarkdown: letterMarkdown.trim(),
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 },
      )
    }
    if (error instanceof PlanError) {
      return NextResponse.json({ code: 'FEATURE_NOT_AVAILABLE' }, { status: 403 })
    }

    console.error('[cover-letter] failed:', error)
    return NextResponse.json({ error: 'Failed to generate letter' }, { status: 500 })
  }
}
