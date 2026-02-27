import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { generateContent } from '@/lib/llm'
import { rateLimit } from '@/lib/rate-limit'
import { z } from 'zod'
import { apiSuccess, unauthorized, rateLimited, badRequest, serverError } from '@/lib/api-response'
import { logger } from '@/lib/logger'

const PLATFORM_RULES: Record<string, string> = {
  tiktok: 'Short, punchy, conversational. Use trending phrases. 3-5 hashtags max. Hook in first line.',
  instagram: 'Balanced with emojis. Strong opening line. Mix niche + broad hashtags (20-30). End with CTA.',
  youtube_shorts: 'SEO-focused description. Keywords first. 5-10 hashtags. Include #Shorts.',
  twitter_x: 'Concise under 280 chars. 2-3 hashtags max. Conversational and witty. Encourage retweets.',
  linkedin: 'Professional tone. Insight-driven. 3-5 industry hashtags. No emojis overload. End with question.',
}

const CAPTION_LENGTHS: Record<string, string> = {
  short: '1-2 sentences max. Punchy and direct.',
  medium: '3-5 sentences. Balanced detail and brevity.',
  long: '6-10 sentences. Story-driven with details.',
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.email) return unauthorized()

    if (!rateLimit(`captions:${session.user.email}`, 20, 60 * 60 * 1000)) return rateLimited()

    const body = await req.json()
    const {
      text,
      platform = 'instagram',
      tone = 'casual',
      length = 'medium',
      includeEmojis = true,
      hashtagCount = 15,
      productName,
    } = body

    // Validate inputs
    const captionSchema = z.object({
      text: z.string().min(1).max(2000),
      platform: z.enum(['tiktok', 'instagram', 'youtube_shorts', 'twitter_x', 'linkedin']).default('instagram'),
      tone: z.string().max(50).default('casual'),
      length: z.enum(['short', 'medium', 'long']).default('medium'),
      includeEmojis: z.boolean().default(true),
      hashtagCount: z.number().int().min(1).max(30).default(15),
      productName: z.string().max(200).optional(),
    })

    const validated = captionSchema.safeParse(body)
    if (!validated.success) {
      return badRequest('Invalid input', validated.error.flatten().fieldErrors)
    }

    // Re-assign from validated data for safety
    Object.assign(body, validated.data)

    const platformRule = PLATFORM_RULES[platform] || PLATFORM_RULES.instagram
    const lengthRule = CAPTION_LENGTHS[length] || CAPTION_LENGTHS.medium

    const prompt = `Generate social media captions and hashtags for ${platform.toUpperCase()}.

CONTEXT/PRODUCT: ${productName ? `${productName} — ` : ''}${text}

PLATFORM RULES: ${platformRule}
CAPTION LENGTH: ${lengthRule}
TONE: ${tone}
${includeEmojis ? 'Include relevant emojis throughout.' : 'Do NOT use emojis.'}

Generate EXACTLY this JSON structure (no extra text):
{
  "captions": [
    "Caption variation 1 — the best performer",
    "Caption variation 2 — different angle",
    "Caption variation 3 — unique approach"
  ],
  "hashtags": {
    "niche": ["#hashtag1", "#hashtag2", "#hashtag3", "#hashtag4", "#hashtag5"],
    "trending": ["#hashtag6", "#hashtag7", "#hashtag8", "#hashtag9", "#hashtag10"],
    "broad": ["#hashtag11", "#hashtag12", "#hashtag13", "#hashtag14", "#hashtag15"]
  },
  "hashtagString": "#hashtag1 #hashtag2 ... (all ${hashtagCount} hashtags in one copy-paste string)",
  "tips": [
    "Tip 1 for maximizing reach",
    "Tip 2 for engagement"
  ]
}

RULES:
- Generate exactly 3 caption variations with DIFFERENT approaches
- Generate exactly ${hashtagCount} hashtags split into niche/trending/broad categories
- Include 2 platform-specific optimization tips
- Output ONLY valid JSON, nothing else`

    const rawContent = await generateContent({
      prompt,
      systemPrompt: 'You are a social media caption and hashtag expert. Output ONLY valid JSON. No markdown, no explanations.',
      temperature: 0.8,
      maxTokens: 1500,
    })

    // Extract JSON from response
    let parsed
    try {
      // Try direct parse first
      parsed = JSON.parse(rawContent)
    } catch {
      // Try to find JSON in the response
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[0])
        } catch {
          return serverError('Failed to parse AI response')
        }
      } else {
        return serverError('No valid output from AI')
      }
    }

    return apiSuccess({
      data: {
        platform,
        captions: parsed.captions || [],
        hashtags: parsed.hashtags || { niche: [], trending: [], broad: [] },
        hashtagString: parsed.hashtagString || '',
        tips: parsed.tips || [],
      },
    })
  } catch (error) {
    logger.error('Caption generation error', { error: error instanceof Error ? error.message : String(error) })
    return serverError('Caption generation failed')
  }
}
