import { randomUUID } from 'crypto'
import { basename, extname } from 'path'
import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { UploadKind, UploadStatus } from '@prisma/client'

import { db } from '@/lib/db'
import { readEnvVar } from '@/lib/env'
import { authOptions } from '@/lib/auth'
import { createSupabaseServiceClient } from '@/lib/storage'

const UPLOAD_URL_TTL_SECONDS = 120
const STORAGE_KEY_PREFIX = 'tenders'
const DEFAULT_BUCKET_NAME = 'tender-uploads'
const DEFAULT_MAX_UPLOAD_SIZE_MB = 500
const MAX_UPLOAD_SIZE_CAP_MB = 2048

const FILE_KIND_BY_EXTENSION: Record<string, UploadKind> = {
  pdf: UploadKind.pdf,
  zip: UploadKind.zip,
  doc: UploadKind.pdf, // Treat DOC as PDF for now
  docx: UploadKind.pdf, // Treat DOCX as PDF for now
  xls: UploadKind.pdf, // Treat XLS as PDF for now
  xlsx: UploadKind.pdf, // Treat XLSX as PDF for now
  jpg: UploadKind.image,
  jpeg: UploadKind.image,
  png: UploadKind.image,
  gif: UploadKind.image,
  webp: UploadKind.image,
}

const MIME_TYPES_BY_EXTENSION: Record<string, readonly string[]> = {
  pdf: ['application/pdf'],
  zip: ['application/zip', 'application/x-zip-compressed', 'application/octet-stream'],
  doc: ['application/msword'],
  docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  xls: ['application/vnd.ms-excel'],
  xlsx: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  jpg: ['image/jpeg'],
  jpeg: ['image/jpeg'],
  png: ['image/png'],
  gif: ['image/gif'],
  webp: ['image/webp'],
}

function resolveMaxUploadSizeBytes(): number {
  const rawValue = readEnvVar('TENDER_UPLOAD_MAX_SIZE_MB')
  if (!rawValue || rawValue.length === 0) {
    return DEFAULT_MAX_UPLOAD_SIZE_MB * 1024 * 1024
  }

  const numericValue = Number(rawValue)
  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    console.warn(
      `[uploads] Ignoring invalid TENDER_UPLOAD_MAX_SIZE_MB value "${rawValue}", falling back to default`
    )
    return DEFAULT_MAX_UPLOAD_SIZE_MB * 1024 * 1024
  }

  const constrainedValue = Math.min(numericValue, MAX_UPLOAD_SIZE_CAP_MB)
  return constrainedValue * 1024 * 1024
}

const MAX_UPLOAD_SIZE_BYTES = resolveMaxUploadSizeBytes()

