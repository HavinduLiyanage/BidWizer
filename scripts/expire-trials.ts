import { prisma } from '@/lib/db'

async function main() {
  const now = new Date()
  const expired = await prisma.organization.updateMany({
    where: {
      planTier: 'FREE',
      planExpiresAt: { lt: now },
    },
    data: { planTier: 'FREE' },
  })

  console.log(`Trials checked; ${expired.count} orgs past expiry.`)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
