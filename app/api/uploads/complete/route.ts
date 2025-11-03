import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { UploadStatus } from '@prisma/client'

import { db } from '@/lib/db'
import { triggerUploadIngestion } from '@/lib/uploads'
import { authOptions } from '@/lib/auth'
import { log } from '@/lib/log'

const completeSchema = z.object({
  uploadId: z.string().min(1, 'uploadId is required'),
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { uploadId } = completeSchema.parse(body)

    const upload = await db.upload.findUnique({
      where: { id: uploadId },
      include: {
        tender: {
          select: {
            organizationId: true,
          },
        },
      },
    })

    if (!upload) {
      return NextResponse.json({ error: 'Upload not found' }, { status: 404 })
    }

    const orgId = upload.orgId ?? upload.tender?.organizationId

    if (!orgId) {
      log('api:uploads-complete', 'missing-org', { uploadId })
      return NextResponse.json(
        { error: 'Upload is not associated with an organization' },
        { status: 500 }
      )
    }

    const membership = await db.orgMember.findUnique({
      where: {
        userId_organizationId: {
          userId: session.user.id,
          organizationId: orgId,
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

    // Only publishers can complete uploads
    if (membership.organization.type !== 'PUBLISHER') {
      return NextResponse.json({ error: 'Only publishers can complete uploads' }, { status: 403 })
    }

    if (upload.status !== UploadStatus.PENDING) {
      return NextResponse.json(
        { error: `Upload is not in a completable state (${upload.status})` },
        { status: 409 }
      )
    }

    await db.upload.update({
      where: { id: uploadId },
      data: { status: UploadStatus.PROCESSING },
    })

    await triggerUploadIngestion(uploadId)

    log('api:uploads-complete', 'accepted', { uploadId })

    return NextResponse.json({ ok: true })
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

    const message = error instanceof Error ? error.message : String(error)
    log('api:uploads-complete', 'error', { error: message })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
