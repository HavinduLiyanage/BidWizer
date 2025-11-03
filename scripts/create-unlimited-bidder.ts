#!/usr/bin/env tsx

import bcrypt from 'bcrypt'
import { randomUUID } from 'crypto'
import { PrismaClient } from '@prisma/client'

import { ensureActiveSubscriptionForOrg } from '@/lib/subscription'

const prisma = new PrismaClient()
const FAR_FUTURE = new Date('2100-01-01T00:00:00Z')

type CliArgs = {
  email?: string
  password?: string
  company?: string
  name?: string
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2)
  const parsed: CliArgs = {}

  for (const arg of args) {
    const [key, ...rest] = arg.replace(/^-+/, '').split('=')
    if (!key || rest.length === 0) continue
    const value = rest.join('=').trim()
    if (!value) continue
    if (key === 'email') parsed.email = value
    else if (key === 'password') parsed.password = value
    else if (key === 'company') parsed.company = value
    else if (key === 'name') parsed.name = value
  }

  return parsed
}

function slugify(source: string): string {
  const base = source
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50)

  return base || `org-${randomUUID().slice(0, 8)}`
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

async function main(): Promise<void> {
  const args = parseArgs()

  const email = args.email ?? `unlimited+${Date.now()}@demo.local`
  const password = args.password ?? randomUUID().replace(/-/g, '').slice(0, 16)
  const company = args.company ?? `Unlimited Bidder ${new Date().getFullYear()}`
  const adminName = args.name ?? 'Unlimited Demo Admin'

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    throw new Error(`User with email ${email} already exists`)
  }

  const slug = await ensureUniqueSlug(slugify(company))
  const hashedPassword = await bcrypt.hash(password, 12)

  const { user, organization } = await prisma.$transaction(async (tx) => {
    const organization = await tx.organization.create({
      data: {
        name: company,
        slug,
        description: 'Unlimited bidder organization for demos/tests',
        type: 'BIDDER',
        planTier: 'ENTERPRISE',
        planExpiresAt: FAR_FUTURE,
      },
    })

    const user = await tx.user.create({
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
        userId: user.id,
        role: 'ADMIN',
        position: 'Demo Admin',
      },
    })

    return { user, organization }
  })

  await ensureActiveSubscriptionForOrg(organization.id, {
    preferredTier: 'ENTERPRISE',
    userId: user.id,
  })

  console.log('✅ Unlimited bidder account created')
  console.log('----------------------------------')
  console.log(`Email:    ${email}`)
  console.log(`Password: ${password}`)
  console.log(`Company:  ${organization.name}`)
  console.log(`Org ID:   ${organization.id}`)
}

if (require.main === module) {
  main()
    .catch((error) => {
      console.error('❌ Failed to create unlimited bidder account:', error)
      process.exitCode = 1
    })
    .finally(async () => {
      await prisma.$disconnect()
    })
}
