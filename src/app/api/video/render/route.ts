import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { extractAudio, type VideoRenderInput, ASPECT_RATIO_DIMENSIONS, QUALITY_PRESETS } from '@/lib/video-renderer'
import { renderQueue, QueueFullError, RenderTimeoutError } from '@/lib/render-queue'
import { rateLimit } from '@/lib/rate-limit'
import { ensureUser, prisma } from '@/lib/db'
import { apiSuccess, apiError, unauthorized, rateLimited, badRequest, serverError } from '@/lib/api-response'
import { logger } from '@/lib/logger'

export async function POST(req: NextRequest) {
  let done = (_status: number, _extra?: Record<string, unknown>) => {}
  try {
    const session = await auth()
    if (!session?.user?.email) return unauthorized()
    done = logger.apiRequest(req, session?.user?.email)

    const identifier = session.user.email
    if (!rateLimit(`render:${identifier}`, 5, 60 * 60 * 1000)) {
      done(429)
      return rateLimited()
    }

    const body: VideoRenderInput & { contentId?: string; extractAudio?: boolean } = await req.json()

    if (!body.hook || !body.scriptLines || !body.cta || !body.template) {
      done(400)
      return badRequest('Missing required fields: hook, scriptLines, cta, template')
    }

    const validTemplates = ['CaptionStyle', 'TextOnScreen', 'SplitScreen', 'Countdown', 'Testimonial', 'BeforeAfter', 'ProductShowcase', 'Cinematic', 'Neon', 'Minimalist', 'Magazine']
    if (!validTemplates.includes(body.template)) {
      done(400)
      return badRequest(`Invalid template. Choose from: ${validTemplates.join(', ')}`)
    }

    if (body.aspectRatio && !ASPECT_RATIO_DIMENSIONS[body.aspectRatio]) {
      done(400)
      return badRequest(`Invalid aspect ratio. Choose from: ${Object.keys(ASPECT_RATIO_DIMENSIONS).join(', ')}`)
    }
    if (body.quality && !QUALITY_PRESETS[body.quality]) {
      done(400)
      return badRequest(`Invalid quality. Choose from: ${Object.keys(QUALITY_PRESETS).join(', ')}`)
    }
    if (body.format && !['mp4', 'gif'].includes(body.format)) {
      done(400)
      return badRequest('Invalid format. Choose from: mp4, gif')
    }

    // Save video record as rendering
    const user = await ensureUser(session.user.email, session.user.name)
    const videoRecord = await prisma.video.create({
      data: {
        userId: user.id,
        contentId: body.contentId || null,
        template: body.template,
        platform: body.platform,
        hook: body.hook,
        scriptLines: JSON.stringify(body.scriptLines),
        cta: body.cta,
        audioUrl: body.audioSrc || null,
        backgroundImage: body.backgroundImage || null,
        captionStyle: body.captionStyle || null,
        hookStyle: body.hookStyle || null,
        colorAccent: body.colorAccent || null,
        durationMs: body.durationMs || null,
        status: 'rendering',
      },
    })

    const result = await renderQueue.enqueue(body, user.id)

    // Optionally extract audio as MP3
    let audioPath: string | undefined
    if (body.extractAudio && result.format !== 'gif') {
      try {
        audioPath = await extractAudio(result.videoPath)
      } catch (e) {
        console.warn('Audio extraction failed:', e)
      }
    }

    // Update with result
    await prisma.video.update({
      where: { id: videoRecord.id },
      data: {
        videoPath: result.videoPath,
        width: result.width,
        height: result.height,
        durationMs: result.durationMs,
        status: 'completed',
      },
    })

    done(200)
    return apiSuccess({
      data: {
        videoId: videoRecord.id,
        videoPath: result.videoPath,
        width: result.width,
        height: result.height,
        durationMs: result.durationMs,
        format: result.format,
        queuedMs: result.queuedMs,
        ...(audioPath ? { audioPath } : {}),
      },
    })
  } catch (error) {
    if (error instanceof QueueFullError) {
      done(503)
      return apiError({ error: error.message, status: 503 })
    }
    if (error instanceof RenderTimeoutError) {
      done(504)
      return apiError({ error: 'Video render timed out. Please try again.', status: 504 })
    }
    logger.error('Video render error', { error: error instanceof Error ? error.message : String(error) })
    done(500)
    return serverError('Video rendering failed. Please try again.')
  }
}
