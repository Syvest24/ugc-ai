import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { rateLimit } from '@/lib/rate-limit'
import { generateMusic, getMusicProviders, MUSIC_MOODS } from '@/lib/music-gen'
import { apiSuccess, unauthorized, rateLimited, badRequest, serverError } from '@/lib/api-response'
import { logger } from '@/lib/logger'

/**
 * POST /api/music — Generate AI music
 * GET  /api/music — List moods and providers
 */

export async function POST(req: NextRequest) {
  let done = (_status: number, _extra?: Record<string, unknown>) => {}
  try {
    const session = await auth()
    if (!session?.user?.email) return unauthorized()
    done = logger.apiRequest(req, session.user.email)

    const identifier = session.user.email
    if (!rateLimit(`music:${identifier}`, 15, 60 * 60 * 1000)) {
      done(429)
      return rateLimited()
    }

    const body = await req.json()
    const { prompt, duration, mood, provider } = body

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 3) {
      done(400)
      return badRequest('Music description is required (min 3 characters)')
    }

    const result = await generateMusic({
      prompt: prompt.trim(),
      duration: Math.min(duration || 10, 30),
      mood,
      provider,
    })

    done(200)
    return apiSuccess({ data: result })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Music generation failed'
    console.error('[api/music] Error:', msg)
    done(500)
    return serverError(msg)
  }
}

export async function GET() {
  return apiSuccess({
    data: {
      providers: getMusicProviders(),
      moods: MUSIC_MOODS,
    },
  })
}
