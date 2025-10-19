import { NextResponse } from 'next/server'
import { TenderStatus } from '@prisma/client'

import { db } from '@/lib/db'

function buildAvatarUrl(name: string): string {
  const encodedName = encodeURIComponent(name || 'Publisher')
  return `https://ui-avatars.com/api/?name=${encodedName}&background=2563EB&color=fff`
}

export async function GET(
  _request: Request,
  { params }: { params: { tenderId: string } }
) {
  const tender = await db.tender.findFirst({
    where: {
      id: params.tenderId,
      status: TenderStatus.PUBLISHED,
    },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          logo: true,
        },
      },
      uploads: {
        select: {
          id: true,
          originalName: true,
          url: true,
          mimeType: true,
          size: true,
        },
      },
    },
  })

  if (!tender) {
    return NextResponse.json({ error: 'Tender not found' }, { status: 404 })
  }

  const publishedDate = tender.publishedAt ?? tender.createdAt
  const deadline = tender.deadline ?? publishedDate

  return NextResponse.json({
    id: tender.id,
    title: tender.title,
    description: tender.description ?? '',
    category: tender.category ?? 'General',
    status: tender.status,
    publishedDate: publishedDate.toISOString(),
    deadline: deadline.toISOString(),
    estimatedValue: tender.estimatedValue ?? null,
    regionLocation: tender.regionLocation ?? null,
    requirements: Array.isArray(tender.requirements)
      ? tender.requirements
      : [],
    contactPersonName: tender.contactPersonName ?? null,
    contactNumber: tender.contactNumber ?? null,
    contactEmail: tender.contactEmail ?? null,
    companyWebsite: tender.companyWebsite ?? null,
    preBidMeetingAt: tender.preBidMeetingAt?.toISOString() ?? null,
    publisher: {
      id: tender.organizationId,
      name: tender.organization?.name ?? 'Publisher',
      logo:
        tender.organization?.logo ??
        buildAvatarUrl(tender.organization?.name ?? 'Publisher'),
    },
    attachments: tender.uploads.map((upload) => ({
      id: upload.id,
      name: upload.originalName,
      url: upload.url,
      mimeType: upload.mimeType,
      size: upload.size,
    })),
  })
}
