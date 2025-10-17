import { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: DefaultSession['user'] & {
      id: string
      organizationId?: string | null
      organizationSlug?: string | null
      organizationType?: 'BIDDER' | 'PUBLISHER' | null
      orgRole?: string | null
    }
  }

  interface User {
    organizationId?: string | null
    organizationSlug?: string | null
    organizationType?: 'BIDDER' | 'PUBLISHER' | null
    orgRole?: string | null
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string
    email?: string | null
    name?: string | null
    organizationId?: string | null
    organizationSlug?: string | null
    organizationType?: 'BIDDER' | 'PUBLISHER' | null
    orgRole?: string | null
  }
}
