import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { rateLimit } from '@/lib/rate-limit'
import { apiSuccess, unauthorized, rateLimited, badRequest, serverError } from '@/lib/api-response'
import { logger } from '@/lib/logger'
import { generateImage, type ImageProvider } from '@/lib/image-gen'

/**
 * Generate AI background images for each scene (script line) in a video.
 * 
 * Uses Pollinations (free) or Gemini (free tier) to create contextually
 * relevant backgrounds for each script line.
 * 
 * POST /api/video/scenes
 * Body: { scriptLines: string[], productName?: string, style?: string, provider?: string }
 * Returns: { images: string[] } — one URL per script line
 */

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.email) return unauthorized()

    const identifier = session.user.email
    if (!rateLimit(`scene-gen:${identifier}`, 10, 60 * 60 * 1000)) return rateLimited()

    const body = await req.json()
    const { scriptLines, productName, style, provider: requestedProvider } = body

    if (!scriptLines || !Array.isArray(scriptLines) || scriptLines.length === 0) {
      return badRequest('scriptLines array is required')
    }

    if (scriptLines.length > 12) {
      return badRequest('Maximum 12 scenes allowed')
    }

    const provider = (requestedProvider || 'pollinations') as ImageProvider

    console.log(`[Scenes] Generating ${scriptLines.length} scene images via ${provider}`)

    // Generate images in parallel (max 4 at a time to avoid rate limits)
    const images: (string | null)[] = []
    const batchSize = 4

    for (let batch = 0; batch < scriptLines.length; batch += batchSize) {
      const batchLines = scriptLines.slice(batch, batch + batchSize)
      const batchResults = await Promise.allSettled(
        batchLines.map(async (line: string, idx: number) => {
          const sceneNumber = batch + idx + 1
          // Create a scene-appropriate prompt from the script line
          const scenePrompt = buildScenePrompt(line, productName, sceneNumber, scriptLines.length)

          try {
            const result = await generateImage({
              prompt: scenePrompt,
              width: 1080,
              height: 1920,
              style: (style || 'cinematic') as 'cinematic',
              provider,
            })
            console.log(`[Scenes] Scene ${sceneNumber}/${scriptLines.length} generated via ${result.provider}`)
            return result.url
          } catch (err) {
            console.error(`[Scenes] Scene ${sceneNumber} failed:`, err instanceof Error ? err.message : err)
            return null
          }
        })
      )

      for (const result of batchResults) {
        images.push(result.status === 'fulfilled' ? result.value : null)
      }
    }

    const successCount = images.filter(Boolean).length
    console.log(`[Scenes] Generated ${successCount}/${scriptLines.length} scene images`)

    return apiSuccess({
      data: {
        images,
        provider,
        generated: successCount,
        total: scriptLines.length,
      },
    })
  } catch (error) {
    logger.error('Scene generation error', { error: error instanceof Error ? error.message : String(error) })
    return serverError('Scene generation failed. Please try again.')
  }
}

/**
 * Build an image generation prompt from a script line.
 * Creates visually appropriate background images that work well with text overlaid.
 */
function buildScenePrompt(
  scriptLine: string,
  productName?: string,
  sceneNumber?: number,
  totalScenes?: number,
): string {
  // Clean the script line — remove stage directions, quotes, etc.
  const cleanLine = scriptLine
    .replace(/\[.*?\]/g, '')
    .replace(/["""'']/g, '')
    .trim()

  const product = productName ? ` related to ${productName}` : ''

  // Build a cinematic background prompt
  return [
    `Cinematic background scene${product} for a short video.`,
    `The scene should visually represent: "${cleanLine}"`,
    `Beautiful, atmospheric photography. Soft focus background suitable for text overlay.`,
    `Dark moody tones, professional lighting, 9:16 vertical format.`,
    `No text, no words, no letters, no UI elements. Pure visual scene.`,
  ].join(' ')
}
