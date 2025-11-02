#!/usr/bin/env tsx

import { db, cleanupEmptyOrganizations } from '@/lib/db'

async function main() {
  console.log('🔎 Finding organizations with zero members...')
  const { deletedOrgIds } = await cleanupEmptyOrganizations()

  if (deletedOrgIds.length === 0) {
    console.log('✅ No orphan organizations found.')
  } else {
    console.log(`🧹 Deleted ${deletedOrgIds.length} orphan organization(s):`)
    for (const id of deletedOrgIds) {
      console.log(` - ${id}`)
    }
  }
}

main()
  .catch((err) => {
    console.error('Cleanup failed:', err)
    process.exitCode = 1
  })
  .finally(async () => {
    await db.$disconnect()
  })









