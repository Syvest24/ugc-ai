import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { generateContent } from '@/lib/llm'
import { rateLimit } from '@/lib/rate-limit'
import { z } from 'zod'
import { apiSuccess, unauthorized, rateLimited, badRequest, serverError } from '@/lib/api-response'
import { logger } from '@/lib/logger'

const enhanceSchema = z.object({
  prompt: z.string().min(3).max(500),
  style: z.string().max(50).optional(),
  purpose: z.enum(['product', 'social', 'background', 'artistic', 'thumbnail']).optional(),
})

const systemPrompt = `You are an expert AI image prompt engineer. Given a basic description, enhance it into a detailed, vivid prompt optimized for AI image generation (Stable Diffusion / Flux models).

Rules:
- Return ONLY the enhanced prompt text, no explanations or labels
- Add specific details: lighting, composition, camera angle, mood, color palette
- Keep it under 200 words
- If a style is specified, tailor the prompt to that style
- Make it descriptive but natural, not keyword-stuffed`

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.email) return unauthorized()

    if (!rateLimit(`enhance:${session.user.email}`, 30, 60 * 60 * 1000)) {
      return rateLimited()
    }

    const body = await req.json()
    const parsed = enhanceSchema.safeParse(body)
    if (!parsed.success) {
      return badRequest('Invalid input', parsed.error.flatten().fieldErrors)
    }

    const { prompt, style, purpose } = parsed.data

    let userPrompt = `Enhance this image prompt: "${prompt}"`
    if (style) userPrompt += `\nStyle: ${style}`
    if (purpose) userPrompt += `\nPurpose: ${purpose} image`

    const enhanced = await generateContent({
      prompt: userPrompt,
      systemPrompt,
      temperature: 0.8,
      maxTokens: 300,
    })

    // Clean up — remove quotes, labels, etc.
    const cleaned = enhanced
      .replace(/^["']|["']$/g, '')
      .replace(/^(enhanced prompt|prompt|here is|here's)[:\s]*/i, '')
      .trim()

    return apiSuccess({ data: { original: prompt, enhanced: cleaned } })
  } catch (error) {
    logger.error('Prompt enhance error', { error: error instanceof Error ? error.message : String(error) })
    return serverError('Prompt enhancement failed')
  }
}
