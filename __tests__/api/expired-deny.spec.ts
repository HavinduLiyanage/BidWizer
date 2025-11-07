import { NextRequest } from 'next/server'

describe('expired trials are denied across gated routes', () => {
  const orgId = 'org-expired'
  const tenderId = 'tender-expired'
  const docHash = 'doc-expired'
  const documentId = 'doc-1'

  function setupMocks() {
    jest.resetModules()

    const prismaMock = {
      organization: {
        findUnique: jest.fn(async () => ({
          id: orgId,
          planTier: 'FREE_EXPIRED',
          planExpiresAt: new Date('2024-01-01T00:00:00Z'),
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
            content: Buffer.from('hello'),
            upload: null,
          })),
          findFirst: jest.fn(async () => ({
            id: 'file-1',
            filename: 'file.pdf',
          })),
        },
        document: {
          findFirst: jest.fn(async () => ({
            id: 'doc-id',
            status: 'READY',
          })),
        },
      },
    }))

    jest.doMock('@/lib/subscription', () => ({
      ensureActiveSubscriptionForOrg: jest.fn(async () => 'FREE_EXPIRED'),
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

    jest.doMock('@/lib/ai/rag', () => ({
      retrieveChunksFromFile: jest.fn(async () => []),
      buildContext: jest.fn(() => ''),
    }))

    jest.doMock('@/lib/ai/openai', () => ({
      openai: {
        chat: {
          completions: {
            create: jest.fn(),
          },
        },
      },
    }))
  }

  afterEach(() => {
    jest.resetModules()
    jest.clearAllMocks()
  })

  it('denies stream, ask, and brief routes with TRIAL_EXPIRED', async () => {
    setupMocks()

    const streamModule = await import(
      '@/app/api/tenders/[tenderId]/documents/[documentId]/stream/route'
    )
    const streamRequest = new NextRequest(
      new Request('http://localhost/api/stream?page=1', { method: 'GET' }),
    )
    const streamResponse = await streamModule.GET(streamRequest, {
      params: { tenderId, documentId },
    })
    expect(streamResponse.status).toBe(403)
    expect(await streamResponse.json()).toEqual({ code: 'TRIAL_EXPIRED' })

    const askModule = await import('@/app/api/tenders/[tenderId]/docs/[docHash]/ask/route')
    const askRequest = new NextRequest(
      new Request('http://localhost/api/ask', {
        method: 'POST',
        body: JSON.stringify({ question: 'Hi?', fileId: 'file-1' }),
        headers: { 'content-type': 'application/json' },
      }),
    )
    const askResponse = await askModule.POST(askRequest, { params: { tenderId, docHash } })
    expect(askResponse.status).toBe(403)
    expect(await askResponse.json()).toEqual({ code: 'TRIAL_EXPIRED' })

    const briefModule = await import('@/app/api/tenders/[tenderId]/docs/[docHash]/brief/route')
    const briefRequest = new NextRequest(
      new Request('http://localhost/api/brief', {
        method: 'POST',
        body: JSON.stringify({ length: 'short', fileId: 'file-1' }),
        headers: { 'content-type': 'application/json' },
      }),
    )
    const briefResponse = await briefModule.POST(briefRequest, { params: { tenderId, docHash } })
    expect(briefResponse.status).toBe(403)
    expect(await briefResponse.json()).toEqual({ code: 'TRIAL_EXPIRED' })
  })
})
