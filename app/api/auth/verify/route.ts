import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'

const verifySchema = z.object({
  token: z.string().min(1, 'Token is required'),
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      )
    }

    const { token: validatedToken } = verifySchema.parse({ token })

    // Find verification token
    const verificationToken = await db.verificationToken.findUnique({
      where: { token: validatedToken },
      include: { user: true },
    })

    if (!verificationToken) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 400 }
      )
    }

    // Check if token is expired
    if (verificationToken.expires < new Date()) {
      // Clean up expired token
      await db.verificationToken.delete({
        where: { id: verificationToken.id },
      })

      return NextResponse.json(
        { error: 'Token has expired' },
        { status: 400 }
      )
    }

    // Check if token type is correct
    if (verificationToken.type !== 'email-verify') {
      return NextResponse.json(
        { error: 'Invalid token type' },
        { status: 400 }
      )
    }

    // Update user's email verification status
    await db.user.update({
      where: { id: verificationToken.userId },
      data: { emailVerified: new Date() },
    })

    // Clean up verification token
    await db.verificationToken.delete({
      where: { id: verificationToken.id },
    })

    return NextResponse.json(
      {
        message: 'Email verified successfully',
        user: {
          id: verificationToken.user.id,
          email: verificationToken.user.email,
          name: verificationToken.user.name,
          emailVerified: true,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Verification error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token } = verifySchema.parse(body)

    // Find verification token
    const verificationToken = await db.verificationToken.findUnique({
      where: { token },
      include: { user: true },
    })

    if (!verificationToken) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 400 }
      )
    }

    // Check if token is expired
    if (verificationToken.expires < new Date()) {
      // Clean up expired token
      await db.verificationToken.delete({
        where: { id: verificationToken.id },
      })

      return NextResponse.json(
        { error: 'Token has expired' },
        { status: 400 }
      )
    }

    // Check if token type is correct
    if (verificationToken.type !== 'email-verify') {
      return NextResponse.json(
        { error: 'Invalid token type' },
        { status: 400 }
      )
    }

    // Update user's email verification status
    await db.user.update({
      where: { id: verificationToken.userId },
      data: { emailVerified: new Date() },
    })

    // Clean up verification token
    await db.verificationToken.delete({
      where: { id: verificationToken.id },
    })

    return NextResponse.json(
      {
        message: 'Email verified successfully',
        user: {
          id: verificationToken.user.id,
          email: verificationToken.user.email,
          name: verificationToken.user.name,
          emailVerified: true,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Verification error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
