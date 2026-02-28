import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs'

/**
 * Serves generated files (video, audio, images) from /tmp on serverless environments.
 * 
 * In local dev, Next.js serves these from public/ automatically.
 * On Railway/Vercel, files are written to /tmp which isn't publicly accessible,
 * so this route streams them back to the client.
 * 
 * URL pattern: /api/generated/video/video-xxx.mp4
 *              /api/generated/audio/tts-xxx.mp3
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
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: segments } = await params

    // Validate path segments - only allow safe characters
    for (const seg of segments) {
      if (!/^[a-zA-Z0-9\-_.]+$/.test(seg)) {
        return NextResponse.json({ error: 'Invalid path' }, { status: 400 })
      }
    }

    const relativePath = segments.join('/')

    // Prevent path traversal
    if (relativePath.includes('..') || relativePath.startsWith('/')) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 })
    }

    // Try /tmp/generated/ first (serverless), then public/generated/ (local)
    const tmpPath = path.join('/tmp', 'generated', relativePath)
    const publicPath = path.join(process.cwd(), 'public', 'generated', relativePath)

    let filePath: string | null = null
    if (fs.existsSync(tmpPath)) {
      filePath = tmpPath
    } else if (fs.existsSync(publicPath)) {
      filePath = publicPath
    }

    if (!filePath) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    // Verify resolved path is still within expected directories
    const resolvedPath = path.resolve(filePath)
    const resolvedTmp = path.resolve('/tmp', 'generated')
    const resolvedPublic = path.resolve(process.cwd(), 'public', 'generated')
    if (!resolvedPath.startsWith(resolvedTmp) && !resolvedPath.startsWith(resolvedPublic)) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 })
    }

    const ext = path.extname(filePath).toLowerCase()
    const contentType = MIME_TYPES[ext] || 'application/octet-stream'
    const stat = fs.statSync(filePath)

    // Support range requests for video seeking
    const range = _req.headers.get('range')
    if (range && contentType.startsWith('video/')) {
      const parts = range.replace(/bytes=/, '').split('-')
      const start = parseInt(parts[0], 10)
      const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1
      const chunkSize = end - start + 1

      const stream = fs.createReadStream(filePath, { start, end })
      const readable = new ReadableStream({
        start(controller) {
          stream.on('data', (chunk: Buffer | string) => {
            const buf = typeof chunk === 'string' ? Buffer.from(chunk) : chunk
            controller.enqueue(new Uint8Array(buf))
          })
          stream.on('end', () => controller.close())
          stream.on('error', (err) => controller.error(err))
        },
      })

      return new NextResponse(readable, {
        status: 206,
        headers: {
          'Content-Type': contentType,
          'Content-Range': `bytes ${start}-${end}/${stat.size}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': String(chunkSize),
          'Cache-Control': 'public, max-age=3600',
        },
      })
    }

    // Full file response
    const buffer = fs.readFileSync(filePath)
    const filename = path.basename(filePath)

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(stat.size),
        'Content-Disposition': `inline; filename="${filename}"`,
        'Cache-Control': 'public, max-age=3600',
        'Accept-Ranges': 'bytes',
      },
    })
  } catch (error) {
    console.error('File serving error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
