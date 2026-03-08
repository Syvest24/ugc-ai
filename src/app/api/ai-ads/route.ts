import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { rateLimit } from '@/lib/rate-limit'
import { generateContent } from '@/lib/llm'
import { apiSuccess, unauthorized, rateLimited, badRequest, serverError } from '@/lib/api-response'
import { logger } from '@/lib/logger'

/**
 * POST /api/ai-ads — Generate a complete ad campaign
 */
export async function POST(req: NextRequest) {
  let done = (_status: number, _extra?: Record<string, unknown>) => {}
  try {
    const session = await auth()
    if (!session?.user?.email) return unauthorized()
    done = logger.apiRequest(req, session.user.email)

    const identifier = session.user.email
    if (!rateLimit(`ai-ads:${identifier}`, 15, 60 * 60 * 1000)) {
      done(429)
      return rateLimited()
    }

    const body = await req.json()
    const { productName, productDesc, targetAudience, adType, platform, tone } = body

    if (!productName?.trim() || !productDesc?.trim()) {
      done(400)
      return badRequest('Product name and description are required')
    }

    const prompt = `You are an expert ad copywriter and creative director. Generate a complete ad campaign for:

PRODUCT: ${productName}
DESCRIPTION: ${productDesc}
${targetAudience ? `TARGET AUDIENCE: ${targetAudience}` : ''}
AD FORMAT: ${adType || 'product-demo'}
PLATFORM: ${platform || 'tiktok'}
TONE: ${tone || 'casual'}

Generate the following in JSON format (return ONLY valid JSON, no markdown):
{
  "hook": "A 1-2 sentence attention-grabbing hook (first 3 seconds of the video)",
  "script": "A 30-60 second video script with natural, conversational tone. Include [VISUAL DIRECTION] notes.",
  "cta": "A compelling call-to-action",
  "caption": "Platform-optimized post caption (2-3 sentences)",
  "hashtags": "10-15 relevant hashtags as a single string",
  "headlines": ["3 different ad headline variations"],
  "imagePrompt": "A detailed prompt for generating the perfect ad visual/thumbnail with AI"
}

Make it feel authentic, not salesy. Use proven copywriting frameworks (PAS, AIDA, etc.).`

    const rawResponse = await generateContent({
      prompt,
      systemPrompt: 'You are an elite ad copywriter. Return ONLY valid JSON with no markdown formatting, no code fences.',
      temperature: 0.85,
      maxTokens: 2000,
    })

    // Parse the JSON response
    let adData
    try {
      // Try to extract JSON from the response (may have markdown fences)
      const jsonMatch = rawResponse.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('No JSON found in response')
      adData = JSON.parse(jsonMatch[0])
    } catch {
      console.error('[ai-ads] Failed to parse LLM response:', rawResponse.slice(0, 200))
      done(500)
      return serverError('Failed to parse ad content. Please try again.')
    }

    // Generate a preview image using Pollinations
    const imagePrompt = adData.imagePrompt || `${productName} advertisement, professional product photography`
    const previewImageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(imagePrompt)}?width=768&height=768&model=flux&nologo=true&seed=${Date.now()}`

    done(200)
    return apiSuccess({
      data: {
        hook: adData.hook || '',
        script: adData.script || '',
        cta: adData.cta || '',
        caption: adData.caption || '',
        hashtags: adData.hashtags || '',
        headlines: Array.isArray(adData.headlines) ? adData.headlines : [],
        imagePrompt: adData.imagePrompt || '',
        previewImageUrl,
      },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Ad generation failed'
    console.error('[api/ai-ads] Error:', msg)
    done(500)
    return serverError(msg)
  }
}
