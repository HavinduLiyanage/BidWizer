#!/usr/bin/env tsx

import bcrypt from 'bcrypt'
import { randomUUID } from 'crypto'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

type CliArgs = {
  email?: string
  password?: string
  company?: string
  name?: string
  position?: string
  description?: string
  industry?: string
  website?: string
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
    else if (key === 'position') parsed.position = value
    else if (key === 'description') parsed.description = value
    else if (key === 'industry') parsed.industry = value
    else if (key === 'website') parsed.website = value
  }

  return parsed
}

function slugify(source: string): string {
  const base = source
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50)

  return base || `publisher-${randomUUID().slice(0, 8)}`
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

  const email = args.email ?? `publisher+${Date.now()}@demo.local`
  const password = args.password ?? randomUUID().replace(/-/g, '').slice(0, 16)
  const company = args.company ?? `Demo Publisher ${new Date().getFullYear()}`
  const adminName = args.name ?? 'Demo Publisher Admin'
  const position = args.position ?? 'Procurement Lead'
  const description =
    args.description ?? 'Demo publisher organization for showcasing tender creation workflows.'
  const industry = args.industry ?? 'Government'
  const website = args.website ?? 'https://example.gov'

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
        description,
        type: 'PUBLISHER',
        industry,
        website,
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
        position,
      },
    })

    return { user, organization }
  })

  console.log('✅ Publisher account created')
  console.log('---------------------------')
  console.log(`Email:    ${email}`)
  console.log(`Password: ${password}`)
  console.log(`Company:  ${organization.name}`)
  console.log(`Org ID:   ${organization.id}`)
  console.log(`User ID:  ${user.id}`)
}

if (require.main === module) {
  main()
    .catch((error) => {
      console.error('❌ Failed to create publisher account:', error)
      process.exitCode = 1
    })
    .finally(async () => {
      await prisma.$disconnect()
    })
}
