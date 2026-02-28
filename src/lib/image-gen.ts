/**
 * AI Image Generation Abstraction Layer
 *
 * Supports multiple providers:
 * - Pollinations.ai (free, unlimited, default)
 * - Replicate (FLUX-schnell, auto-fallback)
 * - Together.ai (Flux models, $5 free credit)
 * - Stability AI (Stable Diffusion)
 *
 * Follows the same pattern as llm.ts — provider selected via env vars.
 *
 * On Vercel/serverless: returns data URIs (no local FS writes).
 * Locally: saves to public/generated-images/ for static serving.
 */

import { logger } from '@/lib/logger'
import crypto from 'crypto'
import { GoogleGenAI, Modality } from '@google/genai'

// Re-export client-safe constants so server code can import from here too
export { IMAGE_STYLES, IMAGE_ASPECT_RATIOS, IMAGE_PROVIDERS, type ImageStyle } from '@/lib/image-constants'
import type { ImageStyle } from '@/lib/image-constants'

// ─── Environment detection ──────────────────────────────────────────

const IS_SERVERLESS = !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME || !!process.env.RAILWAY_ENVIRONMENT

// ─── Types ────────────────────────────────────────────────────────────

export type ImageProvider = 'pollinations' | 'replicate' | 'together' | 'stability' | 'gemini'

export interface ImageGenOptions {
  prompt: string
  negativePrompt?: string
  width?: number
  height?: number
  style?: ImageStyle
  seed?: number
  provider?: ImageProvider  // per-request provider override
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
  const provider = (options.provider || process.env.IMAGE_PROVIDER || 'pollinations') as ImageProvider
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

  const generate = (p: ImageProvider) => {
    switch (p) {
      case 'pollinations': return generateWithPollinations(opts)
      case 'replicate': return generateWithReplicate(opts)
      case 'together': return generateWithTogether(opts)
      case 'stability': return generateWithStability(opts)
      case 'gemini': return generateWithGemini(opts)
      default: return generateWithPollinations(opts)
    }
  }

  try {
    return await generate(provider)
  } catch (err) {
    // Auto-fallback: if primary fails, try Replicate (if token available)
    if (provider !== 'replicate' && process.env.REPLICATE_API_TOKEN) {
      logger.warn(`Image gen failed with ${provider}, falling back to Replicate`, { error: String(err) })
      return generateWithReplicate(opts)
    }
    throw err
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

  // Always fetch the image server-side to validate it works
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 60_000) // 60s timeout

