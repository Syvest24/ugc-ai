import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { generateContentStream } from '@/lib/llm'
import { buildMasterPrompt, parseGeneratedOutput, systemPrompt } from '@/lib/prompts'
import { rateLimit } from '@/lib/rate-limit'
import { ensureUser, trackUsage, prisma } from '@/lib/db'
import { z } from 'zod'
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
  llmProvider: z.enum(['openrouter', 'huggingface', 'together', 'groq', 'mistral']).optional(),
})

export async function POST(req: NextRequest) {
  let done = (_status: number, _extra?: Record<string, unknown>) => {}

  try {
    const session = await auth()
    if (!session?.user?.email) {
      return new Response('data: ' + JSON.stringify({ event: 'error', message: 'Unauthorized' }) + '\n\n', {
        status: 401,
        headers: { 'Content-Type': 'text/event-stream' },
      })
    }
    done = logger.apiRequest(req, session?.user?.email)

    const identifier = session.user.email
    if (!rateLimit(identifier, 20, 60 * 60 * 1000)) {
      done(429)
      return new Response('data: ' + JSON.stringify({ event: 'error', message: 'Rate limited. Try again later.' }) + '\n\n', {
        status: 429,
        headers: { 'Content-Type': 'text/event-stream' },
      })
    }

    const body = await req.json()
    const parsed = generateSchema.safeParse(body)
    if (!parsed.success) {
      done(400)
      return new Response('data: ' + JSON.stringify({ event: 'error', message: 'Invalid input' }) + '\n\n', {
        status: 400,
        headers: { 'Content-Type': 'text/event-stream' },
      })
    }

    const prompt = buildMasterPrompt(parsed.data)

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()
        const send = (event: string, data: unknown) => {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
        }

        let rawOutput = ''

        try {
          for await (const chunk of generateContentStream({
            prompt,
            systemPrompt,
            temperature: 0.85,
            maxTokens: 3000,
            providerOverride: parsed.data.llmProvider,
          })) {
            rawOutput += chunk
            send('text', chunk)
          }

          // Parse the complete output
          const output = parseGeneratedOutput(rawOutput)

          // Save to database
          const user = await ensureUser(session.user!.email!, session.user!.name)
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

          await trackUsage(user.id)

          send('done', { output, contentId: saved.id })
          done(200)
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Generation failed'
          send('error', message)
          done(500)
        } finally {
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no', // disable nginx buffering
      },
    })
  } catch (error) {
    logger.error('Stream generation error', { error: error instanceof Error ? error.message : String(error) })
    done(500)
    return new Response('data: ' + JSON.stringify({ event: 'error', message: 'Internal server error' }) + '\n\n', {
      status: 500,
      headers: { 'Content-Type': 'text/event-stream' },
    })
  }
}
