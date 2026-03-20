/**
 * AI Avatar / Talking Head Generation
 *
 * Generates talking head videos from a face image + audio.
 *
 * Providers (priority order):
 *  1. SadTalker via Replicate (~$0.005/run) — open source, good quality
 *  2. Wav2Lip via Replicate (~$0.005/run) — best lip-sync accuracy
 *  3. D-ID (optional, free 5 min/month) — professional realistic lip-sync
 *  4. Static overlay (always free) — face image with CSS lip-sync via word boundaries
 */

import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import crypto from 'crypto'
import { isR2Configured, uploadToR2 } from './r2'

const IS_SERVERLESS = !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME || !!process.env.RAILWAY_ENVIRONMENT

// ─── Types ────────────────────────────────────────────────────

export type AvatarProvider = 'sadtalker' | 'wav2lip' | 'did' | 'static'

export interface AvatarGenerateOptions {
  faceImageUrl: string
  audioUrl: string
  provider?: AvatarProvider
  durationMs?: number
}

export interface AvatarResult {
  videoUrl: string
  provider: AvatarProvider
  model: string
  isVideo: boolean
  duration: number
}

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
  if (process.env.REPLICATE_API_TOKEN || process.env.REPLICATE_API_KEY) return 'sadtalker'
  if (process.env.DID_API_KEY) return 'did'
  return 'static'
}

// ─── Main Generation Function ─────────────────────────────────

export async function generateAvatar(options: AvatarGenerateOptions): Promise<AvatarResult> {
  const { faceImageUrl, audioUrl, durationMs } = options
  const provider = options.provider || selectProvider()

  await ensureOutputDir()

  switch (provider) {
    case 'sadtalker':
      return generateWithSadTalker(faceImageUrl, audioUrl, durationMs)
    case 'wav2lip':
      return generateWithWav2Lip(faceImageUrl, audioUrl, durationMs)
    case 'did':
      return generateWithDID(faceImageUrl, audioUrl, durationMs)
    case 'static':
    default:
      return { videoUrl: faceImageUrl, provider: 'static', model: 'static-overlay', isVideo: false, duration: durationMs ? durationMs / 1000 : 30 }
  }
}

// ─── Helper: save avatar video to disk/R2 ─────────────────────

async function saveAvatarVideo(videoBuffer: Buffer): Promise<string> {
  const filename = `avatar_${crypto.randomUUID().slice(0, 8)}.mp4`

  if (isR2Configured) {
    try {
      const r2Url = await uploadToR2(`avatars/${filename}`, videoBuffer)
      return r2Url
    } catch (err) {
      console.warn('[avatar] R2 upload failed, saving locally:', err)
    }
  }

  const outputPath = path.join(OUTPUT_DIR, filename)
  await writeFile(outputPath, videoBuffer)

  return IS_SERVERLESS
    ? `/api/generated/avatar/${filename}`
    : `/generated/avatar/${filename}`
}

// ─── Provider: D-ID ──────────────────────────────────────────

