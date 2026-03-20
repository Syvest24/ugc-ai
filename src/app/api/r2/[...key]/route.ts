import { NextRequest, NextResponse } from 'next/server'
import { isR2Configured, downloadFromR2 } from '@/lib/r2'

/**
 * R2 Proxy Route
 *
 * Serves files from R2 when no public URL (r2.dev or custom domain) is configured.
 * URL pattern: /api/r2/audio/tts-xxx.mp3
 *              /api/r2/video/video-xxx.mp4
 *              /api/r2/generated-images/img-xxx.png
 */

const MIME_TYPES: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.mp3': 'audio/mpeg',
  '.gif': 'image/gif',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webm': 'video/webm',
  '.wav': 'audio/wav',
  '.webp': 'image/webp',
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ key: string[] }> }
) {
  try {
    if (!isR2Configured) {
      return NextResponse.json({ error: 'R2 not configured' }, { status: 503 })
    }

    const { key: segments } = await params

    // Validate path segments - only allow safe characters
    for (const seg of segments) {
      if (!/^[a-zA-Z0-9\-_.]+$/.test(seg)) {
        return NextResponse.json({ error: 'Invalid path' }, { status: 400 })
      }
    }

    const r2Key = segments.join('/')

    // Prevent path traversal
    if (r2Key.includes('..') || r2Key.startsWith('/')) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 })
    }

    const buffer = await downloadFromR2(r2Key)

    const ext = r2Key.slice(r2Key.lastIndexOf('.')).toLowerCase()
    const contentType = MIME_TYPES[ext] || 'application/octet-stream'

    // Support range requests for video seeking
    const range = _req.headers.get('range')
    if (range && contentType.startsWith('video/')) {
      const parts = range.replace(/bytes=/, '').split('-')
      const start = parseInt(parts[0], 10)
      const end = parts[1] ? parseInt(parts[1], 10) : buffer.length - 1
      const chunkSize = end - start + 1

      return new NextResponse(new Uint8Array(buffer.subarray(start, end + 1)), {
        status: 206,
        headers: {
          'Content-Type': contentType,
          'Content-Range': `bytes ${start}-${end}/${buffer.length}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': String(chunkSize),
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      })
    }

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(buffer.length),
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Accept-Ranges': 'bytes',
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    if (message.includes('not found') || message.includes('NoSuchKey')) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }
    console.error('[R2 Proxy] Error:', message)
    return NextResponse.json({ error: 'Failed to retrieve file' }, { status: 500 })
  }
}
