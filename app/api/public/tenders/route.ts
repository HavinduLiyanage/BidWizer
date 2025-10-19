import { NextRequest, NextResponse } from 'next/server'
import { TenderStatus } from '@prisma/client'

import { db } from '@/lib/db'

function buildAvatarUrl(name: string): string {
  const encodedName = encodeURIComponent(name || 'Publisher')
  return `https://ui-avatars.com/api/?name=${encodedName}&background=2563EB&color=fff`
}

function mapTenderToResponse(tender: {
  id: string
  title: string
  description: string | null
  category: string | null
  deadline: Date | null
  publishedAt: Date | null
  createdAt: Date
  estimatedValue: string | null
  regionLocation: string | null
  organizationId: string
  organization: {
    id: string
    name: string
    logo: string | null
  }
}) {
  const publishedDate = tender.publishedAt ?? tender.createdAt
  const deadlineDate = tender.deadline ?? publishedDate

  return {
    id: tender.id,
    title: tender.title,
    description: tender.description ?? '',
    category: tender.category ?? 'General',
    deadline: deadlineDate.toISOString(),
    status: 'Active' as const,
    publishedDate: publishedDate.toISOString(),
    budget: tender.estimatedValue ?? undefined,
    type: 'Public' as const,
    location: tender.regionLocation ?? undefined,
    publisher: {
      id: tender.organizationId,
      name: tender.organization?.name ?? 'Publisher',
      logo: tender.organization?.logo ?? buildAvatarUrl(tender.organization?.name ?? 'Publisher'),
    },
  }
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const limitParam = url.searchParams.get('limit')
  const limit = limitParam ? Number.parseInt(limitParam, 10) : undefined
  const take = Number.isFinite(limit) && limit && limit > 0 ? limit : undefined

  const tenders = await db.tender.findMany({
    where: { status: TenderStatus.PUBLISHED },
    orderBy: { publishedAt: 'desc' },
    take,
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          logo: true,
        },
      },
    },
  })

  return NextResponse.json({
    tenders: tenders.map(mapTenderToResponse),
  })
}
