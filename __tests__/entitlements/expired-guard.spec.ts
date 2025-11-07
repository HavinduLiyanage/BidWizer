import { NextRequest } from 'next/server'

const EXPIRED_ORG_ID = 'org-free-expired'
const OWNER_ORG_ID = 'org-owner'

function createPrismaMock() {
  return {
    organization: {
      findUnique: jest.fn(async ({ where }: { where: { id: string } }) => {
        if (where.id === EXPIRED_ORG_ID) {
          return {
            id: EXPIRED_ORG_ID,
            planTier: 'FREE_EXPIRED',
            planExpiresAt: new Date('2023-12-31T00:00:00Z'),
          }
        }
        if (where.id === OWNER_ORG_ID) {
          return {
            id: OWNER_ORG_ID,
            planTier: 'STANDARD',
            planExpiresAt: null,
          }
        }
        return null
      }),
    },
    tender: {
      findUnique: jest.fn(async () => ({
        id: 'tender-1',
        organization: { name: 'Owner Org' },
        reference: 'REF-123',
        title: 'Project Title',
        deadline: new Date('2024-02-01T00:00:00Z'),
        regionLocation: 'Region',
        estimatedValue: '100000',
        contactPersonName: 'Owner Contact',
        contactNumber: '+94 11 1234567',
      })),
    },
    orgMember: {
      findFirst: jest.fn(async () => ({
        organization: {
          id: EXPIRED_ORG_ID,
          name: 'Expired Org',
          website: 'https://expired.example',
          industry: 'General',
          description: 'Expired organization',
        },
      })),
    },
  }
}

const mockEnsureTenderAccess = jest.fn(async (_userId: string, tenderId: string) => ({
  tenderId,
  organizationId: OWNER_ORG_ID,
  viewerOrganizationId: EXPIRED_ORG_ID,
}))

const mockGetServerSession = jest.fn(async () => ({ user: { id: 'user-1' } }))

function setupModuleMocks() {
  const prismaMock = createPrismaMock()
  const ensureActiveSubscriptionForOrg = jest.fn()

  jest.doMock('@/lib/db', () => ({
    prisma: prismaMock,
    db: prismaMock,
  }))
  jest.doMock('@/lib/subscription', () => ({
    ensureActiveSubscriptionForOrg,
  }))
  jest.doMock('@/lib/indexing/access', () => ({
    ensureTenderAccess: mockEnsureTenderAccess,
  }))
  jest.doMock('next-auth', () => ({
    getServerSession: mockGetServerSession,
  }))
  jest.doMock('@/lib/auth', () => ({
    authOptions: {},
  }))

  return { prismaMock, ensureActiveSubscriptionForOrg }
}

describe('enforceAccess with expired trials', () => {
  afterEach(() => {
    jest.resetModules()
  })

  it('throws PlanError and logs when org plan is FREE_EXPIRED', async () => {
    const { prismaMock, ensureActiveSubscriptionForOrg } = setupModuleMocks()
    jest.doMock('@/lib/usage', () => ({
      getOrCreateMonthlyUsage: jest.fn(),
      getOrCreateOrgTenderUsage: jest.fn(),
    }))

    const { enforceAccess, PlanError } = await import('@/lib/entitlements/enforce')

    await expect(
      enforceAccess({ orgId: EXPIRED_ORG_ID, feature: 'chat', tenderId: 'tender-1' }),
    ).rejects.toThrow(PlanError)

    expect(ensureActiveSubscriptionForOrg).not.toHaveBeenCalled()
    expect(prismaMock.organization.findUnique).toHaveBeenCalledWith({
      where: { id: EXPIRED_ORG_ID },
    })
    expect(console.log).toHaveBeenCalled()
    const logPayload = JSON.parse((console.log as jest.Mock).mock.calls[0][0])
    expect(logPayload).toMatchObject({
      scope: 'entitlements.enforce',
      msg: 'gate_check',
      event: 'gate_check',
      reason: 'trial_expired',
      result: 'deny',
      orgId: EXPIRED_ORG_ID,
      feature: 'chat',
      tenderId: 'tender-1',
    })
  })

  it('throws PlanError and logs when plan is FREE and past expiry date', async () => {
    jest.resetModules()
    const prismaMock = {
      organization: {
        findUnique: jest.fn(async () => ({
          id: EXPIRED_ORG_ID,
          planTier: 'FREE',
          planExpiresAt: new Date('2023-12-31T00:00:00Z'),
        })),
      },
    }
    jest.doMock('@/lib/db', () => ({
      prisma: prismaMock,
      db: prismaMock,
    }))
    const ensureActiveSubscriptionForOrg = jest.fn()
    jest.doMock('@/lib/subscription', () => ({
      ensureActiveSubscriptionForOrg,
    }))
    jest.doMock('@/lib/usage', () => ({
      getOrCreateMonthlyUsage: jest.fn(),
      getOrCreateOrgTenderUsage: jest.fn(),
    }))

    const { enforceAccess, PlanError } = await import('@/lib/entitlements/enforce')

    await expect(
      enforceAccess({ orgId: EXPIRED_ORG_ID, feature: 'brief', tenderId: 'tender-2' }),
    ).rejects.toThrow(PlanError)

    expect(ensureActiveSubscriptionForOrg).not.toHaveBeenCalled()
    expect(console.log).toHaveBeenCalled()
    const logPayload = JSON.parse((console.log as jest.Mock).mock.calls[0][0])
    expect(logPayload).toMatchObject({
      reason: 'trial_expired',
      result: 'deny',
      feature: 'brief',
    })
  })
})

