import { NextRequest } from 'next/server'

describe('chat usage limit enforcement', () => {
  const orgId = 'org-free'
  const tenderId = 'tender-chat'
  const docHash = 'doc-hash'

  function setupMocks() {
    jest.resetModules()

    const usageState = {
      usedChats: 0,
    }

    const prismaMock = {
      organization: {
        findUnique: jest.fn(async () => ({
          id: orgId,
          planTier: 'FREE',
          planExpiresAt: null,
        })),
      },
      orgTenderUsage: {
        findUnique: jest.fn(async () =>
          usageState
            ? {
                organizationId: orgId,
                tenderId,
                usedChats: usageState.usedChats,
                usedBriefs: 0,
              }
            : null,
        ),
        create: jest.fn(async () => {
          usageState.usedChats = 0
          return { organizationId: orgId, tenderId, usedChats: 0, usedBriefs: 0 }
        }),
        update: jest.fn(async ({ data }) => {
          if (data.usedChats?.increment) {
            usageState.usedChats += data.usedChats.increment
          }
          if (data.usedBriefs?.increment) {
            // noop for chats
          }
          return {
            organizationId: orgId,
            tenderId,
            usedChats: usageState.usedChats,
            usedBriefs: 0,
          }
        }),
        upsert: jest.fn(async ({ create }) => {
          if (usageState.usedChats === undefined) {
            usageState.usedChats = 0
          }
          return { ...create, usedChats: usageState.usedChats, usedBriefs: 0 }
        }),
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
        document: {
          findFirst: jest.fn(async () => ({
            id: 'doc-internal',
            status: 'READY',
          })),
        },
        extractedFile: {
          findFirst: jest.fn(async () => ({
            id: 'file-1',
            filename: 'file.pdf',
          })),
        },
      },
    }))

    jest.doMock('@/lib/subscription', () => ({
      ensureActiveSubscriptionForOrg: jest.fn(async () => 'FREE'),
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
      retrieveChunksFromFile: jest.fn(async () => [
        {
          docName: 'Doc',
          pageStart: 1,
          pageEnd: 1,
          content: 'Answer content',
        },
      ]),
      buildContext: jest.fn(() => 'Answer content'),
    }))

    jest.doMock('@/lib/ai/openai', () => ({
      openai: {
        chat: {
          completions: {
            create: jest.fn(async () => ({
              choices: [{ message: { content: 'Mock answer' } }],
            })),
          },
        },
      },
    }))

    const cacheStore = new Map<string, string>()
    jest.doMock('@/lib/redis', () => ({
      getRedisClient: jest.fn(() => ({
        get: jest.fn(async (key: string) => cacheStore.get(key) ?? null),
        set: jest.fn(async (key: string, value: string) => {
          cacheStore.set(key, value)
          return 'OK'
        }),
      })),
    }))

    return { prismaMock, usageState }
  }

  afterEach(() => {
    jest.resetModules()
    jest.clearAllMocks()
  })

  it('allows two chats for trial and blocks the third', async () => {
    const { usageState } = setupMocks()
    const module = await import('@/app/api/tenders/[tenderId]/docs/[docHash]/ask/route')

    const makeRequest = () =>
      new NextRequest(
        new Request('http://localhost/api/ask', {
          method: 'POST',
          body: JSON.stringify({ question: 'Hello?', fileId: 'file-1' }),
          headers: { 'content-type': 'application/json' },
        }),
      )

    for (let i = 0; i < 2; i += 1) {
      const response = await module.POST(makeRequest(), { params: { tenderId, docHash } })
      expect(response.status).toBe(200)
    }

    expect(usageState.usedChats).toBe(2)

    const blocked = await module.POST(makeRequest(), { params: { tenderId, docHash } })
    expect(blocked.status).toBe(403)
    expect(await blocked.json()).toEqual({ code: 'TRIAL_LIMIT' })
    expect(usageState.usedChats).toBe(2)
  })
})
