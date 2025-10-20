import { mkdir, stat } from 'fs/promises'
import { createWriteStream, createReadStream } from 'fs'
import { join } from 'path'
import { Readable } from 'stream'
import { pipeline } from 'stream/promises'

import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

function getUploadsDir(uploadId: string) {
  return join(process.cwd(), '.uploads', uploadId)
}

function guessMimeType(filename: string): string {
  const extension = filename.split('.').pop()?.toLowerCase()
  switch (extension) {
    case 'pdf':
      return 'application/pdf'
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg'
    case 'png':
      return 'image/png'
    case 'gif':
      return 'image/gif'
    case 'webp':
      return 'image/webp'
    case 'txt':
      return 'text/plain; charset=utf-8'
    case 'json':
      return 'application/json; charset=utf-8'
    case 'csv':
      return 'text/csv; charset=utf-8'
    case 'zip':
      return 'application/zip'
    default:
      return 'application/octet-stream'
  }
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

export async function GET(
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
    const targetPath = join(targetDir, sanitizedFilename)

    const fileStats = await stat(targetPath)

    const nodeStream = createReadStream(targetPath)
    const webStream = Readable.toWeb(nodeStream)

    return new NextResponse(webStream, {
      headers: {
        'Content-Type': guessMimeType(sanitizedFilename),
        'Content-Length': fileStats.size.toString(),
        'X-Accel-Buffering': 'no',
        'Cache-Control': 'private, max-age=0, no-cache',
        'Content-Disposition': `inline; filename="${encodeURIComponent(sanitizedFilename)}"`,
      },
    })
  } catch (error) {
    console.error('Mock storage download error:', error)
    return NextResponse.json({ error: 'File not found' }, { status: 404 })
  }
}