describe('routes deny FREE_EXPIRED organizations', () => {
  beforeEach(() => {
    jest.resetModules()
  })

  afterEach(() => {
    jest.resetModules()
    mockEnsureTenderAccess.mockClear()
    mockGetServerSession.mockClear()
  })

  async function invokeRoute<T extends 'GET' | 'POST'>(
    modulePath: string,
    method: T,
    request: NextRequest,
    params: Record<string, string>,
  ) {
    const { ensureActiveSubscriptionForOrg } = setupModuleMocks()
    jest.doMock('@/lib/usage', () => ({
      getOrCreateMonthlyUsage: jest.fn(),
      getOrCreateOrgTenderUsage: jest.fn(),
    }))

    const routeModule = await import(modulePath)
    const handler = routeModule[method]
    if (typeof handler !== 'function') {
      throw new Error(`Handler ${method} not found on ${modulePath}`)
    }
    const response = await handler(request, { params })
    return { response, ensureActiveSubscriptionForOrg }
  }

  it('public document stream returns 403 with PREVIEW_LIMIT', async () => {
    const request = new NextRequest('http://localhost/api/public/tenders/t/stream')
    const { response, ensureActiveSubscriptionForOrg } = await invokeRoute(
      '@/app/api/public/tenders/[tenderId]/documents/[documentId]/stream/route',
      'GET',
      request,
      { tenderId: 'tender-1', documentId: 'doc-1' },
    )

    expect(response.status).toBe(403)
    expect(await response.json()).toEqual({ code: 'TRIAL_EXPIRED' })
    expect(ensureActiveSubscriptionForOrg).not.toHaveBeenCalled()
  })

  it('doc ask route returns 403 with PlanError payload', async () => {
    const request = new NextRequest(
      new Request('http://localhost/api/tenders/t/docs/h/ask', {
        method: 'POST',
        body: JSON.stringify({ question: 'What is the scope?', fileId: 'file-1' }),
        headers: { 'content-type': 'application/json' },
      }),
    )
    const { response, ensureActiveSubscriptionForOrg } = await invokeRoute(
      '@/app/api/tenders/[tenderId]/docs/[docHash]/ask/route',
      'POST',
      request,
      { tenderId: 'tender-1', docHash: 'doc-1' },
    )

    expect(response.status).toBe(403)
    expect(await response.json()).toEqual({ code: 'TRIAL_EXPIRED' })
    expect(ensureActiveSubscriptionForOrg).not.toHaveBeenCalled()
  })

  it('doc brief route returns 403 with PlanError payload', async () => {
    const request = new NextRequest(
      new Request('http://localhost/api/tenders/t/docs/h/brief', {
        method: 'POST',
        body: JSON.stringify({ length: 'short', fileId: 'file-1' }),
        headers: { 'content-type': 'application/json' },
      }),
    )
    const { response, ensureActiveSubscriptionForOrg } = await invokeRoute(
      '@/app/api/tenders/[tenderId]/docs/[docHash]/brief/route',
      'POST',
      request,
      { tenderId: 'tender-1', docHash: 'doc-1' },
    )

    expect(response.status).toBe(403)
    expect(await response.json()).toEqual({ code: 'TRIAL_EXPIRED' })
    expect(ensureActiveSubscriptionForOrg).not.toHaveBeenCalled()
  })

  it('cover-letter route returns 403 with feature gated code', async () => {
    const request = new NextRequest(
      new Request('http://localhost/api/tenders/t/ai/cover-letter', {
        method: 'POST',
        body: JSON.stringify({ tone: 'professional', length: 'short' }),
        headers: { 'content-type': 'application/json' },
      }),
    )
    const { response, ensureActiveSubscriptionForOrg } = await invokeRoute(
      '@/app/api/tenders/[tenderId]/ai/cover-letter/route',
      'POST',
      request,
      { tenderId: 'tender-1' },
    )

    expect(response.status).toBe(403)
    expect(await response.json()).toEqual({ code: 'FEATURE_NOT_AVAILABLE' })
    expect(ensureActiveSubscriptionForOrg).not.toHaveBeenCalled()
  })
})
