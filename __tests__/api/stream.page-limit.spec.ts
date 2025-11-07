import { NextRequest } from 'next/server'

describe('page view limit enforcement', () => {
  const orgId = 'org-free'
  const tenderId = 'tender-1'
  const documentId = 'doc-1'

  function setupMocks(planTier: string = 'FREE') {
    jest.resetModules()

    const prismaMock = {
      organization: {
        findUnique: jest.fn(async () => ({
          id: orgId,
          planTier,
          planExpiresAt: null,
        })),
      },
      orgTenderUsage: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        upsert: jest.fn(),
      },
      orgTrialUsage: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        upsert: jest.fn(),
      },
      aiMonthlyUsage: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    }

    jest.doMock('@/lib/db', () => ({
      prisma: prismaMock,
      db: {
        extractedFile: {
          findUnique: jest.fn(async () => ({
            tenderId,
            filename: 'doc.txt',
            content: Buffer.from('hello world'),
            upload: null,
          })),
        },
      },
    }))

    jest.doMock('@/lib/subscription', () => ({
      ensureActiveSubscriptionForOrg: jest.fn(async () => planTier),
    }))

    jest.doMock('@/lib/indexing/access', () => ({
      ensureTenderAccess: jest.fn(async () => ({
        tenderId,
        organizationId: 'owner-org',
        viewerOrganizationId: orgId,
      })),
    }))

    jest.doMock('next-auth', () => ({
      getServerSession: jest.fn(async () => ({ user: { id: 'user-1' } })),
    }))

    jest.doMock('@/lib/uploads', () => ({
      loadUploadBuffer: jest.fn(),
    }))
  }

  afterEach(() => {
    jest.resetModules()
    jest.clearAllMocks()
  })

  it('allows unlimited pages for free trial users', async () => {
    setupMocks()
    const module = await import('@/app/api/tenders/[tenderId]/documents/[documentId]/stream/route')

    for (let page = 1; page <= 5; page += 1) {
      const request = new NextRequest(
        new Request(`http://localhost/api/stream?page=${page}`, { method: 'GET' }),
      )
      const response = await module.GET(request, { params: { tenderId, documentId } })
      expect(response.status).toBe(200)
    }
  })

  it('allows unlimited pages for paid plans', async () => {
    setupMocks('STANDARD')
    const module = await import('@/app/api/tenders/[tenderId]/documents/[documentId]/stream/route')
    const request = new NextRequest(
      new Request(`http://localhost/api/stream?page=12`, { method: 'GET' }),
    )
    const response = await module.GET(request, { params: { tenderId, documentId } })
    expect(response.status).toBe(200)
  })
})
