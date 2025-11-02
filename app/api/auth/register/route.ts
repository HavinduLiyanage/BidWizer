import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcrypt'
import { z } from 'zod'
import crypto from 'crypto'
import { PLAN_SPECS, type PlanTier, DEFAULT_TRIAL_DAYS } from '@/lib/entitlements'
import { db } from '@/lib/db'
import { sendInvitationEmail, sendVerificationEmail } from '@/lib/email'
import { env } from '@/lib/env'
const PLAN_OPTIONS = ['FREE', 'STANDARD', 'PREMIUM', 'ENTERPRISE'] as const satisfies readonly PlanTier[]

function parsePlanTier(value: string | null | undefined): PlanTier | null {
  if (!value) {
    return null
  }
  const upper = value.toUpperCase()
  return PLAN_OPTIONS.includes(upper as PlanTier) ? (upper as PlanTier) : null
}

const teamMemberSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  position: z.string().min(2, 'Position must be at least 2 characters'),
})

const createStrongPasswordSchema = () =>
  z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(/[A-Z]/, 'Password must include at least one uppercase letter')
    .regex(/[a-z]/, 'Password must include at least one lowercase letter')
    .regex(/\d/, 'Password must include at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must include at least one special character')

const bidderRegistrationSchema = z
  .object({
    flow: z.literal('bidder'),
    step1: z
      .object({
        companyName: z.string().min(2, 'Company name must be at least 2 characters'),
        firstName: z.string().min(2, 'First name must be at least 2 characters'),
        lastName: z.string().min(2, 'Last name must be at least 2 characters'),
        position: z.string().min(2, 'Position must be at least 2 characters'),
        email: z.string().email('Invalid email address'),
        password: createStrongPasswordSchema(),
        confirmPassword: createStrongPasswordSchema(),
      })
      .refine((data) => data.password === data.confirmPassword, {
        message: 'Passwords do not match',
        path: ['confirmPassword'],
      }),
    step2: z
      .object({
        industry: z.string().min(2, 'Industry is required'),
        otherIndustry: z.string().max(128).optional(),
        website: z.string().url('Website must be a valid URL'),
        about: z.string().min(20, 'Tell us a bit more about the company'),
      })
      .superRefine((data, ctx) => {
        if (data.industry === 'other' && (!data.otherIndustry || data.otherIndustry.trim().length === 0)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['otherIndustry'],
            message: 'Please specify your industry',
          })
        }
      }),
    team: z.object({
      plan: z.enum(PLAN_OPTIONS),
      teamMembers: z.array(teamMemberSchema).default([]),
    }),
  })
  .superRefine((data, ctx) => {
    const { plan, teamMembers } = data.team
    const planSpec = PLAN_SPECS[plan]
    const seatsForPlan = planSpec.seats ?? 1
    const availableSeats = Math.max(seatsForPlan - 1, 0) // Admin seat already taken

    if (teamMembers.length > availableSeats) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['team', 'teamMembers'],
        message: `${planSpec.label} allows ${availableSeats} team members but ${teamMembers.length} were provided`,
      })
    }

    const normalizedAdminEmail = data.step1.email.toLowerCase()
    const uniqueEmails = new Set<string>()

    for (const member of teamMembers) {
      const email = member.email.toLowerCase()
      if (email === normalizedAdminEmail) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['team', 'teamMembers'],
          message: `Team member email ${member.email} matches the admin email`,
        })
      }
      if (uniqueEmails.has(email)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['team', 'teamMembers'],
          message: `Duplicate team member email detected: ${member.email}`,
        })
      }
      uniqueEmails.add(email)
    }
  })

