/**
 * Text-to-Video Generation
 *
 * Direct prompt → AI video generation using multiple providers.
 *
 * Providers:
 *  1. Replicate (Wan 2.1, HunyuanVideo) — high quality
 *  2. Pollinations.ai — free tier
 */

import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import crypto from 'crypto'

const IS_SERVERLESS = !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME || !!process.env.RAILWAY_ENVIRONMENT

const OUTPUT_DIR = IS_SERVERLESS
  ? path.join('/tmp', 'generated', 'text-to-video')
  : path.join(process.cwd(), 'public', 'generated', 'text-to-video')

export interface TextToVideoOptions {
  /** Text prompt describing the video */
  prompt: string
  /** Negative prompt (what to avoid) */
  negativePrompt?: string
  /** Duration in seconds (default: 5) */
  duration?: number
  /** Aspect ratio */
  aspectRatio?: '16:9' | '9:16' | '1:1'
  /** Resolution */
  resolution?: '480p' | '720p' | '1080p'
  /** Provider to use */
  provider?: 'replicate' | 'pollinations'
}

export interface TextToVideoResult {
  videoUrl: string
  provider: string
  model: string
  duration: number
  prompt: string
}

export const TEXT_TO_VIDEO_STYLES = [
  { id: 'cinematic', name: 'Cinematic', prompt: 'cinematic, film grain, dramatic lighting, 4K' },
  { id: 'anime', name: 'Anime', prompt: 'anime style, vibrant colors, detailed animation' },
  { id: 'realistic', name: 'Realistic', prompt: 'photorealistic, hyperrealistic, natural lighting, detailed' },
  { id: 'dreamy', name: 'Dreamy', prompt: 'dreamy, ethereal, soft focus, pastel colors, magical atmosphere' },
  { id: '3d-render', name: '3D Render', prompt: '3D render, Pixar style, vibrant lighting, smooth shading' },
  { id: 'vintage', name: 'Vintage', prompt: 'vintage film, retro colors, VHS aesthetic, nostalgic' },
] as const

/**
 * Generate a video from a text prompt
 */
export async function generateTextToVideo(options: TextToVideoOptions): Promise<TextToVideoResult> {
  const provider = options.provider || selectProvider()

  if (!existsSync(OUTPUT_DIR)) {
    await mkdir(OUTPUT_DIR, { recursive: true })
  }

  switch (provider) {
    case 'replicate':
      return generateWithReplicate(options)
    case 'pollinations':
      return generateWithPollinations(options)
    default:
      return generateWithPollinations(options)
  }
}

function selectProvider(): TextToVideoOptions['provider'] {
  if (process.env.REPLICATE_API_TOKEN || process.env.REPLICATE_API_KEY) {
    return 'replicate'
  }
  return 'pollinations'
}

/**
 * Generate video via Replicate (Wan 2.1 T2V)
 */
