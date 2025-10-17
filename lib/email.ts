import { Resend } from 'resend'

const APP_BASE_URL = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'

const resendClient =
  process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.trim().length > 0
    ? new Resend(process.env.RESEND_API_KEY)
    : null

export function isEmailServiceEnabled() {
  return Boolean(resendClient)
}

export async function sendVerificationEmail(email: string, token: string) {
  if (!resendClient) {
    console.warn('Resend API key not configured; skipping verification email.')
    return
  }

  try {
    const verificationLink = `${APP_BASE_URL}/verify-email?token=${encodeURIComponent(token)}`

    await resendClient.emails.send({
      from: "BidWizer <onboarding@resend.dev>",
      to: [email],
      subject: 'Verify your BidWizer account',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px;">
          <h2 style="color: #111827;">Welcome to BidWizer!</h2>
          <p style="color: #4b5563;">Thanks for registering. Please verify your email address by clicking the button below:</p>
          <p style="text-align: center; margin: 32px 0;">
            <a href="${verificationLink}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
              Verify email address
            </a>
          </p>
          <p style="color: #6b7280;">This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.</p>
        </div>
      `,
    })
  } catch (error) {
    console.error('Failed to send verification email:', error)
  }
}

export async function sendBidderRegistrationConfirmationEmail({
  email,
  firstName,
  lastName,
  companyName,
  position,
  resumeToken,
}: {
  email: string
  firstName: string
  lastName: string
  companyName: string
  position: string
  resumeToken: string
}) {
  if (!resendClient) {
    console.warn('Resend API key not configured; skipping bidder registration confirmation email.')
    return false
  }

  try {
    const safeName = firstName.trim() || 'there'
    const resumeLink = `${APP_BASE_URL}/register/bidder/email-confirmed?token=${encodeURIComponent(resumeToken)}&email=${encodeURIComponent(email)}`

    await resendClient.emails.send({
      from: "BidWizer <onboarding@resend.dev>",
      to: [email],
      subject: 'Confirm your BidWizer account',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px;">
          <h2 style="color: #111827;">Hi ${safeName},</h2>
          <p style="color: #4b5563;">
            Thanks for registering with BidWizer for <strong>${companyName}</strong>.
            Please confirm your email address to continue setting up your account.
          </p>
          <p style="color: #4b5563;">
            Click the button below to confirm your email and continue with Step 2 of your registration.
          </p>
          <p style="text-align: center; margin: 32px 0;">
            <a href="${resumeLink}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
              Confirm email & continue
            </a>
          </p>
          <p style="color: #6b7280;">
            If you did not create this account, you can safely ignore this email.
          </p>
          <p style="color: #9ca3af; font-size: 12px;">If the button doesn't work, copy and paste this link into your browser:</p>
          <p style="color: #2563eb; font-size: 12px; word-break: break-all;">${resumeLink}</p>
        </div>
      `,
    })

    return true
  } catch (error) {
    console.error('Failed to send bidder registration confirmation email:', error)
    return false
  }
}


export async function sendInvitationEmail({
  email,
  inviterName,
  companyName,
  position,
  token,
}: {
  email: string
  inviterName: string
  companyName: string
  position: string
  token: string
}) {
  if (!resendClient) {
    console.warn('Resend API key not configured; skipping invitation email.')
    return
  }

  try {
    const inviteLink = `${APP_BASE_URL}/team/join?token=${encodeURIComponent(token)}`
    const recipient = email.trim()

    console.info(`[email] Sending invitation to ${recipient} for ${companyName}`)

    await resendClient.emails.send({
      from: "BidWizer <onboarding@resend.dev>",
      to: [recipient],
      subject: `Join ${companyName} on BidWizer`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px;">
          <h2 style="color: #111827; margin-bottom: 12px;">You're invited to BidWizer</h2>
          <p style="color: #4b5563;">
            <strong>${inviterName}</strong> invited you to join <strong>${companyName}</strong> on BidWizer${position ? ` as a <strong>${position}</strong>` : ''}.
          </p>
          <p style="color: #4b5563;">
            Click below to create your login. You'll choose a password and then sign in with your email address.
          </p>
          <p style="text-align: center; margin: 28px 0;">
            <a href="${inviteLink}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
              Join your team
            </a>
          </p>
          <p style="color: #4b5563;">
            This link expires in 7 days. If the button doesn't work, copy and paste this link into your browser:
          </p>
          <p style="color: #2563eb; font-size: 12px; word-break: break-all;">${inviteLink}</p>
        </div>
      `,
    })
  } catch (error) {
    console.error(`Failed to send invitation email to ${email}:`, error)
    throw error
  }
}
