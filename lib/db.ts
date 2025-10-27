import { Prisma, PrismaClient } from '@prisma/client'

if (!process.env.PRISMA_DISABLE_PREPARED_STATEMENTS) {
  process.env.PRISMA_DISABLE_PREPARED_STATEMENTS = 'true'
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const prismaLogLevels: Prisma.LogLevel[] =
  process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error']

function adjustConnectionUrlForPgBouncer(url: string | undefined): string | undefined {
  if (!url) {
    return undefined
  }

  try {
    const parsed = new URL(url)
    const host = parsed.hostname.toLowerCase()
    const port = parsed.port
    const hasPgBouncerFlag = parsed.searchParams.get('pgbouncer') === 'true'
    const forceDisablePreparedStatements =
      process.env.PRISMA_DISABLE_PREPARED_STATEMENTS === 'true'

    const looksLikeTransactionPooler =
      host.includes('pooler.') || host.includes('pgbouncer') || port === '6543'

    if (!forceDisablePreparedStatements && !looksLikeTransactionPooler && !hasPgBouncerFlag) {
      return undefined
    }

    parsed.searchParams.set('pgbouncer', 'true')

    if (!parsed.searchParams.has('connection_limit')) {
      parsed.searchParams.set('connection_limit', '1')
    }

    console.log('[db] adjusted DATABASE_URL for PgBouncer compatibility')

    return parsed.toString()
  } catch (error) {
    console.warn('[db] Failed to adjust DATABASE_URL for PgBouncer compatibility', error)
    return undefined
  }
}

const adjustedDatabaseUrl = adjustConnectionUrlForPgBouncer(process.env.DATABASE_URL)

const prismaClientOptions: Prisma.PrismaClientOptions = {
  log: prismaLogLevels,
}

if (adjustedDatabaseUrl) {
  prismaClientOptions.datasources = {
    db: {
      url: adjustedDatabaseUrl,
    },
  }
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient(prismaClientOptions)

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

/**
 * Asserts that a user has access to an organization by checking if they are a member.
 * Throws an error if the user is not a member of the organization.
 * 
 * @param userId - The ID of the user to check
 * @param orgId - The ID of the organization to check access for
 * @throws Error if the user is not a member of the organization
 */
export async function assertOrgAccess(userId: string, orgId: string): Promise<void> {
  const membership = await db.orgMember.findUnique({
    where: {
      userId_organizationId: {
        userId,
        organizationId: orgId,
      },
    },
  })

  if (!membership) {
    throw new Error(`User ${userId} does not have access to organization ${orgId}`)
  }
}
