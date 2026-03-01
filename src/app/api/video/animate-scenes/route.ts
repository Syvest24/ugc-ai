import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { imageToVideo, type MotionType } from '@/lib/image-to-video'
import { rateLimit } from '@/lib/rate-limit'
import { apiSuccess, unauthorized, rateLimited, badRequest, serverError } from '@/lib/api-response'
import { logger } from '@/lib/logger'

/**
 * POST /api/video/animate-scenes — Convert scene images to video clips with motion
 *
 * Takes an array of image URLs and converts each into a short video clip
 * using the image-to-video module (Ken Burns effect via ffmpeg, or Replicate SVD).
 *
 * Body: { images: string[], motion?: string, duration?: number, provider?: string }
 * Returns: { clips: { imageUrl: string, videoUrl: string | null, provider: string }[] }
 */

export async function POST(req: NextRequest) {
  let done = (_status: number, _extra?: Record<string, unknown>) => {}
  try {
    const session = await auth()
    if (!session?.user?.email) return unauthorized()
    done = logger.apiRequest(req, session?.user?.email)

    const identifier = session.user.email
    if (!rateLimit(`animate-scenes:${identifier}`, 5, 60 * 60 * 1000)) {
      done(429)
      return rateLimited()
    }

    const body = await req.json()
    const { images, motion = 'ken-burns', duration = 4, provider } = body

    if (!images || !Array.isArray(images) || images.length === 0) {
      done(400)
      return badRequest('images array is required')
    }

    if (images.length > 8) {
      done(400)
      return badRequest('Maximum 8 images per request')
    }

    const validMotions = ['zoom-in', 'zoom-out', 'pan-left', 'pan-right', 'pan-up', 'ken-burns']
    if (!validMotions.includes(motion)) {
      done(400)
      return badRequest(`Invalid motion. Choose from: ${validMotions.join(', ')}`)
    }

    // Process in parallel batches of 2 (to avoid overloading)
    const BATCH_SIZE = 2
    const clips: { imageUrl: string; videoUrl: string | null; provider: string; error?: string }[] = []

    for (let i = 0; i < images.length; i += BATCH_SIZE) {
      const batch = images.slice(i, i + BATCH_SIZE)
      const results = await Promise.allSettled(
        batch.map(async (imageUrl: string) => {
          if (!imageUrl) return { imageUrl: '', videoUrl: null, provider: 'none' }

          const result = await imageToVideo({
            imageUrl,
            duration,
            motion: motion as MotionType,
            fps: 24,
            width: 1080,
            height: 1920,
            provider,
          })

          return {
            imageUrl,
            videoUrl: result.videoUrl,
            provider: result.provider,
          }
        })
      )

      for (const r of results) {
        if (r.status === 'fulfilled') {
          clips.push(r.value)
        } else {
          clips.push({
            imageUrl: batch[clips.length - (i)] || '',
            videoUrl: null,
            provider: 'error',
            error: r.reason?.message || 'Failed',
          })
        }
      }
    }

    const successCount = clips.filter(c => c.videoUrl).length
    done(200)
    return apiSuccess({
      data: {
        clips,
        animated: successCount,
        total: images.length,
      },
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    logger.error('Animate scenes error', { error: msg })
    done(500)
    return serverError(msg.includes('ffmpeg') ? msg : 'Scene animation failed. Please try again.')
  }
}
