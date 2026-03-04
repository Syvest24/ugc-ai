import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { rateLimit } from '@/lib/rate-limit'
import { generateTextToVideo, getTextToVideoProviders, TEXT_TO_VIDEO_STYLES } from '@/lib/text-to-video'
import { apiSuccess, unauthorized, rateLimited, badRequest, serverError } from '@/lib/api-response'
import { logger } from '@/lib/logger'

/**
 * POST /api/text-to-video — Generate video from text prompt
 * GET  /api/text-to-video — List providers & styles
 */

export async function POST(req: NextRequest) {
  let done = (_status: number, _extra?: Record<string, unknown>) => {}
  try {
    const session = await auth()
    if (!session?.user?.email) return unauthorized()
    done = logger.apiRequest(req, session.user.email)

    const identifier = session.user.email
    if (!rateLimit(`t2v:${identifier}`, 10, 60 * 60 * 1000)) {
      done(429)
      return rateLimited()
    }

    const body = await req.json()
    const { prompt, negativePrompt, duration, aspectRatio, resolution, style, provider } = body

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 3) {
      done(400)
      return badRequest('Prompt is required (min 3 characters)')
    }

    // Enhance prompt with style if selected
    let enhancedPrompt = prompt.trim()
    if (style) {
      const styleInfo = TEXT_TO_VIDEO_STYLES.find(s => s.id === style)
      if (styleInfo) {
        enhancedPrompt = `${enhancedPrompt}, ${styleInfo.prompt}`
      }
    }

    const result = await generateTextToVideo({
      prompt: enhancedPrompt,
      negativePrompt,
      duration: duration || 5,
      aspectRatio: aspectRatio || '16:9',
      resolution: resolution || '480p',
      provider,
    })

    done(200)
    return apiSuccess({ data: result })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Text-to-video generation failed'
    console.error('[api/text-to-video] Error:', msg)
    done(500)
    return serverError(msg)
  }
}

export async function GET() {
  return apiSuccess({
    data: {
      providers: getTextToVideoProviders(),
      styles: TEXT_TO_VIDEO_STYLES,
    },
  })
}
