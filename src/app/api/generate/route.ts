import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { generateContent } from '@/lib/llm'
import { buildMasterPrompt, parseGeneratedOutput, validateParsedOutput, systemPrompt } from '@/lib/prompts'
import { rateLimit } from '@/lib/rate-limit'
import { ensureUser, trackUsage, prisma } from '@/lib/db'
import { z } from 'zod'
import { apiSuccess, unauthorized, rateLimited, badRequest, serverError } from '@/lib/api-response'
import { logger } from '@/lib/logger'

const generateSchema = z.object({
  productName: z.string().min(1).max(100),
  productDescription: z.string().min(1).max(500),
  targetAudience: z.string().min(1).max(200),
  platform: z.enum(['tiktok', 'instagram', 'youtube_shorts', 'twitter_x', 'linkedin']),
  contentGoal: z.enum(['sales', 'engagement', 'follower_growth', 'authority_building']),
  tone: z.enum(['casual', 'bold', 'emotional', 'educational', 'storytelling']),
  ctaType: z.string().min(1).max(100),
  competitorLinks: z.string().optional(),
  customerReviews: z.string().optional(),
  websiteUrl: z.string().optional(),
  pricePoint: z.string().optional(),
  objections: z.string().optional(),
})

export async function POST(req: NextRequest) {
  let done = (_status: number, _extra?: Record<string, unknown>) => {}
  try {
    const session = await auth()
    if (!session?.user?.email) return unauthorized()
    done = logger.apiRequest(req, session?.user?.email)

    const identifier = session.user.email
    if (!rateLimit(identifier, 20, 60 * 60 * 1000)) {
      done(429)
      return rateLimited()
    }

    const body = await req.json()
    const parsed = generateSchema.safeParse(body)
    if (!parsed.success) {
      done(400)
      return badRequest('Invalid input', parsed.error.flatten().fieldErrors)
    }

    const prompt = buildMasterPrompt(parsed.data)

    // Generate content with retry if parsing yields too few sections
    let rawOutput = ''
    let output = parseGeneratedOutput('')
    const MIN_SECTIONS = 4 // At least 4 out of ~10 sections must parse successfully

    for (let attempt = 0; attempt < 2; attempt++) {
      rawOutput = await generateContent({
        prompt,
        systemPrompt,
        temperature: attempt === 0 ? 0.85 : 0.7, // Lower temp on retry for more predictable formatting
        maxTokens: 3000,
      })

      output = parseGeneratedOutput(rawOutput)
      const score = validateParsedOutput(output)

      if (score >= MIN_SECTIONS) break
      if (attempt === 0) {
        console.warn(`[Generate] Parsed only ${score}/${MIN_SECTIONS} sections, retrying with lower temperature...`)
      }
    }

    // Save to database automatically
    const user = await ensureUser(session.user.email, session.user.name)
    const saved = await prisma.generatedContent.create({
      data: {
        userId: user.id,
        productName: parsed.data.productName,
        productDescription: parsed.data.productDescription,
        targetAudience: parsed.data.targetAudience,
        platform: parsed.data.platform,
        contentGoal: parsed.data.contentGoal,
        tone: parsed.data.tone,
        ctaType: parsed.data.ctaType,
        hookBank: JSON.stringify(output.hookBank || []),
        script: output.script || '',
        altAngles: JSON.stringify(output.altAngles || {}),
        caption: output.caption || '',
        hashtags: JSON.stringify(output.hashtags || []),
        ctaVariations: JSON.stringify(output.ctaVariations || []),
        thumbnailTexts: JSON.stringify(output.thumbnailTexts || []),
        engagementBaits: JSON.stringify(output.engagementBaits || []),
        repurposedContent: output.repurposedContent || '',
        abVariants: JSON.stringify(output.abVariants || []),
        rawOutput,
      },
    })

    // Track usage
    await trackUsage(user.id)

    done(200)
    return apiSuccess({ data: { output, rawOutput, contentId: saved.id } })
  } catch (error) {
    logger.error('Generation error', { error: error instanceof Error ? error.message : String(error) })
    done(500)
    return serverError('Content generation failed. Please check your API key and try again.')
  }
}