const publisherRegistrationSchema = z
  .object({
    flow: z.literal('publisher'),
    organizationName: z.string().min(2, 'Organization name must be at least 2 characters'),
    contactPerson: z.string().min(2, 'Contact person must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(8, 'Password confirmation must be at least 8 characters'),
    website: z.string().url('Website must be a valid URL').optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

const legacyRegisterSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
})

const ONE_DAY_IN_MS = 24 * 60 * 60 * 1000
const SEVEN_DAYS_IN_MS = 7 * ONE_DAY_IN_MS
const TRIAL_DURATION_MS = DEFAULT_TRIAL_DAYS * ONE_DAY_IN_MS

function computeTrialExpiry(plan: PlanTier): Date | null {
  if (plan !== 'FREE') {
    return null
  }
  return new Date(Date.now() + TRIAL_DURATION_MS)
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json()
    const flow: string = payload?.flow ?? 'legacy'
    const planFromQuery = parsePlanTier(request.nextUrl?.searchParams.get('plan'))

    if (flow === 'bidder') {
      return await handleBidderRegistration(payload, planFromQuery ?? undefined)
    }

    if (flow === 'publisher') {
      return await handlePublisherRegistration(payload, planFromQuery ?? undefined)
    }

    return await handleLegacyRegistration(payload, planFromQuery ?? undefined)
  } catch (error) {
    console.error('Registration error:', error)

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

async function handleBidderRegistration(rawBody: unknown, selectedPlan?: PlanTier) {
  const data = bidderRegistrationSchema.parse(rawBody)
  const { step1, step2, team } = data
  const planTier = selectedPlan ?? team.plan
  const planExpiresAt = computeTrialExpiry(planTier)

  const existingUser = await db.user.findUnique({
    where: { email: step1.email },
  })

  if (existingUser) {
    return NextResponse.json(
      { error: 'User with this email already exists' },
      { status: 400 }
    )
  }

  const hashedPassword = await bcrypt.hash(step1.password, 12)
  const adminName = `${step1.firstName} ${step1.lastName}`.trim()
  const industry =
    step2.industry === 'other' ? step2.otherIndustry?.trim() ?? 'Other' : step2.industry

  const organizationSlug = await generateOrganizationSlug(step1.companyName)
  const inviteExpiry = new Date(Date.now() + SEVEN_DAYS_IN_MS)

  const { user, organization, invitations } = await db.$transaction(
    async (tx) => {
      const organization = await tx.organization.create({
        data: {
          name: step1.companyName,
          slug: organizationSlug,
          description: step2.about,
          industry,
          website: step2.website,
          planTier,
          planExpiresAt,
          type: 'BIDDER',
        },
      })

      const user = await tx.user.create({
        data: {
          email: step1.email,
          password: hashedPassword,
          name: adminName,
          emailVerified: new Date(), // Auto-verify admin user email
        },
      })

      await tx.orgMember.create({
        data: {
          userId: user.id,
          organizationId: organization.id,
          role: 'ADMIN',
          position: step1.position,
        },
      })

      const invitations = await Promise.all(
        team.teamMembers.map((member) =>
          tx.invitation.create({
            data: {
              email: member.email,
              name: member.name,
              position: member.position,
              token: crypto.randomUUID(),
              status: 'PENDING',
              type: 'TEAM_MEMBER',
              role: 'MEMBER',
              expires: inviteExpiry,
              invitedById: user.id,
              organizationId: organization.id,
            },
          })
        )
      )

      return { user, organization, invitations }
    }
  )

  await Promise.all(
    invitations.map((invitation) =>
      sendInvitationEmail({
        email: invitation.email,
        inviterName: adminName || 'BidWizer Admin',
        companyName: organization.name,
        position: invitation.position ?? 'Team Member',
        token: invitation.token,
      })
    )
  )

  const response: Record<string, unknown> = {
    message:
      'Bidder registration completed successfully. Your account is ready to use. Invitations have been sent to your team members.',
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
    organization: {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      planTier: organization.planTier,
      planExpiresAt: organization.planExpiresAt,
    },
    pendingInvitations: invitations.map((invitation) => ({
      id: invitation.id,
      email: invitation.email,
      name: invitation.name,
      position: invitation.position,
      status: invitation.status,
      expiresAt: invitation.expires,
    })),
    requiresEmailVerification: false,
  }

  if (env.NODE_ENV !== 'production') {
    response.debug = {
      invitationTokens: invitations.map((invitation) => ({
        email: invitation.email,
        token: invitation.token,
      })),
    }
  }

  return NextResponse.json(response, { status: 201 })
}

async function handlePublisherRegistration(rawBody: unknown, selectedPlan?: PlanTier) {
  const data = publisherRegistrationSchema.parse(rawBody)
  const planTier = selectedPlan ?? 'FREE'
  const planExpiresAt = computeTrialExpiry(planTier)

  const existingUser = await db.user.findUnique({
    where: { email: data.email },
  })

  if (existingUser) {
    return NextResponse.json(
      { error: 'User with this email already exists' },
      { status: 400 }
    )
  }

  const hashedPassword = await bcrypt.hash(data.password, 12)
  const organizationSlug = await generateOrganizationSlug(data.organizationName)

  const { user, organization, verificationToken } = await db.$transaction(async (tx) => {
    const organization = await tx.organization.create({
      data: {
        name: data.organizationName,
        slug: organizationSlug,
        description: 'Publisher workspace created during registration',
        website: data.website ?? null,
        type: 'PUBLISHER',
        planTier,
        planExpiresAt,
      },
    })

    const user = await tx.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        name: data.contactPerson,
      },
    })

    await tx.orgMember.create({
      data: {
        userId: user.id,
        organizationId: organization.id,
        role: 'ADMIN',
        position: 'Publisher Admin',
      },
    })

    const verificationToken = await tx.verificationToken.create({
      data: {
        identifier: data.email,
        token: crypto.randomUUID(),
        type: 'email-verify',
        expires: new Date(Date.now() + ONE_DAY_IN_MS),
        userId: user.id,
      },
    })

    return { user, organization, verificationToken }
  })

  await sendVerificationEmail(data.email, verificationToken.token)

  const response: Record<string, unknown> = {
    message: 'Publisher registration initiated. Please verify your email to activate the account.',
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
    organization: {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      type: organization.type,
      planTier: organization.planTier,
      planExpiresAt: organization.planExpiresAt,
    },
    requiresEmailVerification: true,
  }

  if (env.NODE_ENV !== 'production') {
    response.debug = {
      verificationToken: verificationToken.token,
    }
  }

  return NextResponse.json(response, { status: 201 })
}

