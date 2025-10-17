#!/usr/bin/env node

/**
 * Authentication API Test Script
 *
 * This script exercises the bidder registration flow end to end:
 * 1. Complete multi-step bidder registration (admin + team invite)
 * 2. Verify the admin email using the token returned by the API (debug only)
 * 3. Sign in with the new credentials via NextAuth credentials provider
 * 4. Trigger the forgot-password flow as a final check
 *
 * Run with: node test-auth.js
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'

async function testAuth() {
  console.log('🧪 Testing Authentication Flow...\n')

  const timestamp = Date.now()
  const adminEmail = `bidder.${timestamp}@example.com`
  const adminPassword = 'Password123!'
  const teamEmail = `teammate.${timestamp}@example.com`

  try {
    // --- Registration ------------------------------------------------------
    console.log('1️⃣ Registering bidder admin with team invite...')

    const registerResponse = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        flow: 'bidder',
        step1: {
          companyName: 'Test Construction Ltd',
          firstName: 'Test',
          lastName: 'Admin',
          position: 'CEO',
          email: adminEmail,
          password: adminPassword,
          confirmPassword: adminPassword,
        },
        step2: {
          companyName: 'Test Construction Ltd',
          industry: 'construction',
          otherIndustry: '',
          website: 'https://example.com',
          about: 'An automation test company specialising in infrastructure projects.',
        },
        team: {
          plan: 'Basic',
          teamMembers: [
            {
              name: 'Team Mate',
              email: teamEmail,
              position: 'Bid Analyst',
            },
          ],
        },
      }),
    })

    const registerData = await registerResponse.json()

    if (!registerResponse.ok) {
      console.log('❌ Registration failed:', registerData.error || registerResponse.statusText)
      return
    }

    console.log('✅ Registration accepted. Verification email dispatched.')

    const verificationToken = registerData?.debug?.verificationToken
    if (!verificationToken) {
      console.log('⚠️ Debug verification token not returned. Cannot continue automated verification.')
      return
    }

    const invitationTokens = registerData?.debug?.invitationTokens ?? []
    const teamInvitationToken = invitationTokens[0]?.token

    // --- Email Verification ------------------------------------------------
    console.log('\n2️⃣ Verifying admin email using token...')

    const verifyResponse = await fetch(`${BASE_URL}/api/auth/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token: verificationToken }),
    })

    const verifyData = await verifyResponse.json()

    if (!verifyResponse.ok) {
      console.log('❌ Email verification failed:', verifyData.error || verifyResponse.statusText)
      return
    }

    console.log('✅ Email verification succeeded.')

    // --- Login -------------------------------------------------------------
    console.log('\n3️⃣ Logging in via NextAuth credentials provider...')

    const csrfResponse = await fetch(`${BASE_URL}/api/auth/csrf`)
    const csrfData = await csrfResponse.json()

    if (!csrfResponse.ok || !csrfData?.csrfToken) {
      console.log('❌ Failed to fetch CSRF token for login.')
      return
    }

    const loginResponse = await fetch(`${BASE_URL}/api/auth/callback/credentials?json=true`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        csrfToken: csrfData.csrfToken,
        email: adminEmail,
        password: adminPassword,
        callbackUrl: `${BASE_URL}/dashboard`,
      }),
    })

    const loginResult = await loginResponse.json().catch(() => ({}))

    if (!loginResponse.ok || loginResult?.error) {
      console.log('❌ Login failed:', loginResult?.error || loginResponse.statusText)
      return
    }

    console.log('✅ Login successful.')

    // --- Forgot Password ---------------------------------------------------
    console.log('\n4️⃣ Triggering forgot-password flow...')

    const forgotResponse = await fetch(`${BASE_URL}/api/auth/forgot`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: adminEmail }),
    })

    const forgotData = await forgotResponse.json()

    if (!forgotResponse.ok) {
      console.log('❌ Forgot password request failed:', forgotData.error || forgotResponse.statusText)
      return
    }

    console.log('✅ Forgot password email simulated.')

    // --- Invitation Acceptance (optional) ----------------------------------
    if (teamInvitationToken) {
      console.log('\n5️⃣ Accepting team invitation (optional sanity check)...')

      const acceptResponse = await fetch(`${BASE_URL}/api/invitations/${teamInvitationToken}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Team Mate',
          password: adminPassword,
          confirmPassword: adminPassword,
        }),
      })

      const acceptData = await acceptResponse.json()

      if (acceptResponse.ok) {
        console.log('✅ Invitation accepted. Team member account created (verification email sent).')
      } else {
        console.log('⚠️ Invitation acceptance failed:', acceptData.error || acceptResponse.statusText)
      }
    }

    console.log('\n🎉 Authentication flow test completed successfully!')
  } catch (error) {
    console.error('❌ Test failed:', error)
    console.log('\n💡 Make sure the development server is running (npm run dev).')
  }
}

testAuth()
