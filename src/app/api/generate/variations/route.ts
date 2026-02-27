import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { generateContent } from '@/lib/llm'
import { systemPrompt, parseGeneratedOutput } from '@/lib/prompts'
import { rateLimit } from '@/lib/rate-limit'
import { ensureUser, trackUsage, prisma } from '@/lib/db'
import { z } from 'zod'
import { apiSuccess, unauthorized, rateLimited, badRequest, serverError } from '@/lib/api-response'
import { PLATFORM_LABELS, GOAL_PROMPT_LABELS } from '@/lib/constants'
import { logger } from '@/lib/logger'

const variationsSchema = z.object({
  productName: z.string().min(1).max(100),
  productDescription: z.string().min(1).max(500),
  targetAudience: z.string().min(1).max(200),
  platform: z.enum(['tiktok', 'instagram', 'youtube_shorts', 'twitter_x', 'linkedin']),
  contentGoal: z.enum(['sales', 'engagement', 'follower_growth', 'authority_building']),
  tone: z.enum(['casual', 'bold', 'emotional', 'educational', 'storytelling']),
  ctaType: z.string().min(1).max(100),
  parentContentId: z.string().optional(),
  competitorLinks: z.string().optional(),
  customerReviews: z.string().optional(),
  websiteUrl: z.string().optional(),
  pricePoint: z.string().optional(),
  objections: z.string().optional(),
})

const VARIATION_STRATEGIES = [
  {
    name: 'Curiosity-Driven',
    angle: 'curiosity and open loops',
    instructions: `Focus on CURIOSITY GAPS and OPEN LOOPS. Start with shocking facts, unanswered questions, or "you won't believe" style hooks.
    Use cliffhanger techniques throughout. Make the viewer NEED to keep watching.
    Style: Quick cuts mentality, each line should create a mini mystery.`,
  },
  {
    name: 'Emotion-First',
    angle: 'emotional triggers and storytelling',
    instructions: `Focus on EMOTIONAL STORYTELLING. Lead with a relatable pain point or aspirational transformation.
    Use first-person narrative ("I used to...then I found..."). Build emotional investment.
    Style: Vulnerable, authentic, diary-entry feel. Raw and real.`,
  },
  {
    name: 'Authority & Proof',
    angle: 'social proof and expert positioning',
    instructions: `Focus on SOCIAL PROOF and AUTHORITY. Lead with numbers, results, testimonials, or expert credentials.
    Use "X people already..." or "After testing 50 products..." type framing.
    Style: Confident, data-driven, "let me show you the receipts" energy.`,
  },
]

