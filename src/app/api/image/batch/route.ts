import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { generateImage, IMAGE_STYLES, type ImageStyle } from '@/lib/image-gen'
import { rateLimit } from '@/lib/rate-limit'
import { ensureUser, prisma } from '@/lib/db'
import { z } from 'zod'
import { apiSuccess, unauthorized, rateLimited, badRequest, serverError } from '@/lib/api-response'
import { logger } from '@/lib/logger'

const styleIds = IMAGE_STYLES.map(s => s.id) as [string, ...string[]]

const batchSchema = z.object({
  prompt: z.string().min(3).max(1000),
  negativePrompt: z.string().max(500).optional(),
  width: z.number().int().min(256).max(2048).optional(),
  height: z.number().int().min(256).max(2048).optional(),
  // Batch options — pick one mode
  mode: z.enum(['styles', 'variations', 'custom']),
  // For 'styles' mode — generate same prompt across multiple styles
  styles: z.array(z.enum(styleIds)).min(2).max(6).optional(),
  // For 'variations' mode — generate N variations with random seeds
  count: z.number().int().min(2).max(6).optional(),
  // For 'custom' mode — array of overrides
  items: z.array(z.object({
    style: z.enum(styleIds).optional(),
    seed: z.number().int().optional(),
    promptSuffix: z.string().max(200).optional(),
  })).min(2).max(6).optional(),
}).refine(data => {
  if (data.mode === 'styles') return data.styles && data.styles.length >= 2
  if (data.mode === 'variations') return data.count && data.count >= 2
  if (data.mode === 'custom') return data.items && data.items.length >= 2
  return false
}, { message: 'Invalid batch configuration for selected mode' })

export async function POST(req: NextRequest) {
  let done = (_status: number, _extra?: Record<string, unknown>) => {}
  try {
    const session = await auth()
    if (!session?.user?.email) return unauthorized()
    done = logger.apiRequest(req, session?.user?.email)

    // Rate limit: 5 batch requests per hour (each produces 2-6 images)
    const identifier = `image-batch:${session.user.email}`
    if (!rateLimit(identifier, 5, 60 * 60 * 1000)) {
      done(429)
      return rateLimited()
    }

    const body = await req.json()
    const parsed = batchSchema.safeParse(body)
    if (!parsed.success) {
      done(400)
      return badRequest('Invalid input', parsed.error.flatten().fieldErrors)
    }

    const { prompt, negativePrompt, width, height, mode } = parsed.data
    const user = await ensureUser(session.user.email, session.user.name)

    // Build generation tasks based on mode
    interface GenTask { style?: ImageStyle; seed?: number; promptSuffix?: string }
    const tasks: GenTask[] = []

    if (mode === 'styles' && parsed.data.styles) {
      for (const s of parsed.data.styles) {
        tasks.push({ style: s as ImageStyle })
      }
    } else if (mode === 'variations' && parsed.data.count) {
      for (let i = 0; i < parsed.data.count; i++) {
        tasks.push({ seed: Math.floor(Math.random() * 2147483647) })
      }
    } else if (mode === 'custom' && parsed.data.items) {
      for (const item of parsed.data.items) {
        tasks.push({
          style: item.style as ImageStyle | undefined,
          seed: item.seed,
          promptSuffix: item.promptSuffix,
        })
      }
    }

    // Execute all generation tasks concurrently
    const results = await Promise.allSettled(
      tasks.map(async (task) => {
        const fullPrompt = task.promptSuffix
          ? `${prompt}, ${task.promptSuffix}`
          : prompt

        const result = await generateImage({
          prompt: fullPrompt,
          negativePrompt,
          style: task.style,
          width,
          height,
          seed: task.seed,
        })

        // Save to DB
        const saved = await prisma.generatedImage.create({
          data: {
            userId: user.id,
            prompt: fullPrompt,
            negativePrompt: negativePrompt || null,
            provider: result.provider,
            model: result.model,
            imageUrl: result.url,
            width: result.width,
            height: result.height,
            style: task.style || null,
            seed: result.seed || null,
          },
        })

        return {
          id: saved.id,
          imageUrl: result.url,
          width: result.width,
          height: result.height,
          provider: result.provider,
          model: result.model,
          style: task.style || null,
          seed: result.seed,
        }
      })
    )

    const successes = results
      .filter((r): r is PromiseFulfilledResult<typeof r extends PromiseFulfilledResult<infer V> ? V : never> => r.status === 'fulfilled')
      .map(r => r.value)
    const failures = results.filter(r => r.status === 'rejected').length

    done(200)
    return apiSuccess({
      data: {
        images: successes,
        total: tasks.length,
        succeeded: successes.length,
        failed: failures,
      },
    })
  } catch (error) {
    logger.error('Batch image generation error', { error: error instanceof Error ? error.message : String(error) })
    done(500)
    return serverError('Batch generation failed. Please try again.')
  }
}
