import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { generateContent } from '@/lib/llm'
import { buildMasterPrompt, parseGeneratedOutput, systemPrompt } from '@/lib/prompts'
import { rateLimit } from '@/lib/rate-limit'
import { z } from 'zod'

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
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const identifier = session.user.id || session.user.email || 'anonymous'
    if (!rateLimit(identifier, 20, 60 * 60 * 1000)) {
      return NextResponse.json({ error: 'Rate limit exceeded. Please wait before generating more content.' }, { status: 429 })
    }

    const body = await req.json()
    const parsed = generateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }

    const prompt = buildMasterPrompt(parsed.data)
    const rawOutput = await generateContent({
      prompt,
      systemPrompt,
      temperature: 0.85,
      maxTokens: 3000,
    })

    const output = parseGeneratedOutput(rawOutput)
    return NextResponse.json({ success: true, output, rawOutput })
  } catch (error) {
    console.error('Generation error:', error)
    return NextResponse.json(
      { error: 'Content generation failed. Please check your API key and try again.' },
      { status: 500 }
    )
  }
}
