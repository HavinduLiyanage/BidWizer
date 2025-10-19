import { mkdir } from 'fs/promises'
import { createWriteStream } from 'fs'
import { join } from 'path'
import { Readable } from 'stream'
import { pipeline } from 'stream/promises'

import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

function getUploadsDir(uploadId: string) {
  return join(process.cwd(), '.uploads', uploadId)
}

export async function PUT(
  request: NextRequest,
  context: { params: { uploadId: string } }
) {
  try {
    const { uploadId } = context.params
    if (!uploadId) {
      return NextResponse.json({ error: 'uploadId is required' }, { status: 400 })
    }

    const filenameParam = request.nextUrl.searchParams.get('filename') ?? 'original.bin'
    const safeFilenameCandidate = filenameParam.split(/[\\/]/).filter(Boolean).pop() ?? 'original.bin'
    const sanitizedFilename = safeFilenameCandidate.replace(/[^a-zA-Z0-9._-]/g, '_')

    const targetDir = getUploadsDir(uploadId)
    await mkdir(targetDir, { recursive: true })

    const targetPath = join(targetDir, sanitizedFilename)
    const body = request.body

    if (!body) {
      // No body content, create empty file for consistency
      await pipeline(Readable.from([]), createWriteStream(targetPath))
      return NextResponse.json({ ok: true })
    }

    const nodeReadable = Readable.fromWeb(body)
    await pipeline(nodeReadable, createWriteStream(targetPath))

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Mock storage upload error:', error)
    return NextResponse.json({ error: 'Failed to store file locally' }, { status: 500 })
  }
}