async function generateWithDID(
  faceImageUrl: string,
  audioUrl: string,
  _durationMs?: number,
): Promise<AvatarResult> {
  const apiKey = process.env.DID_API_KEY
  if (!apiKey) throw new Error('DID_API_KEY not configured')

  if (!faceImageUrl.startsWith('http://') && !faceImageUrl.startsWith('https://')) {
    throw new Error('D-ID requires a publicly accessible image URL (https://...). Local paths and data URIs are not supported.')
  }
  if (faceImageUrl.endsWith('.svg') || faceImageUrl.includes('data:image/svg')) {
    throw new Error('D-ID does not accept SVG images. Please use a JPG or PNG face photo.')
  }
  if (!audioUrl.startsWith('http://') && !audioUrl.startsWith('https://')) {
    throw new Error('D-ID requires a publicly accessible audio URL. Ensure TTS audio is uploaded to R2 or another CDN.')
  }

  console.log(`[Avatar/D-ID] Creating talk — face: ${faceImageUrl.slice(0, 80)}…`)

  const createRes = await fetch('https://api.d-id.com/talks', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      source_url: faceImageUrl,
      script: { type: 'audio', audio_url: audioUrl },
      config: { result_format: 'mp4', stitch: true },
    }),
  })

  if (!createRes.ok) {
    const err = await createRes.text()
    console.error(`[Avatar/D-ID] Create failed: ${createRes.status}`, err)
    throw new Error(`D-ID API error ${createRes.status}: ${err}`)
  }

  const talk = await createRes.json()
  const talkId = talk.id
  console.log(`[Avatar/D-ID] Talk created: ${talkId}`)

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
      console.log(`[Avatar/D-ID] Completed — downloading video`)
      const videoRes = await fetch(status.result_url)
      const videoBuffer = Buffer.from(await videoRes.arrayBuffer())
      const videoUrl = await saveAvatarVideo(videoBuffer)

      return {
        videoUrl,
        provider: 'did',
        model: 'd-id-talks',
        isVideo: true,
        duration: status.duration || (_durationMs ? _durationMs / 1000 : 10),
      }
    }

    if (status.status === 'error') {
      const errMsg = status.error?.description || status.error?.kind || 'Unknown error'
      console.error(`[Avatar/D-ID] Failed:`, errMsg)
      throw new Error(`D-ID generation failed: ${errMsg}`)
    }
  }

  throw new Error('D-ID generation timed out after 2 minutes')
}

// ─── Provider: SadTalker via Replicate ───────────────────────

