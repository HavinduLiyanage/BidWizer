import { runExpireTrials, type ExpireTrialsPrisma } from '@/scripts/expire-trials'

interface FakeOrg {
  id: string
  planTier: string
  planExpiresAt: Date | null
}

class FakePrismaClient implements ExpireTrialsPrisma {
  readonly organization: ExpireTrialsPrisma['organization']
  private readonly orgs: Map<string, FakeOrg>

  constructor(initial: FakeOrg[]) {
    this.orgs = new Map(initial.map((org) => [org.id, { ...org }]))

    this.organization = {
      findMany: jest.fn(async ({ where }) => {
        const now = where.planExpiresAt.lt
        return Array.from(this.orgs.values())
          .filter(
            (org) =>
              org.planTier === where.planTier && org.planExpiresAt != null && org.planExpiresAt < now,
          )
          .map((org) => ({ id: org.id }))
      }),
      updateMany: jest.fn(async ({ where, data }) => {
        const ids = where.id.in
        let count = 0
        for (const id of ids) {
          const org = this.orgs.get(id)
          if (
            org &&
            org.planTier === where.planTier &&
            org.planExpiresAt != null &&
            org.planExpiresAt < where.planExpiresAt.lt
          ) {
            org.planTier = data.planTier
            org.planExpiresAt = data.planExpiresAt
            count += 1
          }
        }
        return { count }
      }),
    }
  }

  snapshot(): FakeOrg[] {
    return Array.from(this.orgs.values()).map((org) => ({ ...org }))
  }
}

describe('runExpireTrials', () => {
  const now = new Date('2024-01-02T00:00:00Z')

  beforeAll(() => {
    jest.useFakeTimers().setSystemTime(now)
  })

  afterAll(() => {
    jest.useRealTimers()
  })

  it('moves expired free trials to FREE_EXPIRED and logs summary', async () => {
    const orgs: FakeOrg[] = [
      { id: 'org-expire', planTier: 'FREE', planExpiresAt: new Date('2024-01-01T00:00:00Z') },
      { id: 'org-active', planTier: 'FREE', planExpiresAt: new Date('2024-01-05T00:00:00Z') },
      { id: 'org-paid', planTier: 'STANDARD', planExpiresAt: null },
    ]
    const fakePrisma = new FakePrismaClient(orgs)

    const firstRun = await runExpireTrials(fakePrisma)

    expect(firstRun).toEqual({
      event: 'trial_expired_batch',
      count: 1,
      orgIds: ['org-expire'],
    })
    expect(fakePrisma.organization.updateMany).toHaveBeenCalledTimes(1)
    expect(fakePrisma.snapshot()).toEqual([
      { id: 'org-expire', planTier: 'FREE_EXPIRED', planExpiresAt: null },
      { id: 'org-active', planTier: 'FREE', planExpiresAt: new Date('2024-01-05T00:00:00Z') },
      { id: 'org-paid', planTier: 'STANDARD', planExpiresAt: null },
    ])

    const logArgument = (console.info as jest.Mock).mock.calls[0]?.[0]
    expect(typeof logArgument).toBe('string')
    expect(JSON.parse(logArgument)).toMatchObject({
      event: 'trial_expired_batch',
      count: 1,
      orgIds: ['org-expire'],
    })

    ;(console.info as jest.Mock).mockClear()
    const secondRun = await runExpireTrials(fakePrisma)

    expect(secondRun).toEqual({
      event: 'trial_expired_batch',
      count: 0,
      orgIds: [],
    })
    expect(console.info).toHaveBeenCalledTimes(1)
    expect(JSON.parse((console.info as jest.Mock).mock.calls[0][0])).toEqual({
      event: 'trial_expired_batch',
      count: 0,
      orgIds: [],
    })
  })
})
