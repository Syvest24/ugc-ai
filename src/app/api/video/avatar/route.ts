import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { rateLimit } from '@/lib/rate-limit'
import { generateAvatar, getAvailableProviders, type AvatarProvider } from '@/lib/avatar'
import { apiSuccess, unauthorized, rateLimited, badRequest, serverError } from '@/lib/api-response'
import { logger } from '@/lib/logger'

/**
 * POST /api/video/avatar — Generate a talking head video from face + audio
 * GET  /api/video/avatar — List available providers
 */

export async function POST(req: NextRequest) {
  let done = (_status: number, _extra?: Record<string, unknown>) => {}
  try {
    const session = await auth()
    if (!session?.user?.email) return unauthorized()
    done = logger.apiRequest(req, session?.user?.email)

    const identifier = session.user.email
    if (!rateLimit(`avatar:${identifier}`, 10, 60 * 60 * 1000)) {
      done(429)
      return rateLimited()
    }

    const body = await req.json()
    const { faceImageUrl, audioUrl, provider, durationMs } = body

    if (!faceImageUrl) {
      done(400)
      return badRequest('faceImageUrl is required')
    }

    // If no audio provided, return as static overlay
    if (!audioUrl) {
      done(200)
      return apiSuccess({
        data: {
          videoUrl: faceImageUrl,
          provider: 'static',
          model: 'static-overlay',
          isVideo: false,
          duration: (durationMs || 30000) / 1000,
        },
      })
    }

    const validProviders: AvatarProvider[] = ['did', 'sadtalker', 'static']
    if (provider && !validProviders.includes(provider)) {
      done(400)
      return badRequest(`Invalid provider. Valid options: ${validProviders.join(', ')}`)
    }

    const result = await generateAvatar({
      faceImageUrl,
      audioUrl,
      provider,
      durationMs,
    })

    done(200)
    return apiSuccess({ data: result })
  } catch (err) {
    console.error('[API/avatar] Error:', err)
    done(500)
    return serverError(err instanceof Error ? err.message : 'Avatar generation failed')
  }
}

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.email) return unauthorized()

    return apiSuccess({
      data: { providers: getAvailableProviders() },
    })
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'Failed to get avatar info')
  }
}
