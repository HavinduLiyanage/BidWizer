import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { log } from '@/lib/log'
import { deleteStoredObject } from '@/lib/uploads'
import { getSupabaseIndexBucketName } from '@/lib/storage'
import { recomputeTenderProgress } from '@/lib/indexing/tenderProgress'

const paramsSchema = z.object({
  tenderId: z.string().min(1, 'tenderId is required'),
  uploadId: z.string().min(1, 'uploadId is required'),
})

export async function DELETE(
  _request: NextRequest,
  context: { params: { tenderId: string; uploadId: string } },
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { tenderId, uploadId } = paramsSchema.parse(context.params)

    const upload = await db.upload.findUnique({
      where: { id: uploadId },
      include: {
        tender: {
          select: {
            organizationId: true,
          },
        },
        extractedFiles: {
          select: {
            id: true,
            docHash: true,
            storageKey: true,
            storageBucket: true,
          },
        },
      },
    })

    if (!upload || upload.tenderId !== tenderId) {
      return NextResponse.json({ error: 'Upload not found' }, { status: 404 })
    }

    const membership = await db.orgMember.findUnique({
      where: {
        userId_organizationId: {
          userId: session.user.id,
          organizationId: upload.tender.organizationId,
        },
      },
      select: {
        id: true,
        organization: {
          select: {
            type: true,
          },
        },
      },
    })

    if (!membership || membership.organization.type !== 'PUBLISHER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const docHashes = upload.extractedFiles.map((file) => file.docHash).filter(Boolean)
    const indexArtifacts =
      docHashes.length > 0
        ? await db.indexArtifact.findMany({
            where: {
              tenderId,
              docHash: { in: docHashes },
            },
            select: {
              storageKey: true,
            },
          })
        : []

    const storageTargets: Array<{ key: string | null | undefined; bucket?: string | null }> = [
      { key: upload.storageKey },
    ]

    for (const file of upload.extractedFiles) {
      storageTargets.push({ key: file.storageKey, bucket: file.storageBucket })
    }

    const indexBucket = getSupabaseIndexBucketName()
    for (const artifact of indexArtifacts) {
      storageTargets.push({ key: artifact.storageKey, bucket: indexBucket })
    }

    await db.$transaction(async (tx) => {
      if (docHashes.length > 0) {
        await tx.document.deleteMany({
          where: {
            tenderId,
            docHash: { in: docHashes },
          },
        })

        await tx.indexArtifact.deleteMany({
          where: {
            tenderId,
            docHash: { in: docHashes },
          },
        })
      }

      await tx.upload.delete({
        where: { id: uploadId },
      })
    })

    await recomputeTenderProgress(tenderId)

    const processedTargets = new Set<string>()
    for (const target of storageTargets) {
      if (!target.key) continue
      const bucketKey = `${target.bucket ?? 'default'}|${target.key}`
      if (processedTargets.has(bucketKey)) {
        continue
      }
      processedTargets.add(bucketKey)
      await deleteStoredObject(target.key, { bucket: target.bucket ?? undefined })
    }

    log('api:tender-upload-delete', 'deleted', {
      uploadId,
      tenderId,
      orgId: upload.tender.organizationId,
      docHashes: docHashes.length,
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 },
      )
    }

    const message = error instanceof Error ? error.message : String(error)
    log('api:tender-upload-delete', 'error', { error: message })
    return NextResponse.json({ error: 'Failed to delete upload' }, { status: 500 })
  }
}
