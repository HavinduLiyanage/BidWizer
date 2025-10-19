"use client"

import { useCallback, useMemo, useRef, useState } from "react"
import type { LucideIcon } from "lucide-react"
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  Upload,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type UploadStatusValue = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED"

interface UploadJob {
  clientId: string
  uploadId?: string
  fileName: string
  size: number
  mimeType?: string
  status: UploadStatusValue
  error?: string
  createdAt: number
}

interface UploadPanelProps {
  tenderId: string
  onUploadQueued?: () => void | Promise<void>
  className?: string
}

const STATUS_META: Record<
  UploadStatusValue,
  {
    label: string
    badgeVariant: "warning" | "default" | "success" | "destructive"
    icon: LucideIcon
  }
> = {
  PENDING: {
    label: "Pending upload",
    badgeVariant: "warning",
    icon: Clock,
  },
  PROCESSING: {
    label: "Processing",
    badgeVariant: "default",
    icon: Loader2,
  },
  COMPLETED: {
    label: "Completed",
    badgeVariant: "success",
    icon: CheckCircle2,
  },
  FAILED: {
    label: "Failed",
    badgeVariant: "destructive",
    icon: AlertCircle,
  },
}

const ACCEPTED_MIME_TYPES = [
  "application/pdf",
  "application/x-pdf",
  "application/zip",
  "application/x-zip-compressed",
  "application/octet-stream",
]

const ACCEPTED_EXTENSIONS = [".pdf", ".zip"]

function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 KB"
  const units = ["B", "KB", "MB", "GB"]
  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  )
  const value = bytes / Math.pow(1024, exponent)
  return `${value.toFixed(exponent === 0 ? 0 : value < 10 ? 1 : 0)} ${
    units[exponent]
  }`
}

async function parseErrorMessage(response: Response): Promise<string> {
  try {
    const payload = await response.clone().json()
    if (payload?.error) {
      return payload.error as string
    }
    if (payload?.message) {
      return payload.message as string
    }
  } catch {
    // Ignore JSON parse failure and fallback to text/status text.
  }

  try {
    const text = await response.text()
    if (text) {
      return text
    }
  } catch {
    // Ignore.
  }

  return response.statusText || "Unknown error"
}

const createClientId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`

export function UploadPanel({
  tenderId,
  onUploadQueued,
  className,
}: UploadPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [jobs, setJobs] = useState<UploadJob[]>([])
  const [activeUploads, setActiveUploads] = useState(0)

  const hasJobs = jobs.length > 0
  const isBusy = activeUploads > 0

  const handleSelectFiles = useCallback(() => {
    inputRef.current?.click()
  }, [])

  const updateJob = useCallback(
    (clientId: string, updater: (job: UploadJob) => UploadJob) => {
      setJobs((prev) =>
        prev.map((job) => (job.clientId === clientId ? updater(job) : job)),
      )
    },
    [],
  )

  const startUpload = useCallback(
    async (file: File) => {
      const clientId = createClientId()
      const baseJob: UploadJob = {
        clientId,
        fileName: file.name,
        size: file.size,
        mimeType: file.type,
        status: "PENDING",
        createdAt: Date.now(),
      }

      setJobs((prev) => [baseJob, ...prev])
      setActiveUploads((count) => count + 1)

      try {
        const signedUrlResponse = await fetch("/api/uploads/signed-url", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tenderId,
            filename: file.name,
            mime: file.type || "application/octet-stream",
            size: file.size,
          }),
        })

        if (!signedUrlResponse.ok) {
          const message = await parseErrorMessage(signedUrlResponse)
          throw new Error(message || "Failed to create signed upload URL")
        }

        const signedPayload: {
          uploadId: string
          uploadUrl: string
          storageKey: string
        } = await signedUrlResponse.json()

        updateJob(clientId, (job) => ({
          ...job,
          uploadId: signedPayload.uploadId,
        }))

        const uploadResponse = await fetch(signedPayload.uploadUrl, {
          method: "PUT",
          headers: {
            "Content-Type": file.type || "application/octet-stream",
          },
          body: file,
        })

        if (!uploadResponse.ok) {
          const message = await parseErrorMessage(uploadResponse)
          throw new Error(message || "Failed to upload file to storage")
        }

        const completeResponse = await fetch("/api/uploads/complete", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ uploadId: signedPayload.uploadId }),
        })

        if (!completeResponse.ok) {
          const message = await parseErrorMessage(completeResponse)
          throw new Error(message || "Failed to finalize upload")
        }

        updateJob(clientId, (job) => ({
          ...job,
          status: "PROCESSING",
        }))

        // Trigger refresh of file tree / workspace data if requested.
        try {
          await onUploadQueued?.()
        } catch (refreshError) {
          console.warn("Upload refresh callback failed:", refreshError)
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unexpected upload error"
        updateJob(clientId, (job) => ({
          ...job,
          status: "FAILED",
          error: message,
        }))
      } finally {
        setActiveUploads((count) => Math.max(0, count - 1))
      }
    },
    [onUploadQueued, tenderId, updateJob],
  )

  const handleInputChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const fileList = event.target.files
      if (!fileList?.length) {
        return
      }

      const files = Array.from(fileList)
      // Reset the input so the same file can be selected consecutively.
      if (inputRef.current) {
        inputRef.current.value = ""
      }

      for (const file of files) {
        await startUpload(file)
      }
    },
    [startUpload],
  )

  const sortedJobs = useMemo(
    () => [...jobs].sort((a, b) => b.createdAt - a.createdAt),
    [jobs],
  )

  return (
    <div
      className={cn(
        "flex-shrink-0 border-b border-gray-200 bg-white px-4 py-3",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-gray-900">Uploads</p>
          <p className="text-xs text-gray-500">
            PDF or ZIP • direct to secure storage
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isBusy && (
            <Badge variant="warning" className="flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              Uploading…
            </Badge>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleSelectFiles}
            disabled={isBusy}
            className="flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            Upload
          </Button>
        </div>

        <input
          ref={inputRef}
          type="file"
          multiple
          accept={[...ACCEPTED_EXTENSIONS, ...ACCEPTED_MIME_TYPES].join(",")}
          className="hidden"
          onChange={handleInputChange}
        />
      </div>

      {hasJobs ? (
        <div className="mt-3 space-y-2 max-h-48 overflow-y-auto pr-1">
          {sortedJobs.map((job) => {
            const meta = STATUS_META[job.status]
            const Icon = meta.icon

            return (
              <div
                key={job.clientId}
                className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-xs shadow-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 truncate font-medium text-gray-800">
                    {job.fileName}
                  </div>
                  <Badge variant={meta.badgeVariant} className="flex gap-1">
                    <Icon
                      className={cn(
                        "h-3 w-3",
                        job.status === "PROCESSING" && "animate-spin",
                      )}
                    />
                    {meta.label}
                  </Badge>
                </div>
                <div className="mt-1 flex items-center justify-between text-[11px] text-gray-500">
                  <span>{formatFileSize(job.size)}</span>
                  {job.uploadId && (
                    <span className="font-mono text-[10px] text-gray-400">
                      #{job.uploadId.slice(0, 8)}
                    </span>
                  )}
                </div>
                {job.error && (
                  <p className="mt-1 text-[11px] text-red-500">{job.error}</p>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <p className="mt-3 rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-500">
          Upload PDF or ZIP tender documents directly from your device. Files
          are stored securely and processed automatically.
        </p>
      )}
    </div>
  )
}