  try {
    const response = await fetch(externalUrl, { signal: controller.signal })
    if (!response.ok) {
      throw new Error(`Pollinations error: ${response.status} ${response.statusText}`)
    }

    const ct = response.headers.get('content-type') || ''
    if (!ct.startsWith('image/')) {
      throw new Error(`Pollinations returned non-image content: ${ct}`)
    }

    const buffer = Buffer.from(await response.arrayBuffer())
    if (buffer.length < 1000) {
      throw new Error('Pollinations returned suspiciously small image')
    }

    if (IS_SERVERLESS) {
      // On serverless, return as data URI (no local FS)
      const mimeType = ct.split(';')[0] || 'image/png'
      return {
        url: `data:${mimeType};base64,${buffer.toString('base64')}`,
        width,
        height,
        provider: 'pollinations',
        model: 'flux',
        seed,
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
      provider: 'pollinations',
      model: 'flux',
      seed,
    }
  } finally {
    clearTimeout(timeout)
  }
}

// ─── Replicate (FLUX-schnell, fast & reliable) ──────────────────────

async function generateWithReplicate(opts: ImageGenOptions): Promise<ImageGenResult> {
  const token = process.env.REPLICATE_API_TOKEN
  if (!token) throw new Error('REPLICATE_API_TOKEN is not set')

  const width = opts.width || 1024
  const height = opts.height || 1024
  const aspectRatio = getAspectRatioString(width, height)

  logger.info('Generating image with Replicate FLUX-schnell', { aspectRatio })

  // Create prediction
  const createRes = await fetch('https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Prefer': 'wait',  // Sync mode — waits for result
    },
    body: JSON.stringify({
      input: {
        prompt: opts.prompt,
        num_outputs: 1,
        aspect_ratio: aspectRatio,
        output_format: 'png',
        output_quality: 90,
        go_fast: true,
        seed: opts.seed,
      },
    }),
  })

  if (!createRes.ok) {
    const err = await createRes.text()
    throw new Error(`Replicate error: ${createRes.status} ${err}`)
  }

  const prediction = await createRes.json()

  // If not completed yet (Prefer: wait should handle this, but just in case)
  let result = prediction
  if (result.status !== 'succeeded') {
    // Poll until done
    const getUrl = result.urls?.get
    if (!getUrl) throw new Error('No prediction URL returned')

    for (let i = 0; i < 60; i++) {
      await new Promise(r => setTimeout(r, 2000))
      const pollRes = await fetch(getUrl, {
        headers: { 'Authorization': `Bearer ${token}` },
      })
      result = await pollRes.json()
      if (result.status === 'succeeded') break
      if (result.status === 'failed' || result.status === 'canceled') {
        throw new Error(`Replicate prediction ${result.status}: ${result.error || 'unknown'}`)
      }
    }

    if (result.status !== 'succeeded') {
      throw new Error('Replicate prediction timed out')
    }
  }

  const imageUrl = Array.isArray(result.output) ? result.output[0] : result.output
  if (!imageUrl) throw new Error('No image URL in Replicate response')

  if (IS_SERVERLESS) {
    // Return Replicate's hosted URL directly (it's a CDN URL, not ephemeral)
    return {
      url: imageUrl,
      width,
      height,
      provider: 'replicate',
      model: 'flux-schnell',
      seed: opts.seed,
    }
  }

  // In dev, download and save locally
  const imgRes = await fetch(imageUrl)
  const buffer = Buffer.from(await imgRes.arrayBuffer())
  const filename = `img-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.png`
  const localPath = await saveToLocal(buffer, filename)

  return {
    url: `/generated-images/${filename}`,
    localPath,
    width,
    height,
    provider: 'replicate',
    model: 'flux-schnell',
    seed: opts.seed,
  }
}

function getAspectRatioString(w: number, h: number): string {
  const ratio = w / h
  if (ratio > 1.9) return '21:9'
  if (ratio > 1.4) return '16:9'
  if (ratio > 1.1) return '4:3'
  if (ratio < 0.55) return '9:21'
  if (ratio < 0.7) return '9:16'
  if (ratio < 0.9) return '3:4'
  return '1:1'
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

// ─── Google Gemini / Imagen (free tier available) ────────────────────

async function generateWithGemini(opts: ImageGenOptions): Promise<ImageGenResult> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set')

  const width = opts.width || 1024
  const height = opts.height || 1024

  const ai = new GoogleGenAI({ apiKey })

  logger.info('Generating image with Google Gemini Imagen', { width, height })

  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash-exp',
    contents: opts.prompt,
    config: {
      responseModalities: [Modality.TEXT, Modality.IMAGE],
    },
  })

  // Extract image from response parts
  const parts = response.candidates?.[0]?.content?.parts
  if (!parts) throw new Error('No response from Gemini')

  let imageData: string | null = null
  let mimeType = 'image/png'

  for (const part of parts) {
    if (part.inlineData) {
      imageData = part.inlineData.data ?? null
      mimeType = part.inlineData.mimeType || 'image/png'
      break
    }
  }

  if (!imageData) {
    throw new Error('Gemini did not return an image. Try a more descriptive prompt.')
  }

  if (IS_SERVERLESS) {
    return {
      url: `data:${mimeType};base64,${imageData}`,
      width,
      height,
      provider: 'gemini',
      model: 'gemini-2.0-flash-exp',
    }
  }

  // In dev, decode and save locally
  const buffer = Buffer.from(imageData, 'base64')
  const ext = mimeType.includes('png') ? 'png' : 'jpg'
  const filename = `img-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${ext}`
  const localPath = await saveToLocal(buffer, filename)

  return {
    url: `/generated-images/${filename}`,
    localPath,
    width,
    height,
    provider: 'gemini',
    model: 'gemini-2.0-flash-exp',
  }
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
