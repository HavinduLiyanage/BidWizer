'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export type IndexState = {
  status: 'idle' | 'preparing' | 'ready' | 'error'
  docHash?: string
  fileId?: string
  message?: string
}

export function useEnsureDocIndex(
  tenderId: string | undefined,
  selectedFileId: string | undefined,
): IndexState {
  const [state, setState] = useState<IndexState>({ status: 'idle' })
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
  }, [])

  useEffect(() => stopPolling, [stopPolling])

  useEffect(() => {
    if (!tenderId || !selectedFileId) {
      stopPolling()
      setState({ status: 'idle' })
      return
    }

    let cancelled = false
    let cachedFileId: string | undefined
    let cachedDocHash: string | undefined

    const pollProgress = async (
      docHash: string,
      fileId?: string,
    ): Promise<boolean> => {
      const response = await fetch(
        `/api/tenders/${tenderId}/docs/${docHash}/progress`,
        { cache: 'no-store' },
      )
      if (!response.ok) {
        throw new Error('Failed to read index progress')
      }

      const payload = await response.json()
      if (payload.status === 'ready') {
        setState({ status: 'ready', docHash, fileId })
        return true
      }
      if (payload.status === 'failed') {
        throw new Error(payload.progress?.message ?? 'Index build failed')
      }
      if (payload.status === 'not-found') {
        throw new Error('Index not found for this document')
      }
      return false
    }

    const resolvePreview = async (): Promise<{
      uploadId: string
      fileId: string
      docHash: string
    }> => {
      const runFetch = async (endpoint: string) => {
        const response = await fetch(endpoint, { cache: 'no-store' })
        const payload = await response.json().catch(() => ({}))

        if (!response.ok) {
          const errorMessage =
            typeof payload?.error === 'string'
              ? payload.error
              : `Failed to resolve document (${response.status})`
          const err = new Error(errorMessage)
          ;(err as Error & { status?: number }).status = response.status
          throw err
        }

        return payload as {
          id?: string
          sourceUpload?: { id?: string | null } | null
        }
      }

      const apply = (payload: {
        id?: string
        docHash?: string | null
        metadata?: Record<string, unknown> | null
        sourceUpload?: { id?: string | null } | null
      }) => {
        const uploadId = payload?.sourceUpload?.id
        if (!uploadId) {
          throw new Error('Selected file has no source upload')
        }
        const rawDocHash =
          typeof payload?.docHash === 'string' && payload.docHash.length > 0
            ? payload.docHash
            : typeof payload?.metadata?.docHash === 'string'
            ? String(payload.metadata.docHash)
            : null
        if (!rawDocHash) {
          throw new Error('Selected file is missing a document hash')
        }
        const identifier =
          typeof payload?.id === 'string' && payload.id.length > 0
            ? payload.id
            : selectedFileId
        const fileId = identifier.startsWith('file:')
          ? identifier.slice('file:'.length)
          : identifier
        if (!fileId) {
          throw new Error('Unable to resolve file identifier')
        }
        return { uploadId, fileId, docHash: rawDocHash }
      }

      try {
        const preview = await runFetch(
          `/api/tenders/${tenderId}/documents/${encodeURIComponent(selectedFileId)}`,
        )
        return apply(preview)
      } catch (error) {
        const status = (error as Error & { status?: number }).status
        if (status === 401 || status === 403) {
          const fallback = await runFetch(
            `/api/public/tenders/${tenderId}/documents/${encodeURIComponent(selectedFileId)}`,
          )
          return apply(fallback)
        }
        throw error
      }
    }

    const ensureIndex = async () => {
      setState({ status: 'preparing', docHash: undefined, fileId: undefined })

      try {
        const preview = await resolvePreview()
        cachedFileId = preview.fileId
        cachedDocHash = preview.docHash

        const ensureRes = await fetch(
          `/api/tenders/${tenderId}/docs/${encodeURIComponent(preview.docHash)}/ensure-index`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
          },
        )
        if (!ensureRes.ok) {
          throw new Error('Failed to ensure index')
        }
        const ensure = await ensureRes.json()
        const docHash: string | undefined =
          typeof ensure?.docHash === 'string' && ensure.docHash.length > 0
            ? ensure.docHash
            : cachedDocHash
        if (!docHash) {
          throw new Error('Index response missing doc hash')
        }
        cachedDocHash = docHash

        const ready = await pollProgress(docHash, cachedFileId)
        if (!ready && !cancelled) {
          pollingRef.current = setInterval(() => {
            pollProgress(docHash, cachedFileId)
              .then((isReady) => {
                if (isReady) {
                  stopPolling()
                }
              })
              .catch((error) => {
                stopPolling()
                if (!cancelled) {
                  setState({
                    status: 'error',
                    docHash,
                    fileId: cachedFileId,
                    message: (error as Error).message ?? 'Polling error',
                  })
                }
              })
          }, 1500)
        }
      } catch (error) {
        stopPolling()
        if (!cancelled) {
          setState({
            status: 'error',
            docHash: cachedDocHash,
            fileId: cachedFileId,
            message: (error as Error).message ?? 'Unknown error',
          })
        }
      }
    }

    void ensureIndex()

    return () => {
      cancelled = true
      stopPolling()
    }
  }, [selectedFileId, stopPolling, tenderId])

  return state
}