const signedUrlSchema = z.object({
  tenderId: z.string().min(1, 'tenderId is required'),
  filename: z.string().min(1, 'filename is required'),
  mime: z.string().min(1, 'mime is required'),
  size: z.coerce
    .number({
      invalid_type_error: 'size must be a number',
    })
    .int('size must be an integer')
    .positive('size must be greater than 0')
    .max(
      MAX_UPLOAD_SIZE_BYTES,
      `File exceeds maximum allowed size (${Math.floor(MAX_UPLOAD_SIZE_BYTES / (1024 * 1024))} MB)`
    ),
  isAdvertisement: z.boolean().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { tenderId, filename, mime, size, isAdvertisement } = signedUrlSchema.parse(body)

    const tender = await db.tender.findUnique({
      where: { id: tenderId },
      select: { id: true, organizationId: true },
    })

    if (!tender) {
      return NextResponse.json({ error: 'Tender not found' }, { status: 404 })
    }

    const membership = await db.orgMember.findUnique({
      where: {
        userId_organizationId: {
          userId: session.user.id,
          organizationId: tender.organizationId,
        },
      },
      select: { 
        id: true,
        organization: {
          select: {
            type: true
          }
        }
      },
    })

    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Only publishers can upload files to tenders
    if (membership.organization.type !== 'PUBLISHER') {
      return NextResponse.json({ error: 'Only publishers can upload files' }, { status: 403 })
    }

    const normalizedFilename = basename(filename)
    const extension = extname(normalizedFilename).replace('.', '').toLowerCase()

    const kind = FILE_KIND_BY_EXTENSION[extension]

    if (!kind) {
      return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 })
    }

    if (isAdvertisement && kind !== UploadKind.image) {
      return NextResponse.json(
        { error: 'Tender advertisement must be an image file' },
        { status: 400 }
      )
    }

    if (size <= 0) {
      return NextResponse.json({ error: 'File size must be greater than zero' }, { status: 400 })
    }

    const normalizedMime = mime.toLowerCase()
    const allowedMimes = MIME_TYPES_BY_EXTENSION[extension] ?? []
    if (allowedMimes.length && !allowedMimes.some((allowed) => normalizedMime.startsWith(allowed))) {
      return NextResponse.json({ error: 'Unsupported MIME type for this file' }, { status: 400 })
    }

    const uploadId = randomUUID()
    const storedFilename = `original.${extension}`

    const supabaseUrl = readEnvVar('SUPABASE_URL')
    const supabaseServiceRole = readEnvVar('SUPABASE_SERVICE_ROLE_KEY')
    const supabaseBucket =
      readEnvVar('SUPABASE_TENDER_UPLOADS_BUCKET') ??
      readEnvVar('SUPABASE_STORAGE_UPLOADS_BUCKET') ??
      DEFAULT_BUCKET_NAME

    let uploadUrl: string | undefined
    let storageKey: string | undefined

    if (supabaseUrl && supabaseServiceRole) {
      try {
        let supabaseClient: ReturnType<typeof createSupabaseServiceClient> | undefined
        try {
          supabaseClient = createSupabaseServiceClient()
        } catch (error) {
          console.warn('Failed to initialise Supabase client, falling back to mock storage:', error)
        }

        if (supabaseClient) {
          storageKey = `${STORAGE_KEY_PREFIX}/${tender.organizationId}/${tenderId}/originals/${uploadId}/original.${extension}`
          const { data, error } = await supabaseClient.storage
            .from(supabaseBucket)
            .createSignedUploadUrl(storageKey, UPLOAD_URL_TTL_SECONDS, {
              contentType: normalizedMime,
              upsert: false,
            })

          if (error || !data?.signedUrl) {
            console.warn('Supabase signed upload url failed, falling back to mock storage:', error)
            storageKey = undefined
          } else {
            uploadUrl = data.signedUrl
          }
        }
      } catch (error) {
        console.warn('Unexpected Supabase error, falling back to mock storage:', error)
        storageKey = undefined
      }
    }

    if (!uploadUrl || !storageKey) {
      storageKey = `mock://${uploadId}/${storedFilename}`
      uploadUrl = `/api/uploads/mock-storage/${uploadId}?filename=${encodeURIComponent(storedFilename)}`
    }

    if (!uploadUrl || !storageKey) {
      console.error('Upload preparation failed: storageKey or uploadUrl missing after fallback')
      return NextResponse.json(
        { error: 'Failed to prepare upload destination' },
        { status: 500 }
      )
    }

    await db.upload.create({
      data: {
        id: uploadId,
        filename: storedFilename,
        originalName: normalizedFilename,
        kind,
        status: UploadStatus.PENDING,
        size,
        mimeType: normalizedMime,
        storageKey,
        orgId: tender.organizationId,
        tenderId,
        isAdvertisement: Boolean(isAdvertisement),
      },
    })

    return NextResponse.json({
      uploadId,
      storageKey,
      uploadUrl,
      maxUploadSizeBytes: MAX_UPLOAD_SIZE_BYTES,
      expiresIn: UPLOAD_URL_TTL_SECONDS,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid request payload',
          details: error.issues,
        },
        { status: 400 }
      )
    }

    console.error('Signed URL handler error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
