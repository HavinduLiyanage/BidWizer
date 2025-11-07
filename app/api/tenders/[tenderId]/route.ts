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

export async function GET(
  _request: NextRequest,
  context: { params: { tenderId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { tenderId } = paramsSchema.parse(context.params)

    const tender = await db.tender.findFirst({
      where: { id: tenderId },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            logo: true,
          },
        },
        uploads: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            filename: true,
            originalName: true,
            status: true,
            size: true,
            mimeType: true,
            isAdvertisement: true,
            createdAt: true,
            url: true,
            storageKey: true,
            error: true,
          },
        },
      },
    })

    if (!tender) {
      return NextResponse.json({ error: 'Tender not found' }, { status: 404 })
    }

    // Check if user has access to this tender (either as publisher or bidder)
    const membership = await db.orgMember.findFirst({
      where: { userId: session.user.id },
      include: {
        organization: true,
      },
    })

    if (!membership) {
      return NextResponse.json({ error: 'User not associated with any organization' }, { status: 403 })
    }

    // If the user is a member of the organization that owns the tender, they can access it
    if (membership.organizationId !== tender.organizationId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const requirements =
      Array.isArray(tender.requirements) && tender.requirements.length > 0
        ? tender.requirements
        : []

    return NextResponse.json({
      id: tender.id,
      title: tender.title,
      description: tender.description ?? '',
      category: tender.category ?? '',
      status: tender.status,
      deadline: tender.deadline,
      estimatedValue: tender.estimatedValue ?? null,
      regionLocation: tender.regionLocation ?? '',
      contactPersonName: tender.contactPersonName ?? '',
      contactNumber: tender.contactNumber ?? '',
      contactEmail: tender.contactEmail ?? '',
      companyWebsite: tender.companyWebsite ?? '',
      requirements,
      preBidMeetingAt: tender.preBidMeetingAt,
      organization: tender.organization,
      uploads: tender.uploads.map((upload) => ({
        id: upload.id,
        filename: upload.filename,
        originalName: upload.originalName,
        status: upload.status,
        size: upload.size,
        mimeType: upload.mimeType,
        isAdvertisement: upload.isAdvertisement,
        url: upload.url ?? null,
        storageKey: upload.storageKey ?? null,
        createdAt: upload.createdAt,
        error: upload.error ?? null,
      })),
    })
  } catch (error) {
    console.error('Tender fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

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

export async function DELETE(
  _request: NextRequest,
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

    await db.tender.delete({
      where: { id: tenderId },
    })

    return NextResponse.json({
      id: tenderId,
      message: 'Tender deleted successfully',
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

    console.error('Tender delete error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
