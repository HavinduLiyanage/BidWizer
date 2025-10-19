import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { z } from 'zod'

import { db } from '@/lib/db'
import {
  buildTenderMutationData,
  createTenderSchema,
  INVALID_PREBID_ERROR,
} from '../route'
import { authOptions } from '@/lib/auth'

const paramsSchema = z.object({
  tenderId: z.string().min(1, 'Tender id is required'),
})

export async function PATCH(
  request: NextRequest,
  context: { params: { tenderId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { tenderId } = paramsSchema.parse(context.params)

    const existingTender = await db.tender.findUnique({
      where: { id: tenderId },
      select: { id: true, organizationId: true },
    })

    if (!existingTender) {
      return NextResponse.json({ error: 'Tender not found' }, { status: 404 })
    }

    const membership = await db.orgMember.findUnique({
      where: {
        userId_organizationId: {
          userId: session.user.id,
          organizationId: existingTender.organizationId,
        },
      },
      select: { id: true },
    })

    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const data = createTenderSchema.parse(body)

    let tenderPayload: Prisma.TenderUncheckedUpdateInput
    try {
      tenderPayload = buildTenderMutationData(data)
    } catch (error) {
      if (error instanceof Error && error.message === INVALID_PREBID_ERROR) {
        return NextResponse.json(
          { error: 'Invalid pre-bid meeting date or time' },
          { status: 400 }
        )
      }
      throw error
    }

    const updated = await db.tender.update({
      where: { id: tenderId },
      data: tenderPayload,
      select: { id: true, status: true, updatedAt: true },
    })

    return NextResponse.json({
      id: updated.id,
      status: updated.status,
      updatedAt: updated.updatedAt,
      message: 'Tender updated successfully',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: error.errors,
        },
        { status: 400 }
      )
    }

    console.error('Tender update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
