import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { rateLimit } from '@/lib/rate-limit'
import {
  generateAvatar,
  generateAvatarFaceUrl,
  getAvailableProviders,
  AVATAR_PRESETS,
  AVATAR_POSITIONS,
  AVATAR_SHAPES,
  AVATAR_SIZES,
  type AvatarProvider,
} from '@/lib/avatar'
import { apiSuccess, unauthorized, rateLimited, badRequest, serverError } from '@/lib/api-response'
import { logger } from '@/lib/logger'

/**
 * POST /api/video/avatar — Generate a talking head avatar
 * Body: { faceImageUrl, audioUrl, provider? }
 *
 * GET /api/video/avatar — List providers, presets, and configuration options
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
    const { faceImageUrl, audioUrl, provider, presetId, durationMs } = body

    // Option 1: Generate a face image from a preset
    if (presetId) {
      const preset = AVATAR_PRESETS.find(p => p.id === presetId)
      if (!preset) {
        done(400)
        return badRequest(`Unknown preset: ${presetId}`)
      }

      const faceUrl = generateAvatarFaceUrl(preset.prompt, Date.now())
      done(200)
      return apiSuccess({
        data: {
          faceImageUrl: faceUrl,
          preset: preset.name,
          isGenerated: true,
        },
      })
    }

    // Option 2: Generate a talking head video
    if (!faceImageUrl) {
      done(400)
      return badRequest('faceImageUrl is required (or provide presetId to generate a face)')
    }

    // If no audio, just return the face image as static
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
      return badRequest(`Invalid provider. Choose from: ${validProviders.join(', ')}`)
    }

    const result = await generateAvatar({
      faceImageUrl,
      audioUrl,
      provider: provider as AvatarProvider | undefined,
      durationMs,
    })

    done(200)
    return apiSuccess({ data: result })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    logger.error('Avatar generation error', { error: msg })
    done(500)
    return serverError(msg.includes('API') ? msg : 'Avatar generation failed. Please try again.')
  }
}

export async function GET() {
  return apiSuccess({
    data: {
      providers: getAvailableProviders(),
      presets: AVATAR_PRESETS,
      positions: AVATAR_POSITIONS,
      shapes: AVATAR_SHAPES,
      sizes: AVATAR_SIZES,
    },
  })
}
