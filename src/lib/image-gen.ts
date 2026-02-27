/**
 * AI Image Generation Abstraction Layer
 *
 * Supports multiple providers:
 * - Pollinations.ai (free, unlimited, default)
 * - Together.ai (Flux models, $5 free credit)
 * - Stability AI (Stable Diffusion)
 *
 * Follows the same pattern as llm.ts — provider selected via env vars.
 */

import { logger } from '@/lib/logger'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

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

export type ImageStyle =
  | 'photorealistic'
  | 'digital-art'
  | 'anime'
  | 'cinematic'
  | 'minimalist'
  | 'watercolor'
  | 'oil-painting'
  | '3d-render'
  | 'neon'
  | 'vintage'

export interface ImageGenResult {
  url: string          // Public URL or local path to generated image
  localPath: string    // Local file path for serving
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

// ─── Output directory ────────────────────────────────────────────────

const OUTPUT_DIR = path.join(process.cwd(), 'public', 'generated-images')

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
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
  const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&seed=${seed}&nologo=true&enhance=true`

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Pollinations error: ${response.status} ${response.statusText}`)
  }

  // Save to local file
  const buffer = Buffer.from(await response.arrayBuffer())
  ensureDir(OUTPUT_DIR)
  const filename = `img-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.png`
  const localPath = path.join(OUTPUT_DIR, filename)
  fs.writeFileSync(localPath, buffer)

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

  // Decode and save
  const buffer = Buffer.from(b64, 'base64')
  ensureDir(OUTPUT_DIR)
  const filename = `img-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.png`
  const localPath = path.join(OUTPUT_DIR, filename)
  fs.writeFileSync(localPath, buffer)

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
  ensureDir(OUTPUT_DIR)
  const filename = `img-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.png`
  const localPath = path.join(OUTPUT_DIR, filename)
  fs.writeFileSync(localPath, buffer)

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

// ─── Available styles for UI ─────────────────────────────────────────

export const IMAGE_STYLES: { id: ImageStyle; name: string; emoji: string }[] = [
  { id: 'photorealistic', name: 'Photorealistic', emoji: '📸' },
  { id: 'cinematic', name: 'Cinematic', emoji: '🎬' },
  { id: 'digital-art', name: 'Digital Art', emoji: '🎨' },
  { id: '3d-render', name: '3D Render', emoji: '🧊' },
  { id: 'minimalist', name: 'Minimalist', emoji: '⬜' },
  { id: 'neon', name: 'Neon / Cyberpunk', emoji: '💜' },
  { id: 'anime', name: 'Anime', emoji: '🌸' },
  { id: 'watercolor', name: 'Watercolor', emoji: '💧' },
  { id: 'oil-painting', name: 'Oil Painting', emoji: '🖼️' },
  { id: 'vintage', name: 'Vintage', emoji: '📷' },
]

// ─── Aspect ratio presets for images ────────────────────────────────

export const IMAGE_ASPECT_RATIOS = [
  { id: '1:1', label: 'Square', width: 1024, height: 1024, desc: 'Feed posts' },
  { id: '9:16', label: 'Portrait', width: 768, height: 1344, desc: 'Stories / Reels' },
  { id: '16:9', label: 'Landscape', width: 1344, height: 768, desc: 'YouTube / Banner' },
  { id: '4:5', label: 'Portrait (4:5)', width: 896, height: 1120, desc: 'Instagram post' },
  { id: '3:2', label: 'Classic (3:2)', width: 1200, height: 800, desc: 'Blog / Web' },
] as const
