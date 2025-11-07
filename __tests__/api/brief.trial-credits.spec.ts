import { NextRequest } from 'next/server'

describe('brief credit enforcement', () => {
  const orgId = 'org-free'
  const tenderId = 'tender-brief'
  const docHash = 'doc-brief'

  function setupMocks(options: { shouldFail?: boolean } = {}) {
    jest.resetModules()
    const { shouldFail = false } = options

    const trialState = { briefCredits: 3 }
    const tenderState = { usedBriefs: 0 }
    let lockToken: string | null = null

    const prismaMock: any = {
      organization: {
        findUnique: jest.fn(async () => ({
          id: orgId,
          planTier: 'FREE',
          planExpiresAt: null,
        })),
      },
      orgTenderUsage: {
        findUnique: jest.fn(async () => ({
          organizationId: orgId,
          tenderId,
          usedChats: 0,
          usedBriefs: tenderState.usedBriefs,
        })),
        create: jest.fn(async () => ({
          organizationId: orgId,
          tenderId,
          usedChats: 0,
          usedBriefs: tenderState.usedBriefs,
        })),
        update: jest.fn(async ({ data }) => {
          if (data.usedBriefs?.increment) {
            tenderState.usedBriefs += data.usedBriefs.increment
          }
          if (data.usedBriefs?.decrement) {
            tenderState.usedBriefs -= data.usedBriefs.decrement
          }
          return {
            organizationId: orgId,
            tenderId,
            usedChats: 0,
            usedBriefs: tenderState.usedBriefs,
          }
        }),
        upsert: jest.fn(async () => ({
          organizationId: orgId,
          tenderId,
          usedChats: 0,
          usedBriefs: tenderState.usedBriefs,
        })),
      },
      orgTrialUsage: {
        findUnique: jest.fn(async () => ({ orgId, briefCredits: trialState.briefCredits })),
        create: jest.fn(async () => ({ orgId, briefCredits: trialState.briefCredits })),
        update: jest.fn(async ({ data }) => {
          if (data.briefCredits?.increment) {
            trialState.briefCredits += data.briefCredits.increment
          }
          if (data.briefCredits?.decrement) {
            trialState.briefCredits -= data.briefCredits.decrement
          }
          return { orgId, briefCredits: trialState.briefCredits }
        }),
        upsert: jest.fn(async () => ({ orgId, briefCredits: trialState.briefCredits })),
      },
      aiMonthlyUsage: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn(async (callback: (tx: any) => Promise<void>) =>
        callback({ orgTrialUsage: prismaMock.orgTrialUsage, orgTenderUsage: prismaMock.orgTenderUsage }),
      ),
    }

    jest.doMock('@/lib/db', () => ({
      prisma: prismaMock,
      db: {
        document: {
          findFirst: jest.fn(async () => ({
            id: 'doc-id',
            status: 'READY',
          })),
        },
        extractedFile: {
          findFirst: jest.fn(async () => ({
            id: 'file-brief',
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
          content: 'Important content',
        },
      ]),
      buildContext: jest.fn(() => 'Important content'),
    }))

    jest.doMock('@/lib/ai/openai', () => ({
      openai: {
        chat: {
          completions: {
            create: jest.fn(async () => {
              if (shouldFail) {
                throw new Error('OpenAI failure')
              }
              return { choices: [{ message: { content: '{"purpose":[]} Remaining text' } }] }
            }),
          },
        },
      },
    }))

    jest.doMock('@/lib/redis', () => ({
      getRedisClient: jest.fn(() => ({
        set: jest.fn(async (_key: string, value: string, mode: string, flag: string, ttl: number) => {
          if (lockToken) {
            return null
          }
          if (mode === 'NX' && flag === 'PX' && typeof ttl === 'number') {
            lockToken = value
            return 'OK'
          }
          return null
        }),
        eval: jest.fn(async (_script: string, _keysCount: number, _key: string, token: string) => {
          if (lockToken === token) {
            lockToken = null
            return 1
          }
          return 0
        }),
        get: jest.fn(),
        setex: jest.fn(),
      })),
    }))

    return { trialState, tenderState }
  }

  afterEach(() => {
    jest.resetModules()
    jest.clearAllMocks()
  })

  it('consumes brief credits atomically and enforces per-tender limits', async () => {
    const { trialState, tenderState } = setupMocks()
    const module = await import('@/app/api/tenders/[tenderId]/docs/[docHash]/brief/route')

    const makeRequest = () =>
      new NextRequest(
        new Request('http://localhost/api/brief', {
          method: 'POST',
          body: JSON.stringify({ length: 'short', fileId: 'file-brief' }),
          headers: { 'content-type': 'application/json' },
        }),
      )

    const first = await module.POST(makeRequest(), { params: { tenderId, docHash } })
    if (first.status !== 200) {
      throw new Error(`unexpected status ${first.status}: ${await first.text()}`)
    }
    expect(trialState.briefCredits).toBe(2)
    expect(tenderState.usedBriefs).toBe(1)

    const second = await module.POST(makeRequest(), { params: { tenderId, docHash } })
    expect(second.status).toBe(403)
    expect(await second.json()).toEqual({ code: 'TENDER_BRIEF_LIMIT' })
    expect(trialState.briefCredits).toBe(2)
    expect(tenderState.usedBriefs).toBe(1)
  })

  it('refunds credits when brief generation fails', async () => {
    const { trialState, tenderState } = setupMocks({ shouldFail: true })
    const module = await import('@/app/api/tenders/[tenderId]/docs/[docHash]/brief/route')

    const request = new NextRequest(
      new Request('http://localhost/api/brief', {
        method: 'POST',
        body: JSON.stringify({ length: 'short', fileId: 'file-brief' }),
        headers: { 'content-type': 'application/json' },
      }),
    )

    const response = await module.POST(request, { params: { tenderId, docHash } })
    expect(response.status).toBe(500)
    expect(trialState.briefCredits).toBe(3)
    expect(tenderState.usedBriefs).toBe(0)
  })
})