async function generateWithReplicate(options: TextToVideoOptions): Promise<TextToVideoResult> {
  const apiKey = process.env.REPLICATE_API_TOKEN || process.env.REPLICATE_API_KEY || ''
  if (!apiKey) throw new Error('REPLICATE_API_TOKEN not configured')

  const models = [
    {
      owner: 'wan-ai',
      name: 'wan2.1-t2v-480p',
      label: 'Wan 2.1 T2V',
      buildInput: () => ({
        prompt: options.prompt,
        negative_prompt: options.negativePrompt || 'blurry, low quality, distorted, deformed',
        num_frames: Math.min((options.duration || 5) * 24, 81),
        guidance_scale: 5.0,
        num_inference_steps: 30,
      }),
    },
    {
      owner: 'minimax',
      name: 'video-01',
      label: 'MiniMax Video-01',
      buildInput: () => ({
        prompt: options.prompt,
        prompt_optimizer: true,
      }),
    },
  ]

  for (const model of models) {
    try {
      const createRes = await fetch(`https://api.replicate.com/v1/models/${model.owner}/${model.name}/predictions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ input: model.buildInput() }),
      })

      if (!createRes.ok) {
        const err = await createRes.text()
        console.warn(`[text-to-video] ${model.label} failed to create: ${err}`)
        continue
      }

      const prediction = await createRes.json()

      // Poll for completion (max 5 minutes for video gen)
      const maxWait = 300_000
      const start = Date.now()
      let result = prediction

      while (Date.now() - start < maxWait) {
        if (result.status === 'succeeded') break
        if (result.status === 'failed' || result.status === 'canceled') {
          throw new Error(`${model.label} failed: ${result.error || 'Unknown error'}`)
        }
        await new Promise(r => setTimeout(r, 5000))
        const pollRes = await fetch(`https://api.replicate.com/v1/predictions/${result.id}`, {
          headers: { 'Authorization': `Bearer ${apiKey}` },
        })
        result = await pollRes.json()
      }

      if (result.status !== 'succeeded') {
        console.warn(`[text-to-video] ${model.label} timed out`)
        continue
      }

      const outputUrl = typeof result.output === 'string' ? result.output : result.output?.[0] || result.output?.video
      if (!outputUrl) {
        console.warn(`[text-to-video] ${model.label} returned no output`)
        continue
      }

      // Download and save
      const videoRes = await fetch(outputUrl)
      const videoBuffer = Buffer.from(await videoRes.arrayBuffer())
      const filename = `t2v_${crypto.randomUUID().slice(0, 8)}.mp4`
      const outputPath = path.join(OUTPUT_DIR, filename)
      await writeFile(outputPath, videoBuffer)

      const servePath = IS_SERVERLESS
        ? `/api/generated/text-to-video/${filename}`
        : `/generated/text-to-video/${filename}`

      return {
        videoUrl: servePath,
        provider: 'replicate',
        model: model.label,
        duration: options.duration || 5,
        prompt: options.prompt,
      }
    } catch (err) {
      console.warn(`[text-to-video] ${model.label} error:`, err)
      continue
    }
  }

  // Fallback to Pollinations
  return generateWithPollinations(options)
}

/**
 * Generate video via Pollinations (free fallback)
 *
 * Generates a still image from Pollinations and converts it to a short
 * video clip with ffmpeg (Ken Burns pan/zoom effect).
 */
async function generateWithPollinations(options: TextToVideoOptions): Promise<TextToVideoResult> {
  const prompt = encodeURIComponent(options.prompt)
  const duration = options.duration || 5

  // Generate a still image and animate it with ffmpeg
  const imageUrl = `https://image.pollinations.ai/prompt/${prompt}?width=1024&height=576&model=flux&nologo=true&enhance=true&seed=${Date.now()}`

  try {
    const imgRes = await fetch(imageUrl, { signal: AbortSignal.timeout(60_000) })
    if (!imgRes.ok) throw new Error(`Pollinations image failed: ${imgRes.status}`)

    const imgBuf = Buffer.from(await imgRes.arrayBuffer())
    if (imgBuf.length < 5_000) throw new Error('Image too small — likely an error page')

    const imgFile = path.join(OUTPUT_DIR, `still_${crypto.randomUUID().slice(0, 8)}.jpg`)
    await writeFile(imgFile, imgBuf)

    const filename = `t2v_img_${crypto.randomUUID().slice(0, 8)}.mp4`
    const outputPath = path.join(OUTPUT_DIR, filename)

    // Create a Ken Burns effect (slow zoom) from the still image
    const { execSync } = await import('child_process')
    execSync(
      `ffmpeg -y -loop 1 -i "${imgFile}" -vf "zoompan=z='min(zoom+0.0015,1.3)':d=${duration * 25}:s=1024x576,format=yuv420p" -t ${duration} -c:v libx264 -preset fast -pix_fmt yuv420p "${outputPath}"`,
      { timeout: 120_000, stdio: 'pipe' }
    )

    const servePath = IS_SERVERLESS
      ? `/api/generated/text-to-video/${filename}`
      : `/generated/text-to-video/${filename}`

    return {
      videoUrl: servePath,
      provider: 'pollinations',
      model: 'image-to-video (ffmpeg)',
      duration,
      prompt: options.prompt,
    }
  } catch (err) {
    console.error('[text-to-video] Pollinations fallback failed:', err)
    throw new Error('All video generation providers failed. Please try again or check your API keys.')
  }
}

/**
 * Get available providers
 */
export function getTextToVideoProviders() {
  return [
    {
      id: 'replicate',
      name: 'Replicate (Wan 2.1)',
      available: !!(process.env.REPLICATE_API_TOKEN || process.env.REPLICATE_API_KEY),
      description: 'High-quality AI video generation via Wan 2.1 / MiniMax',
    },
    {
      id: 'pollinations',
      name: 'Pollinations (Free)',
      available: true,
      description: 'Free AI video generation (lower quality)',
    },
  ]
}
