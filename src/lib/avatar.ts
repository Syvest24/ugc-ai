/**
 * AI Avatar / Talking Head Generation
 *
 * Multi-provider module for generating talking head videos from a face image + audio.
 *
 * Providers:
 *  1. D-ID (free 5 min/month) — most professional, realistic lip-sync
 *  2. SadTalker via Replicate (~$0.005/run) — open source, good quality
 *  3. Static overlay (always free) — shows face image with CSS breathing animation
 *     Remotion handles the animated overlay in AvatarOverlay.tsx
 *
 * Usage flow:
 *  1. User picks/generates a face image (upload, AI generate, or preset)
 *  2. User generates TTS audio (existing)
 *  3. User clicks "Create Avatar" → face + audio → talking head video
 *  4. Remotion overlays the avatar in the video corner
 */

import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import crypto from 'crypto'

const IS_SERVERLESS = !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME || !!process.env.RAILWAY_ENVIRONMENT

// ─── Types ────────────────────────────────────────────────────

export type AvatarProvider = 'did' | 'sadtalker' | 'static'
export type AvatarPosition = 'bottom-left' | 'bottom-right' | 'bottom-center' | 'top-left' | 'top-right'
export type AvatarShape = 'circle' | 'rectangle' | 'rounded'
export type AvatarSize = 'small' | 'medium' | 'large'

export interface AvatarGenerateOptions {
  /** URL of the face/portrait image */
  faceImageUrl: string
  /** URL of the TTS audio file */
  audioUrl: string
  /** Provider to use (auto-selects if not specified) */
  provider?: AvatarProvider
  /** Duration hint in milliseconds */
  durationMs?: number
}

export interface AvatarResult {
  /** URL/path of the generated talking head video (or static image for 'static' provider) */
  videoUrl: string
  /** Which provider was used */
  provider: AvatarProvider
  /** Model name */
  model: string
  /** Whether this is an actual video or static image */
  isVideo: boolean
  /** Duration in seconds */
  duration: number
}

export interface AvatarConfig {
  /** Face image URL — static or AI-generated */
  faceImageUrl: string
  /** Talking head video URL (if generated via D-ID/SadTalker) */
  avatarVideoUrl?: string
  /** Overlay position */
  position: AvatarPosition
  /** Shape of the avatar frame */
  shape: AvatarShape
  /** Size of the avatar */
  size: AvatarSize
  /** Whether avatar is a video or static image */
  isVideo: boolean
}

// ─── Preset Avatars ───────────────────────────────────────────

export const AVATAR_PRESETS = [
  {
    id: 'ai-woman-1',
    name: 'Professional Woman',
    prompt: 'photorealistic headshot portrait of a 28 year old professional woman, shoulder-length brown hair, warm brown eyes, natural makeup, wearing a white blouse, soft smile looking directly at camera, studio lighting with softbox, shallow depth of field, neutral gray background, DSLR photograph 85mm f/1.8, detailed skin texture, high resolution',
    category: 'professional',
    seed: 4201,
  },
  {
    id: 'ai-woman-2',
    name: 'Casual Woman',
    prompt: 'photorealistic selfie portrait of a 25 year old casual woman content creator, blonde wavy hair, blue eyes, wearing a cozy sweater, genuine friendly smile, golden hour natural window lighting, slightly blurred living room background, iPhone camera style, natural no-makeup look, detailed skin pores, realistic photograph',
    category: 'casual',
    seed: 4202,
  },
  {
    id: 'ai-man-1',
    name: 'Professional Man',
    prompt: 'photorealistic headshot portrait of a 30 year old professional man, short dark hair neatly styled, clean shaven, wearing a navy blue dress shirt, confident subtle smile looking at camera, studio lighting with key and fill lights, neutral background, DSLR photograph 85mm f/1.8, detailed skin texture, crisp sharp focus, high resolution',
    category: 'professional',
    seed: 4203,
  },
  {
    id: 'ai-man-2',
    name: 'Casual Man',
    prompt: 'photorealistic selfie portrait of a 26 year old casual man content creator, tousled medium brown hair, light stubble beard, wearing a gray henley t-shirt, relaxed friendly expression, soft natural daylight, minimalist apartment background with bokeh, realistic photograph, detailed skin texture, warm color grading',
    category: 'casual',
    seed: 4204,
  },
  {
    id: 'ai-diverse-1',
    name: 'Lifestyle Creator',
    prompt: 'photorealistic portrait of a 27 year old South Asian woman lifestyle content creator, long dark hair, warm almond eyes, radiant smile, wearing a terracotta linen top, golden hour warm lighting, soft bokeh outdoor cafe background, DSLR 50mm f/1.4 photograph, natural skin texture, vibrant warm tones, social media influencer aesthetic',
    category: 'lifestyle',
    seed: 4205,
  },
  {
    id: 'ai-diverse-2',
    name: 'Tech Reviewer',
    prompt: 'photorealistic headshot of a 29 year old Black man tech reviewer content creator, short fade haircut, well-groomed short beard, wearing a modern charcoal crewneck, intelligent confident expression, clean minimalist white desk background with subtle tech setup, studio ring light, DSLR photograph 85mm f/2.0, sharp detailed skin texture, professional YouTube creator look',
    category: 'tech',
    seed: 4206,
  },
] as const

