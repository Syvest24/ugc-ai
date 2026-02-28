import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { generateImage, type ImageStyle } from '@/lib/image-gen'
import { rateLimit } from '@/lib/rate-limit'
import { ensureUser, prisma } from '@/lib/db'
import { z } from 'zod'
import { apiSuccess, unauthorized, rateLimited, badRequest, serverError } from '@/lib/api-response'
import { logger } from '@/lib/logger'

const imageSchema = z.object({
  prompt: z.string().min(3, 'Prompt must be at least 3 characters').max(1000),
  negativePrompt: z.string().max(500).optional(),
  style: z.enum([
    'photorealistic', 'digital-art', 'anime', 'cinematic', 'minimalist',
    'watercolor', 'oil-painting', '3d-render', 'neon', 'vintage',
  ] as const).optional(),
  width: z.number().int().min(256).max(2048).optional(),
  height: z.number().int().min(256).max(2048).optional(),
  seed: z.number().int().optional(),
})

export async function POST(req: NextRequest) {
  let done = (_status: number, _extra?: Record<string, unknown>) => {}
  try {
    const session = await auth()
    if (!session?.user?.email) return unauthorized()
    done = logger.apiRequest(req, session?.user?.email)

    // Rate limit: 15 images per hour
    const identifier = `image:${session.user.email}`
    if (!rateLimit(identifier, 15, 60 * 60 * 1000)) {
      done(429)
      return rateLimited()
    }

    const body = await req.json()
    const parsed = imageSchema.safeParse(body)
    if (!parsed.success) {
      done(400)
      return badRequest('Invalid input', parsed.error.flatten().fieldErrors)
    }

    const { prompt, negativePrompt, style, width, height, seed } = parsed.data

    const result = await generateImage({
      prompt,
      negativePrompt,
      style: style as ImageStyle | undefined,
      width,
      height,
      seed,
    })

    // Save to database
    const user = await ensureUser(session.user.email, session.user.name)
    const saved = await prisma.generatedImage.create({
      data: {
        userId: user.id,
        prompt,
        negativePrompt: negativePrompt || null,
        provider: result.provider,
        model: result.model,
        imageUrl: result.url,
        width: result.width,
        height: result.height,
        style: style || null,
        seed: result.seed || null,
      },
    })

    done(200)
    return apiSuccess({
      data: {
        id: saved.id,
        imageUrl: result.url,
        width: result.width,
        height: result.height,
        provider: result.provider,
        model: result.model,
        style: style || null,
        seed: result.seed,
      },
    })
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error)
    logger.error('Image generation error', { error: errMsg })
    done(500)
    return serverError(`Image generation failed: ${errMsg}`)
  }
}
