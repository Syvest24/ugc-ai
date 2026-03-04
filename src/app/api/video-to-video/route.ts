import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { rateLimit } from '@/lib/rate-limit'
import { transformVideo, getVideoToVideoProviders, VIDEO_STYLES } from '@/lib/video-to-video'
import { apiSuccess, unauthorized, rateLimited, badRequest, serverError } from '@/lib/api-response'
import { logger } from '@/lib/logger'

/**
 * POST /api/video-to-video — Apply style transfer to video
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

    const body = await req.json()
    const { videoUrl, style, prompt, strength, provider } = body

    if (!videoUrl || typeof videoUrl !== 'string') {
      done(400)
      return badRequest('Video URL is required')
    }
    if (!style || typeof style !== 'string') {
      done(400)
      return badRequest('Style is required')
    }

    const result = await transformVideo({
      videoUrl,
      style,
      prompt,
      strength: strength || 0.7,
      provider,
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
