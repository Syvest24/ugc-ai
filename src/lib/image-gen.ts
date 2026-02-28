/**
 * AI Image Generation Abstraction Layer
 *
 * Supports multiple providers:
 * - Pollinations.ai (free, unlimited, default)
 * - Together.ai (Flux models, $5 free credit)
 * - Stability AI (Stable Diffusion)
 *
 * Follows the same pattern as llm.ts — provider selected via env vars.
 *
 * On Vercel/serverless: returns external URLs or data URIs (no local FS writes).
 * Locally: saves to public/generated-images/ for static serving.
 */

import { logger } from '@/lib/logger'
import crypto from 'crypto'

// Re-export client-safe constants so server code can import from here too
export { IMAGE_STYLES, IMAGE_ASPECT_RATIOS, type ImageStyle } from '@/lib/image-constants'
import type { ImageStyle } from '@/lib/image-constants'

// ─── Environment detection ──────────────────────────────────────────

const IS_SERVERLESS = !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME || !!process.env.RAILWAY_ENVIRONMENT

// ─── Types ────────────────────────────────────────────────────────────

export type ImageProvider = 'pollinations' | 'together' | 'stability'

export interface ImageGenOptions {
  prompt: string
  negativePrompt?: string
  width?: number
  height?: number
  style?: ImageStyle
  seed?: number
}

export interface ImageGenResult {
  url: string          // Public URL, external URL, or data URI
  localPath?: string   // Local file path (only in non-serverless environments)
  width: number
  height: number
  provider: ImageProvider
  model: string
  seed?: number
}

// ─── Style prompt enhancers ──────────────────────────────────────────

const STYLE_SUFFIXES: Record<ImageStyle, string> = {
  'photorealistic': ', ultra realistic photography, DSLR, 8k, sharp focus, professional lighting',
  'digital-art': ', digital art, vibrant colors, detailed illustration, trending on artstation',
  'anime': ', anime style, high quality anime art, studio ghibli inspired, vibrant',
  'cinematic': ', cinematic shot, dramatic lighting, anamorphic lens, film grain, movie still',
  'minimalist': ', minimalist design, clean lines, simple composition, modern aesthetic',
  'watercolor': ', watercolor painting, soft edges, artistic, hand-painted texture',
  'oil-painting': ', oil painting on canvas, rich textures, classical art style, masterwork',
  '3d-render': ', 3D render, octane render, volumetric lighting, high detail, CGI',
  'neon': ', neon lighting, cyberpunk aesthetic, glowing colors, dark background, futuristic',
  'vintage': ', vintage photography, retro film grain, muted colors, nostalgic aesthetic',
}

const DEFAULT_NEGATIVE = 'blurry, low quality, distorted, watermark, text, logo, bad anatomy, deformed'

// ─── Local file storage (dev only) ───────────────────────────────────

async function saveToLocal(buffer: Buffer, filename: string): Promise<string> {
  if (IS_SERVERLESS) return '' // Skip on serverless

  const fs = await import('fs')
  const path = await import('path')
  const OUTPUT_DIR = path.join(process.cwd(), 'public', 'generated-images')

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  }

  const localPath = path.join(OUTPUT_DIR, filename)
  fs.writeFileSync(localPath, buffer)
  return localPath
}

// ─── Main entry ──────────────────────────────────────────────────────

export async function generateImage(options: ImageGenOptions): Promise<ImageGenResult> {
  const provider = (process.env.IMAGE_PROVIDER || 'pollinations') as ImageProvider
  const enhancedPrompt = options.style
    ? options.prompt + (STYLE_SUFFIXES[options.style] || '')
    : options.prompt

  const opts: ImageGenOptions = {
    ...options,
    prompt: enhancedPrompt,
    negativePrompt: options.negativePrompt || DEFAULT_NEGATIVE,
    width: options.width || 1024,
    height: options.height || 1024,
  }

  logger.info('Generating image', { provider, style: options.style, width: opts.width, height: opts.height })

  switch (provider) {
    case 'pollinations':
      return generateWithPollinations(opts)
    case 'together':
      return generateWithTogether(opts)
    case 'stability':
      return generateWithStability(opts)
    default:
      return generateWithPollinations(opts)
  }
}

// ─── Pollinations.ai (FREE, no API key needed) ──────────────────────

