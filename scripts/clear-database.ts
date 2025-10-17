#!/usr/bin/env tsx

/**
 * Database Clearing Script
 * 
 * This script clears all data from the database while preserving the schema.
 * It handles foreign key constraints by deleting records in the correct order.
 * 
 * Usage:
 *   npm run clear-db
 *   or
 *   npx tsx scripts/clear-database.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function clearDatabase() {
  console.log('🗑️  Starting database clearing process...')
  
  try {
    // Delete records in order to respect foreign key constraints
    // Start with tables that have foreign keys pointing to them
    
    console.log('📧 Clearing verification tokens...')
    await prisma.verificationToken.deleteMany()
    
    console.log('💬 Clearing chat messages...')
    await prisma.chatMessage.deleteMany()
    
    console.log('🧵 Clearing chat threads...')
    await prisma.chatThread.deleteMany()
    
    console.log('📊 Clearing AI usage records...')
    await prisma.aiUsage.deleteMany()
    
    console.log('📋 Clearing tender documents...')
    await prisma.tenderDocument.deleteMany()
    
    console.log('📄 Clearing tender requirements...')
    await prisma.tenderRequirement.deleteMany()
    
    console.log('📝 Clearing tenders...')
    await prisma.tender.deleteMany()
    
    console.log('👥 Clearing organization invitations...')
    await prisma.invitation.deleteMany()
    
    console.log('👤 Clearing organization members...')
    await prisma.orgMember.deleteMany()
    
    console.log('💳 Clearing subscriptions...')
    await prisma.subscription.deleteMany()
    
    console.log('📦 Clearing plans...')
    await prisma.plan.deleteMany()
    
    console.log('🏢 Clearing organizations...')
    await prisma.organization.deleteMany()
    
    console.log('👤 Clearing users...')
    await prisma.user.deleteMany()
    
    console.log('✅ Database cleared successfully!')
    
    // Verify the database is empty
    const counts = await Promise.all([
      prisma.user.count(),
      prisma.organization.count(),
      prisma.tender.count(),
      prisma.subscription.count(),
      prisma.verificationToken.count(),
    ])
    
    const totalRecords = counts.reduce((sum, count) => sum + count, 0)
    
    if (totalRecords === 0) {
      console.log('🎉 Verification: All tables are now empty!')
    } else {
      console.log(`⚠️  Warning: ${totalRecords} records still remain in the database`)
    }
    
  } catch (error) {
    console.error('❌ Error clearing database:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
if (require.main === module) {
  clearDatabase()
    .then(() => {
      console.log('🏁 Database clearing completed!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('💥 Database clearing failed:', error)
      process.exit(1)
    })
}

export { clearDatabase }
