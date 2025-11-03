import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

const updateOrganizationSchema = z.object({
  name: z.string().min(1, 'Organization name is required').max(100, 'Name too long'),
  website: z.string().url('Invalid website URL').optional().or(z.literal('')),
  industry: z.string().max(50, 'Industry too long').optional(),
  description: z.string().max(500, 'Description too long').optional(),
})

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { name, website, industry, description } = updateOrganizationSchema.parse(body)

    // Get user's organization
    const membership = await db.orgMember.findFirst({
      where: { userId: session.user.id },
      include: { organization: true },
    })

    if (!membership) {
      return NextResponse.json(
        { error: 'User not associated with any organization' },
        { status: 404 }
      )
    }

    const updatedOrganization = await db.organization.update({
      where: { id: membership.organizationId },
      data: {
        name,
        website: website || null,
        industry: industry || null,
        description: description || null,
      },
      select: {
        id: true,
        name: true,
        website: true,
        industry: true,
        description: true,
        slug: true,
      },
    })

    return NextResponse.json({
      message: 'Organization profile updated successfully',
      organization: updatedOrganization,
    })
  } catch (error) {
    console.error('Organization update error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update organization profile' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user's organization
    const membership = await db.orgMember.findFirst({
      where: { userId: session.user.id },
      include: { organization: true },
    })

    if (!membership) {
      return NextResponse.json(
        { error: 'User not associated with any organization' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      organization: membership.organization,
    })
  } catch (error) {
    console.error('Organization fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch organization profile' },
      { status: 500 }
    )
  }
}
