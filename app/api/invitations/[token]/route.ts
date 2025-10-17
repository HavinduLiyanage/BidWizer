import bcrypt from 'bcrypt'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { db } from '@/lib/db'
import { sendVerificationEmail } from '@/lib/email'

const acceptInvitationSchema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(8, 'Password confirmation must be at least 8 characters'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

const ONE_DAY_IN_MS = 24 * 60 * 60 * 1000

export async function GET(
  _request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const token = params.token

    if (!token) {
      return NextResponse.json({ error: 'Invitation token is required' }, { status: 400 })
    }

    const invitation = await db.invitation.findUnique({
      where: { token },
      include: {
        organization: true,
        invitedBy: true,
      },
    })

    if (!invitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
    }

    if (invitation.status !== 'PENDING') {
      return NextResponse.json({ error: 'Invitation is no longer available' }, { status: 400 })
    }

    if (invitation.expires < new Date()) {
      await db.invitation.update({
        where: { id: invitation.id },
        data: { status: 'EXPIRED' },
      })

      return NextResponse.json({ error: 'Invitation has expired' }, { status: 400 })
    }

    return NextResponse.json({
      invitation: {
        email: invitation.email,
        name: invitation.name,
        position: invitation.position,
        organizationName: invitation.organization.name,
        organizationSlug: invitation.organization.slug,
        organizationType: invitation.organization.type,
        inviterName: invitation.invitedBy?.name ?? invitation.invitedBy?.email ?? 'BidWizer Admin',
        expiresAt: invitation.expires,
      },
    })
  } catch (error) {
    console.error('Invitation lookup error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const token = params.token

    if (!token) {
      return NextResponse.json({ error: 'Invitation token is required' }, { status: 400 })
    }

    const body = await request.json()
    const { password } = acceptInvitationSchema.parse(body)

    const invitation = await db.invitation.findUnique({
      where: { token },
      include: {
        organization: true,
      },
    })

    if (!invitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
    }

    if (invitation.status !== 'PENDING') {
      return NextResponse.json({ error: 'Invitation is no longer available' }, { status: 400 })
    }

    if (invitation.expires < new Date()) {
      await db.invitation.update({
        where: { id: invitation.id },
        data: { status: 'EXPIRED' },
      })

      return NextResponse.json({ error: 'Invitation has expired' }, { status: 400 })
    }

    const existingUser = await db.user.findUnique({
      where: { email: invitation.email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'A user with this email already exists. Please log in instead.' },
        { status: 400 }
      )
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    const { user, verificationToken, updatedInvitation } = await db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: invitation.email,
          password: hashedPassword,
          name: invitation.name ?? null,
        },
      })

      await tx.orgMember.create({
        data: {
          userId: user.id,
          organizationId: invitation.organizationId,
          role: invitation.role,
          position: invitation.position,
        },
      })

      const updatedInvitation = await tx.invitation.update({
        where: { id: invitation.id },
        data: {
          status: 'ACCEPTED',
          acceptedAt: new Date(),
          acceptedById: user.id,
        },
      })

      const verificationToken = await tx.verificationToken.create({
        data: {
          identifier: invitation.email,
          token: crypto.randomUUID(),
          type: 'email-verify',
          expires: new Date(Date.now() + ONE_DAY_IN_MS),
          userId: user.id,
        },
      })

      return { user, verificationToken, updatedInvitation }
    })

    await sendVerificationEmail(invitation.email, verificationToken.token)

    const response: Record<string, unknown> = {
      message: 'Account created. Please verify your email before logging in.',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      organization: {
        id: invitation.organizationId,
        name: invitation.organization.name,
        slug: invitation.organization.slug,
      },
      invitation: {
        id: updatedInvitation.id,
        status: updatedInvitation.status,
        acceptedAt: updatedInvitation.acceptedAt,
      },
    }

    if (process.env.NODE_ENV !== 'production') {
      response.debug = {
        verificationToken: verificationToken.token,
      }
    }

    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    console.error('Invitation acceptance error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
