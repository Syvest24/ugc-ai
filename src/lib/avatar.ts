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
    prompt: 'professional young woman headshot portrait, neutral background, looking at camera, friendly smile, studio lighting, UGC creator style',
    category: 'professional',
  },
  {
    id: 'ai-woman-2',
    name: 'Casual Woman',
    prompt: 'casual young woman selfie portrait, natural lighting, soft smile, content creator aesthetic, clean background',
    category: 'casual',
  },
  {
    id: 'ai-man-1',
    name: 'Professional Man',
    prompt: 'professional young man headshot portrait, neutral background, looking at camera, confident smile, studio lighting, UGC creator style',
    category: 'professional',
  },
  {
    id: 'ai-man-2',
    name: 'Casual Man',
    prompt: 'casual young man selfie portrait, natural lighting, friendly expression, content creator aesthetic, clean background',
    category: 'casual',
  },
  {
    id: 'ai-diverse-1',
    name: 'Lifestyle Creator',
    prompt: 'diverse lifestyle content creator portrait, warm lighting, approachable expression, bokeh background, social media influencer style',
    category: 'lifestyle',
  },
  {
    id: 'ai-diverse-2',
    name: 'Tech Reviewer',
    prompt: 'tech reviewer portrait, modern setting, confident expression, clean minimalist background, professional content creator',
    category: 'tech',
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
      return generateWithSadTalker(faceImageUrl, audioUrl)
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

async function generateWithSadTalker(
  faceImageUrl: string,
  audioUrl: string,
): Promise<AvatarResult> {
  const apiKey = process.env.REPLICATE_API_TOKEN || process.env.REPLICATE_API_KEY
  if (!apiKey) throw new Error('REPLICATE_API_TOKEN not configured')

  // SadTalker model on Replicate
  const createRes = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      // SadTalker model version (cjwbw/sadtalker)
      version: 'a519cc0cfebaaeade068b23899165a11ec76aaa1a4f26b256a8e19e53e93342d',
      input: {
        source_image: faceImageUrl,
        driven_audio: audioUrl,
        still: true, // Less head movement for cleaner results
        preprocess: 'crop', // Auto-crop face
        enhancer: 'gfpgan', // Face enhancement
        pose_style: 0,
        expression_scale: 1.0,
      },
    }),
  })

  if (!createRes.ok) {
    const err = await createRes.text()
    throw new Error(`Replicate API error: ${createRes.status} — ${err}`)
  }

  const prediction = await createRes.json()

  // Poll for completion (max 3 minutes)
  const maxWait = 180_000
  const start = Date.now()
  let result = prediction

  while (Date.now() - start < maxWait) {
    if (result.status === 'succeeded') break
    if (result.status === 'failed') {
      throw new Error(`SadTalker failed: ${result.error || 'Unknown error'}`)
    }

    await new Promise(r => setTimeout(r, 3000))
    const pollRes = await fetch(`https://api.replicate.com/v1/predictions/${result.id}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    })
    result = await pollRes.json()
  }

  if (result.status !== 'succeeded') {
    throw new Error('SadTalker generation timed out')
  }

  const outputUrl = result.output
  if (!outputUrl) throw new Error('SadTalker returned no output')

  // Download the video
  const videoRes = await fetch(outputUrl)
  const videoBuffer = Buffer.from(await videoRes.arrayBuffer())
  const filename = `avatar_${crypto.randomUUID().slice(0, 8)}.mp4`
  const outputPath = path.join(OUTPUT_DIR, filename)
  await writeFile(outputPath, videoBuffer)

  const servePath = IS_SERVERLESS
    ? `/api/generated/avatar/${filename}`
    : `/generated/avatar/${filename}`

  return {
    videoUrl: servePath,
    provider: 'sadtalker',
    model: 'sadtalker-replicate',
    isVideo: true,
    duration: 0, // determined by audio length
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
    enhance: 'true',
    ...(seed !== undefined ? { seed: String(seed) } : {}),
  })

  const encodedPrompt = encodeURIComponent(prompt)
  return `https://image.pollinations.ai/prompt/${encodedPrompt}?${params}`
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
