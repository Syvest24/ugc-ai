import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { rateLimit } from '@/lib/rate-limit'
import { transformVideo, getVideoToVideoProviders, VIDEO_STYLES } from '@/lib/video-to-video'
import { apiSuccess, unauthorized, rateLimited, badRequest, serverError } from '@/lib/api-response'
import { logger } from '@/lib/logger'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import crypto from 'crypto'

const UPLOAD_DIR = process.env.RAILWAY_ENVIRONMENT
  ? '/tmp/generated/video-to-video'
  : path.join(process.cwd(), 'public', 'generated', 'video-to-video')

/**
 * POST /api/video-to-video — Apply style transfer to video (FormData)
 * GET  /api/video-to-video — List styles and providers
 */

export async function POST(req: NextRequest) {
  let done = (_status: number, _extra?: Record<string, unknown>) => {}
  try {
    const session = await auth()
    if (!session?.user?.email) return unauthorized()
    done = logger.apiRequest(req, session.user.email)

    const identifier = session.user.email
    if (!rateLimit(`v2v:${identifier}`, 10, 60 * 60 * 1000)) {
      done(429)
      return rateLimited()
    }

    // Accept FormData (file upload) or JSON (URL only)
    const contentType = req.headers.get('content-type') || ''
    let videoPath: string
    let style: string
    let prompt: string | undefined
    let strength: number

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData()
      const file = formData.get('file') as File | null
      const videoUrl = formData.get('videoUrl') as string | null
      style = (formData.get('style') as string) || 'anime'
      prompt = (formData.get('prompt') as string) || undefined
      strength = Number(formData.get('strength') || '0.7')

      if (file && file.size > 0) {
        // Reject files larger than 100MB
        const MAX_UPLOAD_SIZE = 100 * 1024 * 1024
        if (file.size > MAX_UPLOAD_SIZE) {
          done(400)
          return badRequest('File too large. Maximum upload size is 100MB.')
        }
        // Save uploaded file to temp dir
        if (!existsSync(UPLOAD_DIR)) {
          await mkdir(UPLOAD_DIR, { recursive: true })
        }
        const ext = path.extname(file.name) || '.mp4'
        const filename = `upload_${crypto.randomUUID().slice(0, 8)}${ext}`
        videoPath = path.join(UPLOAD_DIR, filename)
        const buffer = Buffer.from(await file.arrayBuffer())
        await writeFile(videoPath, buffer)
      } else if (videoUrl) {
        videoPath = videoUrl
      } else {
        done(400)
        return badRequest('Upload a video file or provide a URL')
      }
    } else {
      const body = await req.json()
      if (!body.videoUrl || typeof body.videoUrl !== 'string') {
        done(400)
        return badRequest('Video URL is required')
      }
      videoPath = body.videoUrl
      style = body.style || 'anime'
      prompt = body.prompt
      strength = body.strength || 0.7
    }

    if (!style || typeof style !== 'string') {
      done(400)
      return badRequest('Style is required')
    }

    const result = await transformVideo({
      videoUrl: videoPath,
      style,
      prompt,
      strength,
    })

    done(200)
    return apiSuccess({ data: result })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Video style transfer failed'
    console.error('[api/video-to-video] Error:', msg)
    done(500)
    return serverError(msg)
  }
}

export async function GET() {
  return apiSuccess({
    data: {
      providers: getVideoToVideoProviders(),
      styles: VIDEO_STYLES,
    },
  })
}
