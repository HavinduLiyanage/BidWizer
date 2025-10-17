import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const forgotSchema = z.object({
  email: z.string().email('Invalid email address'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = forgotSchema.parse(body)

    // Find user by email
    const user = await db.user.findUnique({
      where: { email },
    })

    // Always return success to prevent email enumeration
    // But only send email if user exists
    if (user) {
      // Generate reset token
      const resetToken = crypto.randomUUID()
      const expires = new Date()
      expires.setHours(expires.getHours() + 1) // 1 hour

      // Delete any existing reset tokens for this user
      await db.verificationToken.deleteMany({
        where: {
          identifier: email,
          type: 'reset-password',
        },
      })

      // Create new reset token
      await db.verificationToken.create({
        data: {
          identifier: email,
          token: resetToken,
          type: 'reset-password',
          expires,
          userId: user.id,
        },
      })

      // Send reset email
      try {
        await resend.emails.send({
          from: 'BidWizer <noreply@bidwizer.com>',
          to: [email],
          subject: 'Reset your BidWizer password',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Password Reset Request</h2>
              <p>You requested to reset your password. Click the link below to reset it:</p>
              <a href="${process.env.NEXTAUTH_URL}/reset-password?token=${resetToken}" 
                 style="background-color: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
                Reset Password
              </a>
              <p>This link will expire in 1 hour.</p>
              <p>If you didn't request a password reset, please ignore this email.</p>
            </div>
          `,
        })
      } catch (emailError) {
        console.error('Failed to send reset email:', emailError)
        // Don't fail the request if email fails
      }
    }

    // Always return success to prevent email enumeration
    return NextResponse.json(
      {
        message: 'If an account with that email exists, we have sent a password reset link.',
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Forgot password error:', error)

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