async function generateWithSadTalker(
  faceImageUrl: string,
  audioUrl: string,
  durationMs?: number,
): Promise<AvatarResult> {
  const apiKey = process.env.REPLICATE_API_TOKEN || process.env.REPLICATE_API_KEY
  if (!apiKey) throw new Error('REPLICATE_API_TOKEN not configured')

  console.log(`[Avatar/SadTalker] Starting prediction`)

  const res = await fetch('https://api.replicate.com/v1/models/cjwbw/sadtalker/predictions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input: {
        source_image: faceImageUrl,
        driven_audio: audioUrl,
        still: true,
        preprocess: 'crop',
        enhancer: 'gfpgan',
        pose_style: 0,
        expression_scale: 1.0,
      },
    }),
  })

  if (res.status === 429 || !res.ok) {
    console.warn(`[Avatar/SadTalker] Replicate error ${res.status} — falling back to static`)
    return { videoUrl: faceImageUrl, provider: 'static', model: 'static-overlay', isVideo: false, duration: durationMs ? durationMs / 1000 : 30 }
  }

  let result = await res.json() as Record<string, unknown>

  // Poll for completion (max 3 minutes)
  const maxWait = 180_000
  const start = Date.now()

  while (Date.now() - start < maxWait) {
    if (result.status === 'succeeded') break
    if (result.status === 'failed') {
      console.warn('[Avatar/SadTalker] Failed:', result.error)
      return { videoUrl: faceImageUrl, provider: 'static', model: 'static-overlay', isVideo: false, duration: durationMs ? durationMs / 1000 : 30 }
    }
    await new Promise(r => setTimeout(r, 3000))
    const pollRes = await fetch(`https://api.replicate.com/v1/predictions/${result.id as string}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    })
    result = await pollRes.json()
  }

  if (result.status !== 'succeeded' || !result.output) {
    console.warn('[Avatar/SadTalker] Timed out or no output — using static')
    return { videoUrl: faceImageUrl, provider: 'static', model: 'static-overlay', isVideo: false, duration: durationMs ? durationMs / 1000 : 30 }
  }

  const outputUrl = result.output as string
  console.log(`[Avatar/SadTalker] Succeeded — downloading`)
  const videoRes = await fetch(outputUrl)
  const videoBuffer = Buffer.from(await videoRes.arrayBuffer())
  const videoUrl = await saveAvatarVideo(videoBuffer)

  return {
    videoUrl,
    provider: 'sadtalker',
    model: 'sadtalker-replicate',
    isVideo: true,
    duration: durationMs ? durationMs / 1000 : 0,
  }
}

// ─── Provider: Wav2Lip via Replicate ─────────────────────────

async function generateWithWav2Lip(
  faceImageUrl: string,
  audioUrl: string,
  durationMs?: number,
): Promise<AvatarResult> {
  const apiKey = process.env.REPLICATE_API_TOKEN || process.env.REPLICATE_API_KEY
  if (!apiKey) throw new Error('REPLICATE_API_TOKEN not configured')

  console.log(`[Avatar/Wav2Lip] Starting prediction`)

  const res = await fetch('https://api.replicate.com/v1/models/devxpy/cog-wav2lip/predictions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input: {
        face: faceImageUrl,
        audio: audioUrl,
        pads: '0 10 0 0',
        smooth: true,
        fps: 25,
      },
    }),
  })

  if (res.status === 429 || !res.ok) {
    console.warn(`[Avatar/Wav2Lip] Replicate error ${res.status} — falling back to static`)
    return { videoUrl: faceImageUrl, provider: 'static', model: 'static-overlay', isVideo: false, duration: durationMs ? durationMs / 1000 : 30 }
  }

  let result = await res.json() as Record<string, unknown>

  // Poll for completion (max 3 minutes)
  const maxWait = 180_000
  const start = Date.now()

  while (Date.now() - start < maxWait) {
    if (result.status === 'succeeded') break
    if (result.status === 'failed') {
      console.warn('[Avatar/Wav2Lip] Failed:', result.error)
      return { videoUrl: faceImageUrl, provider: 'static', model: 'static-overlay', isVideo: false, duration: durationMs ? durationMs / 1000 : 30 }
    }
    await new Promise(r => setTimeout(r, 3000))
    const pollRes = await fetch(`https://api.replicate.com/v1/predictions/${result.id as string}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    })
    result = await pollRes.json()
  }

  if (result.status !== 'succeeded' || !result.output) {
    console.warn('[Avatar/Wav2Lip] Timed out or no output — using static')
    return { videoUrl: faceImageUrl, provider: 'static', model: 'static-overlay', isVideo: false, duration: durationMs ? durationMs / 1000 : 30 }
  }

  const outputUrl = result.output as string
  console.log(`[Avatar/Wav2Lip] Succeeded — downloading`)
  const videoRes = await fetch(outputUrl)
  const videoBuffer = Buffer.from(await videoRes.arrayBuffer())
  const videoUrl = await saveAvatarVideo(videoBuffer)

  return {
    videoUrl,
    provider: 'wav2lip',
    model: 'wav2lip-replicate',
    isVideo: true,
    duration: durationMs ? durationMs / 1000 : 0,
  }
}

// ─── Provider Info ────────────────────────────────────────────

export function getAvailableProviders() {
  const hasReplicate = !!(process.env.REPLICATE_API_TOKEN || process.env.REPLICATE_API_KEY)
  return [
    { id: 'sadtalker' as const, name: 'SadTalker', available: hasReplicate, description: 'Open-source talking head with full head motion (Replicate, ~$0.005/run)' },
    { id: 'wav2lip' as const, name: 'Wav2Lip', available: hasReplicate, description: 'Accurate lip-sync on any face (Replicate, ~$0.005/run)' },
    { id: 'did' as const, name: 'D-ID', available: !!process.env.DID_API_KEY, description: 'Professional AI talking head with realistic lip-sync (5 min free/month)' },
    { id: 'static' as const, name: 'Static Overlay', available: true, description: 'Animated face overlay with breathing effect and visual lip-sync (always free)' },
  ]
}