async function generateWithPollinations(opts: ImageGenOptions): Promise<ImageGenResult> {
  const seed = opts.seed || Math.floor(Math.random() * 999999)
  const width = opts.width || 1024
  const height = opts.height || 1024

  // Pollinations uses GET with URL-encoded prompt
  const encodedPrompt = encodeURIComponent(opts.prompt)
  const externalUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&seed=${seed}&nologo=true&enhance=true`

  if (IS_SERVERLESS) {
    // On serverless, return the Pollinations URL directly (no download needed)
    return {
      url: externalUrl,
      width,
      height,
      provider: 'pollinations',
      model: 'flux',
      seed,
    }
  }

  // In dev, download and save locally
  const response = await fetch(externalUrl)
  if (!response.ok) {
    throw new Error(`Pollinations error: ${response.status} ${response.statusText}`)
  }

  const buffer = Buffer.from(await response.arrayBuffer())
  const filename = `img-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.png`
  const localPath = await saveToLocal(buffer, filename)

  return {
    url: `/generated-images/${filename}`,
    localPath,
    width,
    height,
    provider: 'pollinations',
    model: 'flux',
    seed,
  }
}

// ─── Together.ai (Flux/SDXL, pay-per-use) ───────────────────────────

async function generateWithTogether(opts: ImageGenOptions): Promise<ImageGenResult> {
  const apiKey = process.env.TOGETHER_API_KEY || process.env.LLM_API_KEY
  if (!apiKey) throw new Error('TOGETHER_API_KEY is not set')

  const model = process.env.IMAGE_MODEL || 'black-forest-labs/FLUX.1-schnell-Free'
  const width = opts.width || 1024
  const height = opts.height || 1024

  const response = await fetch('https://api.together.xyz/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      prompt: opts.prompt,
      negative_prompt: opts.negativePrompt,
      width,
      height,
      steps: 4,
      n: 1,
      seed: opts.seed,
      response_format: 'b64_json',
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Together.ai image error: ${err}`)
  }

  const data = await response.json()
  const b64 = data.data?.[0]?.b64_json
  if (!b64) throw new Error('No image data returned from Together.ai')

  if (IS_SERVERLESS) {
    // On serverless, return as data URI (no local FS)
    return {
      url: `data:image/png;base64,${b64}`,
      width,
      height,
      provider: 'together',
      model,
      seed: data.data?.[0]?.seed,
    }
  }

  // In dev, decode and save locally
  const buffer = Buffer.from(b64, 'base64')
  const filename = `img-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.png`
  const localPath = await saveToLocal(buffer, filename)

  return {
    url: `/generated-images/${filename}`,
    localPath,
    width,
    height,
    provider: 'together',
    model,
    seed: data.data?.[0]?.seed,
  }
}

// ─── Stability AI (Stable Diffusion, pay-per-use) ───────────────────

async function generateWithStability(opts: ImageGenOptions): Promise<ImageGenResult> {
  const apiKey = process.env.STABILITY_API_KEY
  if (!apiKey) throw new Error('STABILITY_API_KEY is not set')

  const width = opts.width || 1024
  const height = opts.height || 1024

  const response = await fetch('https://api.stability.ai/v2beta/stable-image/generate/sd3', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Accept': 'image/*',
    },
    body: (() => {
      const form = new FormData()
      form.append('prompt', opts.prompt)
      if (opts.negativePrompt) form.append('negative_prompt', opts.negativePrompt)
      form.append('output_format', 'png')
      form.append('aspect_ratio', getStabilityAspectRatio(width, height))
      if (opts.seed) form.append('seed', String(opts.seed))
      return form
    })(),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Stability AI error: ${err}`)
  }

  const buffer = Buffer.from(await response.arrayBuffer())

  if (IS_SERVERLESS) {
    // On serverless, return as data URI
    return {
      url: `data:image/png;base64,${buffer.toString('base64')}`,
      width,
      height,
      provider: 'stability',
      model: 'sd3',
    }
  }

  // In dev, save locally
  const filename = `img-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.png`
  const localPath = await saveToLocal(buffer, filename)

  return {
    url: `/generated-images/${filename}`,
    localPath,
    width,
    height,
    provider: 'stability',
    model: 'sd3',
  }
}

function getStabilityAspectRatio(w: number, h: number): string {
  const ratio = w / h
  if (ratio > 1.4) return '16:9'
  if (ratio > 1.1) return '4:3'
  if (ratio < 0.7) return '9:16'
  if (ratio < 0.9) return '3:4'
  return '1:1'
}

// ─── Prompt builder helper ───────────────────────────────────────────

export function buildImagePrompt(
  productName: string,
  productDescription: string,
  context?: string,
): string {
  let prompt = `High quality product photo of ${productName}`
  if (productDescription) {
    prompt += `. ${productDescription}`
  }
  if (context) {
    prompt += `. ${context}`
  }
  prompt += '. Professional product photography, studio lighting, clean background'
  return prompt
}

// IMAGE_STYLES and IMAGE_ASPECT_RATIOS are re-exported from '@/lib/image-constants'
