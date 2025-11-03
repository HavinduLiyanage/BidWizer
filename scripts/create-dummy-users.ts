#!/usr/bin/env tsx

/**
 * Dummy Users Creation Script
 * 
 * This script creates two dummy users - one bidder and one publisher -
 * with their respective organizations and memberships.
 * 
 * Usage:
 *   npx tsx scripts/create-dummy-users.ts
 */

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

// Dummy user data
const DUMMY_USERS = {
  bidder: {
    email: 'bidder@example.com',
    password: 'bidder123',
    name: 'John Bidder',
    organizationName: 'Bidder Corp',
    organizationDescription: 'A construction company specializing in infrastructure projects',
    industry: 'Construction',
    website: 'https://biddercorp.com',
    position: 'Project Manager'
  },
  publisher: {
    email: 'publisher@example.com', 
    password: 'publisher123',
    name: 'Jane Publisher',
    organizationName: 'Government Procurement',
    organizationDescription: 'Government agency responsible for public procurement',
    industry: 'Government',
    website: 'https://govprocurement.gov',
    position: 'Procurement Officer'
  }
}

async function generateOrganizationSlug(name: string): Promise<string> {
  const baseSlug = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .trim()

  let slug = baseSlug
  let counter = 1

  while (true) {
    const existing = await prisma.organization.findUnique({
      where: { slug }
    })
    
    if (!existing) break
    
    slug = `${baseSlug}-${counter}`
    counter++
  }

  return slug
}

async function createDummyUser(userType: 'bidder' | 'publisher') {
  const userData = DUMMY_USERS[userType]
  const orgType = userType === 'bidder' ? 'BIDDER' : 'PUBLISHER'
  
  console.log(`\n🏗️  Creating ${userType} user: ${userData.email}`)
  
  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: userData.email }
  })
  
  if (existingUser) {
    console.log(`⚠️  User ${userData.email} already exists, skipping...`)
    return {
      email: userData.email,
      password: userData.password,
      organizationType: orgType
    }
  }
  
  // Hash password
  const hashedPassword = await bcrypt.hash(userData.password, 12)
  
  // Generate organization slug
  const organizationSlug = await generateOrganizationSlug(userData.organizationName)
  
  // Create user, organization, and membership in a transaction
  const result = await prisma.$transaction(async (tx) => {
    // Create organization
    const organization = await tx.organization.create({
      data: {
        name: userData.organizationName,
        slug: organizationSlug,
        description: userData.organizationDescription,
        industry: userData.industry,
        website: userData.website,
        type: orgType,
      }
    })
    
    // Create user
    const user = await tx.user.create({
      data: {
        email: userData.email,
        password: hashedPassword,
        name: userData.name,
        emailVerified: new Date(), // Auto-verify for dummy users
      }
    })
    
    // Create organization membership
    await tx.orgMember.create({
      data: {
        userId: user.id,
        organizationId: organization.id,
        role: 'ADMIN',
        position: userData.position,
      }
    })
    
    return { user, organization }
  })
  
  console.log(`✅ Created ${userType} user successfully!`)
  console.log(`   📧 Email: ${userData.email}`)
  console.log(`   🔑 Password: ${userData.password}`)
  console.log(`   🏢 Organization: ${result.organization.name}`)
  console.log(`   🆔 Organization ID: ${result.organization.id}`)
  
  return {
    email: userData.email,
    password: userData.password,
    organizationType: orgType,
    organizationId: result.organization.id,
    organizationSlug: result.organization.slug
  }
}

async function createDummyUsers() {
  console.log('🚀 Starting dummy users creation process...')
  
  try {
    const bidderResult = await createDummyUser('bidder')
    const publisherResult = await createDummyUser('publisher')
    
    console.log('\n🎉 Dummy users creation completed successfully!')
    console.log('\n📋 User Credentials:')
    console.log('=' .repeat(50))
    
    console.log('\n🏗️  BIDDER USER:')
    console.log(`   Email: ${bidderResult.email}`)
    console.log(`   Password: ${bidderResult.password}`)
    console.log(`   Organization Type: ${bidderResult.organizationType}`)
    
    console.log('\n📰 PUBLISHER USER:')
    console.log(`   Email: ${publisherResult.email}`)
    console.log(`   Password: ${publisherResult.password}`)
    console.log(`   Organization Type: ${publisherResult.organizationType}`)
    
    console.log('\n' + '=' .repeat(50))
    console.log('💡 You can now use these credentials to login at /login')
    
  } catch (error) {
    console.error('❌ Error creating dummy users:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
if (require.main === module) {
  createDummyUsers()
    .then(() => {
      console.log('\n🏁 Script completed successfully!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('💥 Script failed:', error)
      process.exit(1)
    })
}

export { createDummyUsers }