export const AVATAR_POSITIONS: { id: AvatarPosition; name: string }[] = [
  { id: 'bottom-left', name: 'Bottom Left' },
  { id: 'bottom-right', name: 'Bottom Right' },
  { id: 'bottom-center', name: 'Bottom Center' },
  { id: 'top-left', name: 'Top Left' },
  { id: 'top-right', name: 'Top Right' },
]

export const AVATAR_SHAPES: { id: AvatarShape; name: string }[] = [
  { id: 'circle', name: 'Circle' },
  { id: 'rounded', name: 'Rounded' },
  { id: 'rectangle', name: 'Rectangle' },
]

export const AVATAR_SIZES: { id: AvatarSize; name: string; scale: number }[] = [
  { id: 'small', name: 'Small', scale: 0.2 },
  { id: 'medium', name: 'Medium', scale: 0.28 },
  { id: 'large', name: 'Large', scale: 0.35 },
]

// ─── Output directory ─────────────────────────────────────────

const OUTPUT_DIR = IS_SERVERLESS
  ? path.join('/tmp', 'generated', 'avatar')
  : path.join(process.cwd(), 'public', 'generated', 'avatar')

async function ensureOutputDir() {
  if (!existsSync(OUTPUT_DIR)) {
    await mkdir(OUTPUT_DIR, { recursive: true })
  }
}

// ─── Provider Selection ───────────────────────────────────────

function selectProvider(): AvatarProvider {
  if (process.env.DID_API_KEY) return 'did'
  if (process.env.REPLICATE_API_TOKEN || process.env.REPLICATE_API_KEY) return 'sadtalker'
  return 'static'
}

// ─── Main Generation Function ─────────────────────────────────

/**
 * Generate a talking head avatar video from a face image + audio.
 * Auto-selects provider based on availability.
 */
export async function generateAvatar(options: AvatarGenerateOptions): Promise<AvatarResult> {
  const { faceImageUrl, audioUrl, durationMs } = options
  const provider = options.provider || selectProvider()

  await ensureOutputDir()

  switch (provider) {
    case 'did':
      return generateWithDID(faceImageUrl, audioUrl, durationMs)
    case 'sadtalker':
      return generateWithSadTalker(faceImageUrl, audioUrl, durationMs)
    case 'static':
    default:
      return generateStatic(faceImageUrl, durationMs)
  }
}

// ─── Provider: D-ID ──────────────────────────────────────────

