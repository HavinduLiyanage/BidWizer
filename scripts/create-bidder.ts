#!/usr/bin/env tsx

import bcrypt from 'bcrypt'
import { randomUUID } from 'crypto'
import { PrismaClient, type PlanTier, OrgMemberRole } from '@prisma/client'

import { ensureActiveSubscriptionForOrg } from '@/lib/subscription'

const prisma = new PrismaClient()
const FAR_FUTURE = new Date('2100-01-01T00:00:00Z')
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000

type PlanKind = 'trial' | 'standard' | 'premium'

type CliArgs = {
  email?: string
  password?: string
  company?: string
  name?: string
  plan?: string
  position?: string
  description?: string
  industry?: string
  website?: string
  secondaryEmail?: string
  secondaryPassword?: string
  secondaryName?: string
  secondaryPosition?: string
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2)
  const parsed: CliArgs = {}

  for (const arg of args) {
    const [key, ...rest] = arg.replace(/^-+/, '').split('=')
    if (!key || rest.length === 0) continue
    const value = rest.join('=').trim()
    if (!value) continue

    switch (key) {
      case 'email':
        parsed.email = value
        break
      case 'password':
        parsed.password = value
        break
      case 'company':
        parsed.company = value
        break
      case 'name':
        parsed.name = value
        break
      case 'plan':
        parsed.plan = value
        break
      case 'position':
        parsed.position = value
        break
      case 'description':
        parsed.description = value
        break
      case 'industry':
        parsed.industry = value
        break
      case 'website':
        parsed.website = value
        break
      case 'secondaryEmail':
        parsed.secondaryEmail = value
        break
      case 'secondaryPassword':
        parsed.secondaryPassword = value
        break
      case 'secondaryName':
        parsed.secondaryName = value
        break
      case 'secondaryPosition':
        parsed.secondaryPosition = value
        break
      default:
        break
    }
  }

  return parsed
}

function slugify(source: string): string {
  const base = source
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50)

  return base || `bidder-${randomUUID().slice(0, 8)}`
}

async function ensureUniqueSlug(base: string): Promise<string> {
  let candidate = base
  let suffix = 1
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await prisma.organization.findUnique({
      where: { slug: candidate },
      select: { id: true },
    })
    if (!existing) return candidate
    candidate = `${base}-${suffix}`
    suffix += 1
  }
}

function parsePlanKind(input?: string): PlanKind {
  const normalized = (input ?? 'trial').toLowerCase()
  if (['trial', 'free'].includes(normalized)) return 'trial'
  if (['standard', '6000', '6k', 'lkr6000'].includes(normalized)) return 'standard'
  if (['premium', '10000', '10k', 'lkr10000'].includes(normalized)) return 'premium'
  throw new Error(
    `Unsupported plan "${input}". Use one of: trial, standard (6k), premium (10k).`,
  )
}

function resolvePlanTier(plan: PlanKind): PlanTier {
  switch (plan) {
    case 'trial':
      return 'FREE'
    case 'standard':
      return 'STANDARD'
    case 'premium':
      return 'PREMIUM'
    default:
      return 'FREE'
  }
}

interface CreatedMember {
  email: string
  password: string
  userId: string
  role: OrgMemberRole
  name: string
  position?: string
}

async function createMember(
  organizationId: string,
  email: string,
  password: string,
  name: string,
  role: OrgMemberRole,
  position?: string,
): Promise<CreatedMember> {
  const hashedPassword = await bcrypt.hash(password, 12)
  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name,
      emailVerified: new Date(),
    },
  })

  await prisma.orgMember.create({
    data: {
      organizationId,
      userId: user.id,
      role,
      position,
    },
  })

  return {
    email,
    password,
    userId: user.id,
    role,
    name,
    position,
  }
}

