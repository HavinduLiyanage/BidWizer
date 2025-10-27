import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'

import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { openai } from '@/lib/ai/openai'

const bodySchema = z.object({
  tone: z.enum(['professional', 'confident', 'concise']).default('professional'),
  length: z.enum(['short', 'standard', 'detailed']).default('standard'),
  customNotes: z.string().optional(),
})

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
      response.outputs
        ?.map((entry) =>
          entry.content
            ?.map((item) => ('text' in item ? item.text : ''))
            .join(''),
        )
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

    console.error('[cover-letter] failed:', error)
    return NextResponse.json({ error: 'Failed to generate letter' }, { status: 500 })
  }
}
