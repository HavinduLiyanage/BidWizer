import { endOfMonth, startOfMonth } from 'date-fns'

import { prisma } from '@/lib/db'

async function main() {
  const start = startOfMonth(new Date())
  const end = endOfMonth(new Date())

  const orgs = await prisma.organization.findMany({
    select: { id: true },
  })

  for (const org of orgs) {
    const existing = await prisma.aiMonthlyUsage.findUnique({
      where: {
        organizationId_periodStart: {
          organizationId: org.id,
          periodStart: start,
        },
      },
    })

    if (!existing) {
      await prisma.aiMonthlyUsage.create({
        data: {
          organizationId: org.id,
          periodStart: start,
          periodEnd: end,
        },
      })
    }
  }

  console.log('Monthly usage window ensured for all orgs.')
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
