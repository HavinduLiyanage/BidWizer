import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcrypt'
import { z } from 'zod'
import { db } from '@/lib/db'

const resetSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, password } = resetSchema.parse(body)

    // Find reset token
    const resetToken = await db.verificationToken.findUnique({
      where: { token },
      include: { user: true },
    })

    if (!resetToken) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 400 }
      )
    }

    // Check if token is expired
    if (resetToken.expires < new Date()) {
      // Clean up expired token
      await db.verificationToken.delete({
        where: { id: resetToken.id },
      })

      return NextResponse.json(
        { error: 'Token has expired' },
        { status: 400 }
      )
    }

    // Check if token type is correct
    if (resetToken.type !== 'reset-password') {
      return NextResponse.json(
        { error: 'Invalid token type' },
        { status: 400 }
      )
    }

    // Hash new password
    const saltRounds = 12
    const hashedPassword = await bcrypt.hash(password, saltRounds)

    // Update user's password
    await db.user.update({
      where: { id: resetToken.userId },
      data: { password: hashedPassword },
    })

    // Clean up reset token
    await db.verificationToken.delete({
      where: { id: resetToken.id },
    })

    return NextResponse.json(
      {
        message: 'Password reset successfully',
        user: {
          id: resetToken.user.id,
          email: resetToken.user.email,
          name: resetToken.user.name,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Password reset error:', error)

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
