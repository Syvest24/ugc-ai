import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { imageToVideo, IMAGE_TO_VIDEO_MOTIONS, type MotionType } from '@/lib/image-to-video'
import { rateLimit } from '@/lib/rate-limit'
import { ensureUser } from '@/lib/db'
import { z } from 'zod'
import { apiSuccess, unauthorized, rateLimited, badRequest, serverError } from '@/lib/api-response'
import { logger } from '@/lib/logger'

const motionIds = IMAGE_TO_VIDEO_MOTIONS.map(m => m.id) as [string, ...string[]]

const i2vSchema = z.object({
  imageUrl: z.string().min(1, 'Image URL is required'),
  duration: z.number().int().min(2).max(10).optional(),
  motion: z.enum(motionIds).optional(),
  fps: z.number().int().min(12).max(30).optional(),
  width: z.number().int().min(256).max(1920).optional(),
  height: z.number().int().min(256).max(1920).optional(),
  provider: z.enum(['replicate', 'pollinations', 'local']).optional(),
})

export async function POST(req: NextRequest) {
  let done = (_status: number, _extra?: Record<string, unknown>) => {}
  try {
    const session = await auth()
    if (!session?.user?.email) return unauthorized()
    done = logger.apiRequest(req, session?.user?.email)

    // Rate limit: 10 image-to-video per hour
    const identifier = `i2v:${session.user.email}`
    if (!rateLimit(identifier, 10, 60 * 60 * 1000)) {
      done(429)
      return rateLimited()
    }

    const body = await req.json()
    const parsed = i2vSchema.safeParse(body)
    if (!parsed.success) {
      done(400)
      return badRequest('Invalid input', parsed.error.flatten().fieldErrors)
    }

    const { imageUrl, duration, motion, fps, width, height, provider } = parsed.data

    // Ensure user exists
    await ensureUser(session.user.email, session.user.name)

    const result = await imageToVideo({
      imageUrl,
      duration,
      motion: motion as MotionType | undefined,
      fps,
      width,
      height,
      provider,
    })

    done(200)
    return apiSuccess({
      data: {
        videoUrl: result.videoUrl,
        provider: result.provider,
        model: result.model,
        duration: result.duration,
        width: result.width,
        height: result.height,
      },
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    logger.error('Image-to-video error', { error: msg })
    done(500)
    return serverError(msg.includes('ffmpeg') ? msg : 'Video generation failed. Please try again.')
  }
}

export async function GET() {
  return apiSuccess({
    data: {
      motions: IMAGE_TO_VIDEO_MOTIONS,
      providers: [
        { id: 'replicate', name: 'Replicate (SVD)', available: !!process.env.REPLICATE_API_KEY },
        { id: 'pollinations', name: 'Pollinations.ai', available: true },
        { id: 'local', name: 'Local (ffmpeg)', available: true },
      ],
      limits: {
        maxDuration: 10,
        minDuration: 2,
        maxWidth: 1920,
        maxHeight: 1920,
      },
    },
  })
}