function buildVariationPrompt(
  data: z.infer<typeof variationsSchema>,
  strategy: typeof VARIATION_STRATEGIES[number]
): string {
  const platformLabels = PLATFORM_LABELS
  const goalLabels = GOAL_PROMPT_LABELS

  return `Generate a COMPLETE UGC content variation using the "${strategy.name}" strategy.

STRATEGY FOCUS: ${strategy.angle}
${strategy.instructions}

PRODUCT DETAILS:
- Product Name: ${data.productName}
- Description: ${data.productDescription}
- Target Audience: ${data.targetAudience}
- Platform: ${platformLabels[data.platform] || data.platform}
- Content Goal: ${goalLabels[data.contentGoal] || data.contentGoal}
- Tone: ${data.tone}
- CTA Type: ${data.ctaType}

Generate these sections with EXACTLY these headers:

=== HOOK OPTIONS ===
Generate 5 hook variations using the ${strategy.name} strategy. Number 1-5.

=== SCRIPT ===
Write a 30-60 second video script using the ${strategy.name} approach. Include [PAUSE], [HOLD UP PRODUCT] stage directions.

=== CAPTION ===
Write a ${platformLabels[data.platform]}-optimized caption matching this strategy.

=== HASHTAGS ===
List 10 relevant hashtags, one per line.

=== CTA VARIATIONS ===
Write 3 CTA variations. Number 1-3.

=== THUMBNAIL TEXT ===
Write 3 thumbnail suggestions. Number 1-3.

Make this variation DISTINCTLY DIFFERENT from a standard approach. Lean into the ${strategy.name} angle hard.`
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.email) return unauthorized()

    if (!rateLimit(session.user.email, 10, 60 * 60 * 1000)) return rateLimited()

    const body = await req.json()
    const parsed = variationsSchema.safeParse(body)
    if (!parsed.success) return badRequest('Invalid input', parsed.error.flatten().fieldErrors)

    const user = await ensureUser(session.user.email, session.user.name)

    // Generate all 3 variations in parallel
    const variationPromises = VARIATION_STRATEGIES.map(async (strategy) => {
      const prompt = buildVariationPrompt(parsed.data, strategy)
      try {
        const rawOutput = await generateContent({
          prompt,
          systemPrompt,
          temperature: 0.9, // Higher temp for more variety
          maxTokens: 2000,
        })

        const output = parseVariationOutput(rawOutput, strategy.name)

        // Save to DB
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
            altAngles: JSON.stringify({}),
            caption: output.caption || '',
            hashtags: JSON.stringify(output.hashtags || []),
            ctaVariations: JSON.stringify(output.ctaVariations || []),
            thumbnailTexts: JSON.stringify(output.thumbnailTexts || []),
            engagementBaits: JSON.stringify([]),
            repurposedContent: '',
            abVariants: JSON.stringify([]),
            rawOutput,
          },
        })

        return {
          id: saved.id,
          strategy: strategy.name,
          output,
          success: true,
        }
      } catch (error) {
        logger.error(`Variation "${strategy.name}" failed`, { error: error instanceof Error ? error.message : String(error) })
        return {
          id: null,
          strategy: strategy.name,
          output: null,
          success: false,
          error: error instanceof Error ? error.message : 'Generation failed',
        }
      }
    })

    const variations = await Promise.all(variationPromises)

    // Track usage for successful generations
    const successCount = variations.filter(v => v.success).length
    for (let i = 0; i < successCount; i++) {
      await trackUsage(user.id)
    }

    return apiSuccess({
      data: {
        variations,
        strategies: VARIATION_STRATEGIES.map(s => s.name),
      },
    })
  } catch (error) {
    logger.error('Variations error', { error: error instanceof Error ? error.message : String(error) })
    return serverError('Content variation generation failed')
  }
}

function parseVariationOutput(raw: string, strategyName: string) {
  const extract = (start: string, end?: string): string => {
    const startIdx = raw.indexOf(start)
    if (startIdx === -1) return ''
    const contentStart = startIdx + start.length
    const endIdx = end ? raw.indexOf(end, contentStart) : raw.length
    return raw.slice(contentStart, endIdx === -1 ? raw.length : endIdx).trim()
  }

  const hookSection = extract('=== HOOK OPTIONS ===', '=== SCRIPT ===')
  const hookLines = hookSection.split('\n').filter(l => /^\d+\./.test(l.trim()))
  const hookBank = hookLines.map(l => l.replace(/^\d+\.\s*/, '').trim()).filter(Boolean)
  if (hookBank.length === 0) {
    hookSection.split('\n').filter(l => l.trim()).slice(0, 5).forEach(l => hookBank.push(l.trim()))
  }

  const script = extract('=== SCRIPT ===', '=== CAPTION ===')
  const caption = extract('=== CAPTION ===', '=== HASHTAGS ===')

  const hashtagSection = extract('=== HASHTAGS ===', '=== CTA VARIATIONS ===')
  const hashtags = hashtagSection.split('\n').map(l => l.trim()).filter(l => l.startsWith('#'))

  const ctaSection = extract('=== CTA VARIATIONS ===', '=== THUMBNAIL TEXT ===')
  const ctaLines = ctaSection.split('\n').filter(l => /^\d+\./.test(l.trim()))
  const ctaVariations = ctaLines.map(l => l.replace(/^\d+\.\s*/, '').trim()).filter(Boolean)

  const thumbSection = extract('=== THUMBNAIL TEXT ===')
  const thumbLines = thumbSection.split('\n').filter(l => /^\d+\./.test(l.trim()))
  const thumbnailTexts = thumbLines.map(l => l.replace(/^\d+\.\s*/, '').trim()).filter(Boolean)

  return {
    strategyName,
    hookBank: hookBank.length > 0 ? hookBank : ['Hook coming...'],
    script: script || 'Script generation in progress...',
    caption: caption || '',
    hashtags: hashtags.length > 0 ? hashtags : ['#ugc'],
    ctaVariations: ctaVariations.length > 0 ? ctaVariations : ['Check it out!'],
    thumbnailTexts: thumbnailTexts.length > 0 ? thumbnailTexts : ['Watch This'],
  }
}