async function generateWithDID(
  faceImageUrl: string,
  audioUrl: string,
  _durationMs?: number,
): Promise<AvatarResult> {
  const apiKey = process.env.DID_API_KEY
  if (!apiKey) throw new Error('DID_API_KEY not configured')

  // Create a talk
  const createRes = await fetch('https://api.d-id.com/talks', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      source_url: faceImageUrl,
      script: {
        type: 'audio',
        audio_url: audioUrl,
      },
      config: {
        result_format: 'mp4',
        stitch: true,
      },
    }),
  })

  if (!createRes.ok) {
    const err = await createRes.text()
    throw new Error(`D-ID API error: ${createRes.status} — ${err}`)
  }

  const talk = await createRes.json()
  const talkId = talk.id

  // Poll for completion (max 2 minutes)
  const maxWait = 120_000
  const start = Date.now()

  while (Date.now() - start < maxWait) {
    await new Promise(r => setTimeout(r, 3000))

    const statusRes = await fetch(`https://api.d-id.com/talks/${talkId}`, {
      headers: { 'Authorization': `Basic ${apiKey}` },
    })
    const status = await statusRes.json()

    if (status.status === 'done' && status.result_url) {
      // Download the video
      const videoRes = await fetch(status.result_url)
      const videoBuffer = Buffer.from(await videoRes.arrayBuffer())
      const filename = `avatar_${crypto.randomUUID().slice(0, 8)}.mp4`
      const outputPath = path.join(OUTPUT_DIR, filename)
      await writeFile(outputPath, videoBuffer)

      const servePath = IS_SERVERLESS
        ? `/api/generated/avatar/${filename}`
        : `/generated/avatar/${filename}`

      return {
        videoUrl: servePath,
        provider: 'did',
        model: 'd-id-talks',
        isVideo: true,
        duration: status.duration || (_durationMs ? _durationMs / 1000 : 10),
      }
    }

    if (status.status === 'error') {
      throw new Error(`D-ID generation failed: ${status.error?.description || 'Unknown error'}`)
    }
  }

  throw new Error('D-ID generation timed out after 2 minutes')
}

// ─── Provider: SadTalker via Replicate ───────────────────────

/**
 * POST to a Replicate model endpoint with automatic 429 retry.
 * Returns the parsed prediction JSON, or null if still throttled after retries.
 */
async function replicatePostWithRetry(
  endpoint: string,
  apiKey: string,
  body: Record<string, unknown>,
  maxRetries = 2,
): Promise<Record<string, unknown> | null> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (res.status === 429) {
      const data = await res.json().catch(() => ({}))
      const retryAfter = (data.retry_after ?? 15) as number
      console.warn(`[Avatar] Replicate 429 throttled — retry in ${retryAfter}s (attempt ${attempt + 1}/${maxRetries + 1})`)
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, retryAfter * 1000))
        continue
      }
      return null // exhausted retries
    }

    if (!res.ok) return null
    return res.json()
  }
  return null
}