async function main(): Promise<void> {
  const args = parseArgs()
  const planKind = parsePlanKind(args.plan)
  const planTier = resolvePlanTier(planKind)

  const now = new Date()
  const email =
    args.email ??
    `${planKind === 'trial' ? 'trial' : planKind}-bidder+${Date.now()}@demo.local`
  const password = args.password ?? randomUUID().replace(/-/g, '').slice(0, 16)
  const company =
    args.company ??
    (planKind === 'trial'
      ? `Trial Bidder ${new Date().getFullYear()}`
      : planKind === 'standard'
        ? 'Standard Plan Bidder'
        : 'Premium Plan Bidder')
  const adminName = args.name ?? `${planKind.charAt(0).toUpperCase()}${planKind.slice(1)} Admin`
  const position = args.position ?? 'Admin'
  const description =
    args.description ??
    `Demo bidder organization for ${planKind === 'trial' ? 'trial access' : `${planKind} plan`} demos.`
  const industry = args.industry ?? 'Construction'
  const website = args.website ?? 'https://example.com'

  const existingUser = await prisma.user.findUnique({ where: { email } })
  if (existingUser) {
    throw new Error(`User with email ${email} already exists`)
  }

  const slug = await ensureUniqueSlug(slugify(company))
  const planExpiresAt =
    planTier === 'FREE' ? new Date(now.getTime() + ONE_WEEK_MS) : FAR_FUTURE

  const hashedPassword = await bcrypt.hash(password, 12)

  const { organization, admin } = await prisma.$transaction(async (tx) => {
    const organization = await tx.organization.create({
      data: {
        name: company,
        slug,
        description,
        type: 'BIDDER',
        industry,
        website,
        planTier,
        planExpiresAt,
      },
    })

    const admin = await tx.user.create({
      data: {
        email,
        password: hashedPassword,
        name: adminName,
        emailVerified: new Date(),
      },
    })

    await tx.orgMember.create({
      data: {
        organizationId: organization.id,
        userId: admin.id,
        role: 'ADMIN',
        position,
      },
    })

    return { organization, admin }
  })

  await ensureActiveSubscriptionForOrg(organization.id, {
    preferredTier: planTier,
    userId: admin.id,
  })

  let secondaryMember: CreatedMember | null = null
  if (planKind === 'premium') {
    const secondaryEmail =
      args.secondaryEmail ?? `premium-member+${Date.now()}@demo.local`
    const secondaryPassword =
      args.secondaryPassword ?? randomUUID().replace(/-/g, '').slice(0, 14)
    const secondaryName = args.secondaryName ?? 'Premium Team Member'
    const secondaryPosition = args.secondaryPosition ?? 'Bid Manager'

    const existingSecondary = await prisma.user.findUnique({
      where: { email: secondaryEmail },
    })
    if (existingSecondary) {
      throw new Error(`Secondary user with email ${secondaryEmail} already exists`)
    }

    secondaryMember = await createMember(
      organization.id,
      secondaryEmail,
      secondaryPassword,
      secondaryName,
      'MEMBER',
      secondaryPosition,
    )
  }

  console.log('✅ Bidder account created')
  console.log('------------------------')
  console.log(`Plan:     ${planTier}`)
  console.log(`Company:  ${organization.name}`)
  console.log(`Org ID:   ${organization.id}`)
  console.log('')
  console.log('Admin User')
  console.log('----------')
  console.log(`Email:    ${email}`)
  console.log(`Password: ${password}`)
  console.log(`User ID:  ${admin.id}`)

  if (secondaryMember) {
    console.log('')
    console.log('Secondary User')
    console.log('--------------')
    console.log(`Email:    ${secondaryMember.email}`)
    console.log(`Password: ${secondaryMember.password}`)
    console.log(`User ID:  ${secondaryMember.userId}`)
  }
}

if (require.main === module) {
  main()
    .catch((error) => {
      console.error('❌ Failed to create bidder account:', error)
      process.exitCode = 1
    })
    .finally(async () => {
      await prisma.$disconnect()
    })
}
