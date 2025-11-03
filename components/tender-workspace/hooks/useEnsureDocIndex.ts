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

    const fetchStatus = async (docHash: string): Promise<{
      status: string
      error: string | null
      nextStage: string | null
    }> => {
      const response = await fetch(
        `/api/tenders/${tenderId}/docs/${docHash}/ensure-index`,
        { cache: 'no-store' },
      )

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        const message =
          typeof payload?.error === 'string' && payload.error.length > 0
            ? payload.error
            : `Failed to resolve document index (${response.status})`
        const err = new Error(message)
        ;(err as Error & { status?: number }).status = response.status
        throw err
      }

      const payload = (await response.json().catch(() => ({}))) as {
        status?: string
        error?: string | null
        nextStage?: string | null
      }

      return {
        status: typeof payload?.status === 'string' ? payload.status : 'PENDING',
        error:
          typeof payload?.error === 'string' && payload.error.length > 0
            ? payload.error
            : null,
        nextStage:
          typeof payload?.nextStage === 'string' && payload.nextStage.length > 0
            ? payload.nextStage
            : null,
      }
    }

    const applyStatus = (
      docHash: string,
      fileId: string | undefined,
      info: { status: string; error: string | null; nextStage: string | null },
    ): boolean => {
      if (info.status === 'READY') {
        setState({ status: 'ready', docHash, fileId })
        return true
      }

      if (info.status === 'FAILED') {
        setState({
          status: 'error',
          docHash,
          fileId,
          message: info.error ?? 'Indexing failed',
        })
        return true
      }

      const friendlyStage =
        info.nextStage === 'extract'
          ? 'Waiting for text extraction…'
          : info.nextStage === 'chunk'
          ? 'Chunking document…'
          : info.nextStage === 'embed'
          ? 'Generating AI embeddings…'
          : info.nextStage === 'summary'
          ? 'Generating summary…'
          : 'Preparing index…'

      setState({
        status: 'preparing',
        docHash,
        fileId,
        message: friendlyStage,
      })
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
          docHash?: string | null
          metadata?: Record<string, unknown> | null
          sourceUpload?:
            | {
                id?: string | null
                kind?: string | null
                mimeType?: string | null
              }
            | null
        }
      }

      const apply = (payload: {
        id?: string
        docHash?: string | null
        metadata?: Record<string, unknown> | null
        sourceUpload?:
          | {
              id?: string | null
              kind?: string | null
              mimeType?: string | null
            }
          | null
      }) => {
        const metadata =
          payload?.metadata && typeof payload.metadata === 'object'
            ? (payload.metadata as Record<string, unknown>)
            : null
        const normalizedKind = (() => {
          const sourceKind =
            typeof payload?.sourceUpload?.kind === 'string'
              ? payload.sourceUpload.kind.toLowerCase()
              : null
          const metadataKind =
            metadata && typeof metadata['kind'] === 'string'
              ? String(metadata['kind']).toLowerCase()
              : null
          return sourceKind ?? metadataKind ?? null
        })()
        const normalizedMime = (() => {
          const sourceMime =
            typeof payload?.sourceUpload?.mimeType === 'string'
              ? payload.sourceUpload.mimeType.toLowerCase()
              : null
          const metadataMime =
            metadata && typeof metadata['mimeType'] === 'string'
              ? String(metadata['mimeType']).toLowerCase()
              : null
          return sourceMime ?? metadataMime ?? null
        })()
        const isImageLike =
          normalizedKind === 'image' ||
          (normalizedMime !== null && normalizedMime.startsWith('image/'))
        if (isImageLike) {
          const unsupported = new Error(
            'AI assistant is only available for PDF and DOCX files.',
          ) as Error & { code?: string }
          unsupported.code = 'UNSUPPORTED_FILE_TYPE'
          throw unsupported
        }

        const uploadId = payload?.sourceUpload?.id
        if (!uploadId) {
          throw new Error('Selected file has no source upload')
        }
        let rawDocHash: string | null = null
        if (typeof payload?.docHash === 'string' && payload.docHash.length > 0) {
          rawDocHash = payload.docHash
        } else if (
          metadata &&
          typeof metadata['docHash'] === 'string' &&
          (metadata['docHash'] as string).length > 0
        ) {
          rawDocHash = String(metadata['docHash'])
        }
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

        const statusInfo = await fetchStatus(preview.docHash)
        const finished = applyStatus(preview.docHash, cachedFileId, statusInfo)

        if (!finished && !cancelled) {
          stopPolling()
          pollingRef.current = setInterval(() => {
            fetchStatus(preview.docHash)
              .then((info) => {
                const done = applyStatus(preview.docHash, cachedFileId, info)
                if (done) {
                  stopPolling()
                }
              })
              .catch((error) => {
                stopPolling()
                if (!cancelled) {
                  setState({
                    status: 'error',
                    docHash: preview.docHash,
                    fileId: cachedFileId,
                    message: (error as Error).message ?? 'Status polling failed',
                  })
                }
              })
          }, 2000)
        }
      } catch (error) {
        stopPolling()
        if (!cancelled) {
          const maybeUnsupported = error as Error & { code?: string }
          if (maybeUnsupported?.code === 'UNSUPPORTED_FILE_TYPE') {
            setState({
              status: 'error',
              docHash: undefined,
              fileId: undefined,
              message: maybeUnsupported.message,
            })
          } else {
            setState({
              status: 'error',
              docHash: cachedDocHash,
              fileId: cachedFileId,
              message: (error as Error).message ?? 'Unknown error',
            })
          }
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
