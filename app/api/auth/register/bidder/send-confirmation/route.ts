import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { sendBidderRegistrationConfirmationEmail } from '@/lib/email'

const confirmationRequestSchema = z.object({
  email: z.string().email('Invalid email address'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  companyName: z.string().min(1, 'Company name is required'),
  position: z.string().min(1, 'Position is required'),
  resumeToken: z.string().uuid('Resume token is invalid'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = confirmationRequestSchema.parse(body)

    const wasSent = await sendBidderRegistrationConfirmationEmail({
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      companyName: data.companyName,
      position: data.position,
      resumeToken: data.resumeToken,
    })

    const message = wasSent
      ? 'Confirmation email sent successfully.'
      : 'Email service is not configured. Confirmation simulated locally.'

    return NextResponse.json(
      {
        message,
        sent: wasSent,
      },
      { status: 200 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Bidder confirmation email error:', error)

    return NextResponse.json(
      { error: 'Unable to send confirmation email. Please try again.' },
      { status: 500 }
    )
  }
}
