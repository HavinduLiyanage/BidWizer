import useSWR from 'swr'

interface TenderUsageResponse {
  tender?: {
    usedChats: number
    usedBriefs: number
  }
  org: {
    briefCredits: number | null
  }
}

type FetchError = Error & { status?: number }

async function fetcher(url: string): Promise<TenderUsageResponse> {
  const response = await fetch(url, { cache: 'no-store' })
  if (!response.ok) {
    const error = new Error('Failed to load usage') as FetchError
    error.status = response.status
    throw error
  }
  return response.json()
}

export function useTenderUsage(tenderId?: string | null) {
  const key = tenderId ? `/api/usage?tenderId=${encodeURIComponent(tenderId)}` : null

  const { data, error, isLoading, mutate } = useSWR<TenderUsageResponse>(
    key,
    fetcher,
    { revalidateOnFocus: false },
  )

  const usedChats = data?.tender?.usedChats ?? 0
  const usedBriefs = data?.tender?.usedBriefs ?? 0
  const briefCredits = data?.org?.briefCredits ?? null

  return {
    data,
    isLoading,
    error,
    mutate,
    usedChats,
    usedBriefs,
    briefCredits,
  }
}
