#!/usr/bin/env tsx

/**
 * Remove Dummy Tenders Script
 * 
 * This script removes dummy tenders from the database.
 * It looks for tenders with IDs like "TND-2024-*" and removes them.
 * 
 * Usage:
 *   npx tsx scripts/remove-dummy-tenders.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function removeDummyTenders() {
  console.log('🚀 Starting dummy tenders removal process...')
  
  try {
    // Find tenders with dummy IDs (like TND-2024-001, etc.)
    const dummyTenderIds = [
      'TND-2024-001',
      'TND-2024-002',
      'TND-2024-003',
      'TND-2024-004',
      'TND-2024-005',
    ]

    // Check for tenders with these IDs
    const dummyTenders = await prisma.tender.findMany({
      where: {
        id: {
          in: dummyTenderIds,
        },
      },
    })

    if (dummyTenders.length === 0) {
      console.log('✅ No dummy tenders found in the database')
      return
    }

    console.log(`\n📋 Found ${dummyTenders.length} dummy tender(s) to remove:`)
    dummyTenders.forEach((tender) => {
      console.log(`   - ${tender.id}: ${tender.title}`)
    })

    // Also look for any tenders with titles matching mock data patterns
    const mockTenderTitles = [
      'Construction of Main Government Building Complex',
      'Medical Equipment Supply for Regional Hospitals',
      'Road Infrastructure Development - Phase 2',
      'Water Treatment Plant Modernization',
      'School IT Infrastructure Upgrade - District Wide',
    ]

    const matchingTenders = await prisma.tender.findMany({
      where: {
        title: {
          in: mockTenderTitles,
        },
      },
    })

    if (matchingTenders.length > 0) {
      console.log(`\n📋 Found ${matchingTenders.length} additional tender(s) with mock titles:`)
      matchingTenders.forEach((tender) => {
        console.log(`   - ${tender.id}: ${tender.title}`)
      })
    }

    // Combine all dummy tenders
    const allDummyTenders = [...dummyTenders, ...matchingTenders.filter(t => !dummyTenders.some(dt => dt.id === t.id))]
    const tenderIdsToDelete = allDummyTenders.map(t => t.id)

    if (tenderIdsToDelete.length === 0) {
      console.log('✅ No dummy tenders to remove')
      return
    }

    console.log(`\n🗑️  Removing ${tenderIdsToDelete.length} dummy tender(s)...`)

    // Delete the tenders (cascade will handle related records)
    const result = await prisma.tender.deleteMany({
      where: {
        id: {
          in: tenderIdsToDelete,
        },
      },
    })

    console.log(`✅ Successfully removed ${result.count} dummy tender(s)`)

    // Check if there are any dummy organizations (like "Ministry of Construction", etc.)
    const dummyOrgNames = [
      'Ministry of Construction',
      'Department of Health',
      'Transport Authority',
      'National Water Board',
      'Ministry of Education',
      'Government Procurement',
    ]

    const dummyOrganizations = await prisma.organization.findMany({
      where: {
        name: {
          in: dummyOrgNames,
        },
      },
      include: {
        tenders: true,
      },
    })

    if (dummyOrganizations.length > 0) {
      console.log(`\n📋 Found ${dummyOrganizations.length} dummy organization(s):`)
      dummyOrganizations.forEach((org) => {
        console.log(`   - ${org.name} (${org.tenders.length} tender(s))`)
      })

      console.log('\n🗑️  Removing dummy organizations and their tenders...')
      for (const org of dummyOrganizations) {
        // Delete organization (cascade will handle tenders)
        await prisma.organization.delete({
          where: { id: org.id },
        })
        console.log(`   ✅ Removed organization: ${org.name}`)
      }
    }

    console.log('\n🎉 Dummy tenders removal completed successfully!')
    
  } catch (error) {
    console.error('❌ Error removing dummy tenders:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
if (require.main === module) {
  removeDummyTenders()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error)
      process.exit(1)
    })
}