async function handleLegacyRegistration(rawBody: unknown, selectedPlan?: PlanTier) {
  const { email, password, name } = legacyRegisterSchema.parse(rawBody)
  const planTier = selectedPlan ?? 'FREE'
  const planExpiresAt = computeTrialExpiry(planTier)

  const existingUser = await db.user.findUnique({
    where: { email },
  })

  if (existingUser) {
    return NextResponse.json(
      { error: 'User with this email already exists' },
      { status: 400 }
    )
  }

  const hashedPassword = await bcrypt.hash(password, 12)
  const organizationSlug = await generateOrganizationSlug(name ? `${name} Org` : email.split('@')[0])

  const { user, verificationToken } = await db.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        email,
        password: hashedPassword,
        name: name || null,
      },
    })

    const organization = await tx.organization.create({
      data: {
        name: `${name || 'My Company'} Organization`,
        slug: organizationSlug,
        description: 'Default organization created during registration',
        type: 'BIDDER',
        planTier,
        planExpiresAt,
      },
    })

    await tx.orgMember.create({
      data: {
        userId: newUser.id,
        organizationId: organization.id,
        role: 'ADMIN',
      },
    })

    const tokenRecord = await tx.verificationToken.create({
      data: {
        identifier: email,
        token: crypto.randomUUID(),
        type: 'email-verify',
        expires: new Date(Date.now() + ONE_DAY_IN_MS),
        userId: newUser.id,
      },
    })

    return { user: newUser, verificationToken: tokenRecord }
  })

  await sendVerificationEmail(email, verificationToken.token)

  const response: Record<string, unknown> = {
    message: 'User registered successfully. Please verify your email to activate the account.',
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
    requiresEmailVerification: true,
  }

  if (env.NODE_ENV !== 'production') {
    response.debug = {
      verificationToken: verificationToken.token,
    }
  }

  return NextResponse.json(response, { status: 201 })
}

async function generateOrganizationSlug(source: string) {
  const base = slugify(source)
  if (!base) {
    const fallback = `org-${crypto.randomUUID().slice(0, 8)}`
    return await ensureUniqueSlug(fallback)
  }
  return await ensureUniqueSlug(base)
}

async function ensureUniqueSlug(baseSlug: string) {
  let slug = baseSlug
  let counter = 1

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await db.organization.findUnique({
      where: { slug },
      select: { id: true },
    })

    if (!existing) {
      return slug
    }

    slug = `${baseSlug}-${counter}`
    counter += 1
  }
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50) // keep slugs reasonable
}
