import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcrypt'
import { z } from 'zod'
import { db } from '@/lib/db'

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        try {
          const { email, password } = loginSchema.parse(credentials)
          const normalizedEmail = email.trim().toLowerCase()

          // Find user by email (case-insensitive to match UI input)
          const user = await db.user.findFirst({
            where: {
              email: {
                equals: normalizedEmail,
                mode: 'insensitive',
              },
            },
          })

          if (!user) {
            throw new Error('CredentialsSignin')
          }

          if (!user.emailVerified) {
            throw new Error('EmailNotVerified')
          }

          // Verify password
          const isValidPassword = await bcrypt.compare(password, user.password)

          if (!isValidPassword) {
            throw new Error('CredentialsSignin')
          }

          const membership = await db.orgMember.findFirst({
            where: { userId: user.id },
            orderBy: { createdAt: 'asc' },
            include: {
              organization: true,
            },
          })

          // Return user object (password will be excluded automatically)
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
            organizationId: membership?.organizationId ?? null,
            organizationSlug: membership?.organization.slug ?? null,
            organizationType: membership?.organization.type ?? null,
            orgRole: membership?.role ?? null,
          }
        } catch (error) {
          if (error instanceof z.ZodError) {
            throw new Error('CredentialsSignin')
          }

          if (error instanceof Error && ['EmailNotVerified', 'CredentialsSignin'].includes(error.message)) {
            throw error
          }

          console.error('Auth error:', error)
          throw new Error('CredentialsSignin')
        }
      },
    }),
  ],
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.email = user.email
        token.name = user.name
        token.organizationId = user.organizationId
        token.organizationSlug = user.organizationSlug
        token.organizationType = user.organizationType
        token.orgRole = user.orgRole
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user = {
          id: token.id as string,
          email: token.email as string,
          name: token.name as string | undefined,
          organizationId: (token.organizationId as string | null | undefined) ?? null,
          organizationSlug: (token.organizationSlug as string | null | undefined) ?? null,
          organizationType: (token.organizationType as string | null | undefined) ?? null,
          orgRole: (token.orgRole as string | null | undefined) ?? null,
        }
      }
      return session
    },
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
})

export { handler as GET, handler as POST }
