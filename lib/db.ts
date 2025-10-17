import { Prisma, PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const prismaLogLevels: Prisma.LogLevel[] =
  process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error']

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: prismaLogLevels,
  })

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