async function generateWithSadTalker(
  faceImageUrl: string,
  audioUrl: string,
  durationMs?: number,
): Promise<AvatarResult> {
  const apiKey = process.env.REPLICATE_API_TOKEN || process.env.REPLICATE_API_KEY
  if (!apiKey) throw new Error('REPLICATE_API_TOKEN not configured')

  // Try LivePortrait first (better quality), fall back to SadTalker, then static
  const prediction = await replicatePostWithRetry(
    'https://api.replicate.com/v1/models/cuuupid/liveportrait/predictions',
    apiKey,
    {
      input: {
        image: faceImageUrl,
        video: audioUrl,
        live_portrait_dsize: 512,
        live_portrait_scale: 2.3,
        video_select_every_n_frames: 1,
      },
    },
  )

  if (!prediction) {
    console.warn('[Avatar] LivePortrait unavailable (throttled/error), trying SadTalker...')
    return generateWithSadTalkerFallback(apiKey, faceImageUrl, audioUrl, durationMs)
  }

  // Poll for completion (max 3 minutes)
  const maxWait = 180_000
  const start = Date.now()
  let result = prediction

  while (Date.now() - start < maxWait) {
    if (result.status === 'succeeded') break
    if (result.status === 'failed') {
      console.warn('[Avatar] LivePortrait failed, trying SadTalker...')
      return generateWithSadTalkerFallback(apiKey, faceImageUrl, audioUrl, durationMs)
    }
    await new Promise(r => setTimeout(r, 3000))
    const pollRes = await fetch(`https://api.replicate.com/v1/predictions/${result.id as string}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    })
    result = await pollRes.json()
  }

  if (result.status !== 'succeeded') {
    console.warn('[Avatar] LivePortrait timed out, trying SadTalker...')
    return generateWithSadTalkerFallback(apiKey, faceImageUrl, audioUrl, durationMs)
  }

  const outputUrl = Array.isArray(result.output) ? result.output[0] : result.output
  if (!outputUrl) return generateWithSadTalkerFallback(apiKey, faceImageUrl, audioUrl, durationMs)

  const videoRes = await fetch(outputUrl as string)
  const videoBuffer = Buffer.from(await videoRes.arrayBuffer())
  const filename = `avatar_${crypto.randomUUID().slice(0, 8)}.mp4`
  await writeFile(path.join(OUTPUT_DIR, filename), videoBuffer)

  return {
    videoUrl: IS_SERVERLESS ? `/api/generated/avatar/${filename}` : `/generated/avatar/${filename}`,
    provider: 'sadtalker',
    model: 'liveportrait',
    isVideo: true,
    duration: 0,
  }
}

/**
 * SadTalker via Replicate — falls back to static overlay on 429.
 */
async function generateWithSadTalkerFallback(
  apiKey: string,
  faceImageUrl: string,
  audioUrl: string,
  durationMs?: number,
): Promise<AvatarResult> {
  const prediction = await replicatePostWithRetry(
    'https://api.replicate.com/v1/models/cjwbw/sadtalker/predictions',
    apiKey,
    {
      input: {
        source_image: faceImageUrl,
        driven_audio: audioUrl,
        still: true,
        preprocess: 'crop',
        enhancer: 'gfpgan',
        pose_style: 0,
        expression_scale: 1.0,
      },
    },
  )

  if (!prediction) {
    // Rate-limited on all Replicate models — fall back to free static overlay
    console.warn('[Avatar] Replicate throttled on all models — using free static overlay')
    return generateStatic(faceImageUrl, durationMs)
  }

  const maxWait = 180_000
  const start = Date.now()
  let result = prediction

  while (Date.now() - start < maxWait) {
    if (result.status === 'succeeded') break
    if (result.status === 'failed') {
      console.warn('[Avatar] SadTalker failed — using free static overlay')
      return generateStatic(faceImageUrl, durationMs)
    }
    await new Promise(r => setTimeout(r, 3000))
    const pollRes = await fetch(`https://api.replicate.com/v1/predictions/${result.id as string}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    })
    result = await pollRes.json()
  }

  if (result.status !== 'succeeded') {
    console.warn('[Avatar] SadTalker timed out — using free static overlay')
    return generateStatic(faceImageUrl, durationMs)
  }

  const outputUrl = result.output
  if (!outputUrl) return generateStatic(faceImageUrl, durationMs)

  const videoRes = await fetch(outputUrl as string)
  const videoBuffer = Buffer.from(await videoRes.arrayBuffer())
  const filename = `avatar_${crypto.randomUUID().slice(0, 8)}.mp4`
  await writeFile(path.join(OUTPUT_DIR, filename), videoBuffer)

  return {
    videoUrl: IS_SERVERLESS ? `/api/generated/avatar/${filename}` : `/generated/avatar/${filename}`,
    provider: 'sadtalker',
    model: 'sadtalker-replicate',
    isVideo: true,
    duration: 0,
  }
}

// ─── Provider: Static (always free) ──────────────────────────

/**
 * Static fallback: returns the face image URL directly.
 * Remotion's AvatarOverlay component will animate it with
 * breathing/bobbing and fake lip-sync based on word boundaries.
 */
async function generateStatic(
  faceImageUrl: string,
  durationMs?: number,
): Promise<AvatarResult> {
  return {
    videoUrl: faceImageUrl,
    provider: 'static',
    model: 'static-overlay',
    isVideo: false,
    duration: durationMs ? durationMs / 1000 : 30,
  }
}

// ─── AI Face Generation (via Pollinations) ────────────────────

const AVATAR_OUTPUT_DIR = path.join(process.cwd(), 'public', 'generated', 'thumbnails')

/**
 * Generate an AI avatar face image using Pollinations (free).
 * Returns a URL to the generated face image.
 */
export function generateAvatarFaceUrl(prompt: string, seed?: number): string {
  const params = new URLSearchParams({
    width: '512',
    height: '512',
    model: 'flux',
    nologo: 'true',
    ...(seed !== undefined ? { seed: String(seed) } : {}),
  })

  const encodedPrompt = encodeURIComponent(prompt)
  return `https://image.pollinations.ai/prompt/${encodedPrompt}?${params}`
}

/**
 * Fetch and save an avatar face image locally so it's available for video rendering.
 * Falls back to a placeholder SVG data URI if the external fetch fails.
 */
export async function fetchAvatarFace(prompt: string, seed?: number): Promise<string> {
  const url = generateAvatarFaceUrl(prompt, seed)

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30_000)

    const res = await fetch(url, { signal: controller.signal })
    clearTimeout(timeout)

    if (!res.ok) throw new Error(`Pollinations returned ${res.status}`)

    const ct = res.headers.get('content-type') || ''
    if (!ct.startsWith('image/')) throw new Error(`Non-image response: ${ct}`)

    const buffer = Buffer.from(await res.arrayBuffer())
    if (buffer.length < 1000) throw new Error('Image too small — likely an error')

    if (!IS_SERVERLESS) {
      await mkdir(AVATAR_OUTPUT_DIR, { recursive: true })
      const filename = `avatar-${crypto.randomUUID().slice(0, 8)}.jpg`
      const filePath = path.join(AVATAR_OUTPUT_DIR, filename)
      await writeFile(filePath, buffer)
      return `/generated/thumbnails/${filename}`
    }

    // On serverless, return as data URI
    const base64 = buffer.toString('base64')
    const ext = ct.includes('png') ? 'png' : 'jpeg'
    return `data:image/${ext};base64,${base64}`
  } catch (err) {
    console.warn('[avatar] Failed to fetch from Pollinations, using placeholder:', err instanceof Error ? err.message : err)
    // Return a simple placeholder SVG as data URI
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><rect width="512" height="512" fill="%23374151"/><circle cx="256" cy="200" r="80" fill="%239CA3AF"/><ellipse cx="256" cy="420" rx="130" ry="100" fill="%239CA3AF"/></svg>`
    return `data:image/svg+xml,${svg}`
  }
}

/**
 * Get a stable preview thumbnail URL for an avatar preset.
 * Uses a fixed seed per preset so the preview is deterministic.
 */
export function getPresetPreviewUrl(presetId: string): string | null {
  const preset = AVATAR_PRESETS.find(p => p.id === presetId)
  if (!preset) return null
  return generateAvatarFaceUrl(preset.prompt, preset.seed)
}

/**
 * Get available avatar providers and their status
 */
export function getAvailableProviders(): { id: AvatarProvider; name: string; available: boolean; description: string }[] {
  return [
    {
      id: 'did',
      name: 'D-ID',
      available: !!process.env.DID_API_KEY,
      description: 'Professional AI talking head with realistic lip-sync (5 min free/month)',
    },
    {
      id: 'sadtalker',
      name: 'SadTalker',
      available: !!(process.env.REPLICATE_API_TOKEN || process.env.REPLICATE_API_KEY),
      description: 'Open-source talking head via Replicate (~$0.005/run)',
    },
    {
      id: 'static',
      name: 'Static Overlay',
      available: true,
      description: 'Animated face overlay with breathing effect (always free)',
    },
  ]
}
