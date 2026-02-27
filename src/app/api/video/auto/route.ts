import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { ensureUser, prisma } from '@/lib/db'
import { generateTTS, type VoiceId, VOICES } from '@/lib/tts'
import { renderQueue, QueueFullError, RenderTimeoutError } from '@/lib/render-queue'
import { rateLimit } from '@/lib/rate-limit'
import { apiSuccess, apiError, unauthorized, rateLimited, badRequest, notFound, serverError } from '@/lib/api-response'
import { logger } from '@/lib/logger'
import { parseJsonField } from '@/lib/json-field'

/**
 * One-click Script-to-Video Auto-Flow
 * 
 * Takes a contentId (or raw content) and automatically:
 * 1. Fetches the saved content from DB
 * 2. Extracts hook, script lines, CTA
 * 3. Generates TTS voiceover
 * 4. Renders video with sensible defaults
 * 5. Saves video record to DB
 * 6. Returns the video URL
 */

import { z } from 'zod'

const autoVideoSchema = z.object({
  contentId: z.string().max(100).optional(),
  hook: z.string().max(500).optional(),
  script: z.string().max(10000).optional(),
  cta: z.string().max(500).optional(),
  productName: z.string().max(200).optional(),
  productDescription: z.string().max(2000).optional(),
  platform: z.string().max(50).optional(),
  template: z.enum(['CaptionStyle', 'TextOnScreen', 'SplitScreen', 'Countdown', 'Testimonial', 'BeforeAfter', 'ProductShowcase']).optional(),
  voice: z.string().max(50).optional(),
  voiceRate: z.string().max(20).optional(),
  captionStyle: z.string().max(50).optional(),
  hookStyle: z.string().max(50).optional(),
  colorAccent: z.string().max(20).optional(),
}).refine(data => data.contentId || (data.hook && data.script), {
  message: 'Provide either contentId or both hook and script',
})

type AutoVideoRequest = z.infer<typeof autoVideoSchema>

export async function POST(req: NextRequest) {
  let done = (_status: number, _extra?: Record<string, unknown>) => {}
  try {
    const session = await auth()
    if (!session?.user?.email) return unauthorized()
    done = logger.apiRequest(req, session?.user?.email)

    const identifier = session.user.email
    if (!rateLimit(`auto-video:${identifier}`, 3, 60 * 60 * 1000)) {
      done(429)
      return rateLimited()
    }

    const rawBody = await req.json()
    const parsed = autoVideoSchema.safeParse(rawBody)
    if (!parsed.success) {
      done(400)
      return badRequest('Invalid input', parsed.error.flatten().fieldErrors)
    }

    const body = parsed.data
    const user = await ensureUser(session.user.email, session.user.name)

    let hook: string
    let scriptLines: string[]
    let cta: string
    let platform: string
    let contentId: string | null = body.contentId || null

    // Step 1: Get content - either from DB or from request body
    if (body.contentId) {
      const content = await prisma.generatedContent.findFirst({
        where: { id: body.contentId, userId: user.id },
      })

      if (!content) {
        done(404)
        return notFound('Content not found')
      }

      // Extract hook (first from hookBank)
      const hookBank = parseJsonField<string[]>(content.hookBank, [])
      hook = hookBank[0] || 'Check this out!'

      // Extract script lines
      scriptLines = (content.script || '')
        .split('\n')
        .map((l: string) => l.replace(/^\[.*?\]\s*/, '').trim())
        .filter((l: string) => l.length > 0)
        .slice(0, 8)

      // Extract CTA (first from ctaVariations, or fallback to ctaType)
      const ctaVariations = parseJsonField<string[]>(content.ctaVariations, [])
      cta = ctaVariations[0] || content.ctaType || 'Link in Bio'

      platform = content.platform
    } else if (body.hook && body.script) {
      hook = body.hook
      scriptLines = body.script
        .split('\n')
        .map(l => l.replace(/^\[.*?\]\s*/, '').trim())
        .filter(l => l.length > 0)
        .slice(0, 8)
      cta = body.cta || 'Link in Bio'
      platform = body.platform || 'tiktok'
    } else {
      done(400)
      return badRequest('Provide either contentId or hook+script')
    }

    if (scriptLines.length === 0) {
      done(400)
      return badRequest('No script lines found in content')
    }

    // Step 2: Generate TTS
    const voiceId = (body.voice || 'jenny') as VoiceId
    if (!VOICES[voiceId]) {
      done(400)
      return badRequest(`Invalid voice. Available: ${Object.keys(VOICES).join(', ')}`)
    }

    const fullText = [hook, ...scriptLines, cta].join('. ')
    let ttsResult
    try {
      ttsResult = await generateTTS(fullText, voiceId, body.voiceRate || '+0%')
    } catch (ttsError) {
      logger.error('TTS error in auto-flow', { error: ttsError instanceof Error ? ttsError.message : String(ttsError) })
      // Continue without TTS - video will use static text
      ttsResult = null
    }

    // Step 3: Create video record
    const template = body.template || 'CaptionStyle'
    const captionStyle = body.captionStyle || 'karaoke'
    const hookStyle = body.hookStyle || 'pop'
    const colorAccent = body.colorAccent || '#A855F7'
    const durationMs = ttsResult ? ttsResult.duration + 3000 : 30000

    const videoRecord = await prisma.video.create({
      data: {
        userId: user.id,
        contentId,
        template,
        platform,
        hook,
        scriptLines: JSON.stringify(scriptLines),
        cta,
        audioUrl: ttsResult?.audioPath || null,
        captionStyle,
        hookStyle,
        colorAccent,
        durationMs,
        status: 'rendering',
      },
    })

    // Step 4: Render video
    try {
      const result = await renderQueue.enqueue({
        template: template as 'CaptionStyle' | 'TextOnScreen' | 'SplitScreen',
        hook,
        scriptLines,
        cta,
        audioSrc: ttsResult?.audioPath,
        wordBoundaries: ttsResult?.wordBoundaries,
        platform,
        durationMs,
        captionStyle: captionStyle as 'karaoke' | 'word-by-word' | 'fade',
        hookStyle: hookStyle as 'pop' | 'typewriter' | 'slide',
        colorAccent,
      }, user.id)

      // Update video record with result
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
          durationMs: result.durationMs,
          width: result.width,
          height: result.height,
          queuedMs: result.queuedMs,
          ttsGenerated: !!ttsResult,
          hook,
          scriptLinesCount: scriptLines.length,
          cta,
          platform,
          template,
        },
      })
    } catch (renderError) {
      if (renderError instanceof QueueFullError) {
        done(503)
        return apiError({ error: renderError.message, status: 503 })
      }
      if (renderError instanceof RenderTimeoutError) {
        done(504)
        return apiError({ error: 'Video render timed out. Please try again.', status: 504 })
      }

      // Update video record as failed
      await prisma.video.update({
        where: { id: videoRecord.id },
        data: { status: 'failed' },
      })

      logger.error('Auto-flow render error', { error: renderError instanceof Error ? renderError.message : String(renderError) })
      done(500)
      return serverError('Video rendering failed. Try the manual video creator for more control.')
    }
  } catch (error) {
    logger.error('Auto-flow error', { error: error instanceof Error ? error.message : String(error) })
    done(500)
    return serverError('Auto video creation failed. Please try again.')
  }
}
