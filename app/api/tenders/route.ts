import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { Prisma, TenderStatus, OrganizationType } from '@prisma/client'

import { db } from '@/lib/db'
import { authOptions } from '@/lib/auth'

export const createTenderSchema = z.object({
  title: z.string().trim().min(1, 'Title is required'),
  category: z.string().trim().min(1, 'Category is required'),
  description: z.string().trim().optional(),
  submissionDeadline: z.coerce.date({
    invalid_type_error: 'Submission deadline is required',
  }).refine((date) => !Number.isNaN(date.getTime()), {
    message: 'Invalid submission deadline',
  }),
  estimatedValue: z.string().trim().optional(),
  preBidMeetingDate: z.string().trim().optional(),
  preBidMeetingTime: z.string().trim().optional(),
  regionLocation: z.string().trim().min(1, 'Region/Location is required'),
  contactPersonName: z.string().trim().min(1, 'Contact person name is required'),
  contactNumber: z.string().trim().min(1, 'Contact number is required'),
  contactEmail: z.string().trim().email('Valid email is required'),
  companyWebsite: z.string().trim().optional().or(z.literal('')),
  requirements: z.array(z.string().trim().min(1)).optional(),
  status: z.nativeEnum(TenderStatus).optional().default(TenderStatus.DRAFT),
})

export const INVALID_PREBID_ERROR = 'INVALID_PREBID_MEETING'

type TenderCreatePayload = Omit<Prisma.TenderUncheckedCreateInput, 'organizationId'>

export function buildTenderMutationData(
  data: z.infer<typeof createTenderSchema>
): TenderCreatePayload {
  const trimmedRequirements =
    data.requirements?.map((req) => req.trim()).filter((req) => req.length > 0) ?? []

  const preBidMeetingAt =
    data.preBidMeetingDate && data.preBidMeetingDate.length > 0
      ? new Date(
          `${data.preBidMeetingDate}${
            data.preBidMeetingTime && data.preBidMeetingTime.length > 0
              ? `T${data.preBidMeetingTime}`
              : 'T00:00:00'
          }`
        )
      : null

  if (preBidMeetingAt && Number.isNaN(preBidMeetingAt.getTime())) {
    throw new Error(INVALID_PREBID_ERROR)
  }

  const requirementsInput: Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue =
    trimmedRequirements.length > 0 ? (trimmedRequirements as Prisma.InputJsonValue) : Prisma.JsonNull

  return {
    title: data.title,
    description: data.description && data.description.length > 0 ? data.description : null,
    deadline: data.submissionDeadline,
    status: data.status,
    category: data.category,
    estimatedValue:
      data.estimatedValue && data.estimatedValue.length > 0 ? data.estimatedValue : null,
    regionLocation: data.regionLocation,
    contactPersonName: data.contactPersonName,
    contactNumber: data.contactNumber,
    contactEmail: data.contactEmail,
    companyWebsite:
      data.companyWebsite && data.companyWebsite.length > 0 ? data.companyWebsite : null,
    requirements: requirementsInput,
    preBidMeetingAt: preBidMeetingAt ?? undefined,
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const data = createTenderSchema.parse(body)

    // Get user's organization
    const membership = await db.orgMember.findFirst({
      where: { userId: session.user.id },
      include: {
        organization: true,
      },
    })

    if (!membership) {
      return NextResponse.json({ error: 'User not associated with any organization' }, { status: 400 })
    }

    if (membership.organization.type !== OrganizationType.PUBLISHER) {
      return NextResponse.json(
        { error: 'Only publisher organizations can create tenders' },
        { status: 403 }
      )
    }

    // Create the tender
    let tenderPayload: TenderCreatePayload
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

    const status =
      (tenderPayload.status as TenderStatus | undefined) ?? TenderStatus.DRAFT

    const tender = await db.tender.create({
      data: {
        ...tenderPayload,
        status,
        publishedAt:
          status === TenderStatus.PUBLISHED
            ? tenderPayload.publishedAt ?? new Date()
            : null,
        organizationId: membership.organizationId,
      },
    })

    return NextResponse.json({
      id: tender.id,
      title: tender.title,
      status: tender.status,
      message: 'Tender created successfully',
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

    console.error('Tender creation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization
    const membership = await db.orgMember.findFirst({
      where: { userId: session.user.id },
      include: {
        organization: true,
      },
    })

    if (!membership) {
      return NextResponse.json({ error: 'User not associated with any organization' }, { status: 400 })
    }

    const tenders = await db.tender.findMany({
      where: { organizationId: membership.organizationId },
      orderBy: { createdAt: 'desc' },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            logo: true,
          },
        },
        uploads: true,
      },
    })

    return NextResponse.json({ tenders })
  } catch (error) {
    console.error('Tender fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
