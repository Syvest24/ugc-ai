/**
 * Image-to-Video Generation Abstraction
 *
 * Supports multiple providers for converting static images into animated video clips.
 * Providers:
 *  1. Replicate (Stable Video Diffusion) — most popular, needs API key
 *  2. Pollinations.ai — free tier, limited
 *  3. Local ffmpeg fallback — Ken Burns effect (zoom/pan) for instant results
 */

import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import crypto from 'crypto'

export interface ImageToVideoOptions {
  /** URL or local path of the source image */
  imageUrl: string
  /** Duration of the output video in seconds (default: 4) */
  duration?: number
  /** Motion type for the video */
  motion?: 'zoom-in' | 'zoom-out' | 'pan-left' | 'pan-right' | 'pan-up' | 'ken-burns'
  /** Frames per second (default: 24) */
  fps?: number
  /** Output width */
  width?: number
  /** Output height */
  height?: number
  /** Provider to use (auto-selects if not specified) */
  provider?: 'replicate' | 'pollinations' | 'local'
}

export interface ImageToVideoResult {
  videoUrl: string
  provider: string
  model: string
  duration: number
  width: number
  height: number
}

export const IMAGE_TO_VIDEO_MOTIONS = [
  { id: 'zoom-in', name: 'Zoom In', desc: 'Slowly zoom into the image center' },
  { id: 'zoom-out', name: 'Zoom Out', desc: 'Start zoomed in and pull back' },
  { id: 'pan-left', name: 'Pan Left', desc: 'Horizontal pan from right to left' },
  { id: 'pan-right', name: 'Pan Right', desc: 'Horizontal pan from left to right' },
  { id: 'pan-up', name: 'Pan Up', desc: 'Vertical pan from bottom to top' },
  { id: 'ken-burns', name: 'Ken Burns', desc: 'Classic zoom + pan combination' },
] as const

export type MotionType = (typeof IMAGE_TO_VIDEO_MOTIONS)[number]['id']

const OUTPUT_DIR = path.join(process.cwd(), 'public', 'generated-videos', 'from-image')

async function ensureOutputDir() {
  if (!existsSync(OUTPUT_DIR)) {
    await mkdir(OUTPUT_DIR, { recursive: true })
  }
}

/**
 * Generate a video from a static image.
 * Automatically selects the best available provider.
 */
export async function imageToVideo(options: ImageToVideoOptions): Promise<ImageToVideoResult> {
  const {
    imageUrl,
    duration = 4,
    motion = 'ken-burns',
    fps = 24,
    width = 1080,
    height = 1920,
    provider,
  } = options

  await ensureOutputDir()

  // Provider selection
  const selectedProvider = provider || selectProvider()

  switch (selectedProvider) {
    case 'replicate':
      return generateWithReplicate(imageUrl, duration, motion, fps, width, height)
    case 'pollinations':
      return generateWithPollinations(imageUrl, duration, motion, width, height)
    case 'local':
    default:
      return generateLocalKenBurns(imageUrl, duration, motion, fps, width, height)
  }
}

function selectProvider(): 'replicate' | 'pollinations' | 'local' {
  if (process.env.REPLICATE_API_KEY) return 'replicate'
  // Default to local Ken Burns for instant results without API keys
  return 'local'
}

// ---------- Provider: Replicate (Stable Video Diffusion) ----------

async function generateWithReplicate(
  imageUrl: string,
  duration: number,
  _motion: string,
  fps: number,
  width: number,
  height: number,
): Promise<ImageToVideoResult> {
  const apiKey = process.env.REPLICATE_API_KEY
  if (!apiKey) throw new Error('REPLICATE_API_KEY not configured')

  // Use Stable Video Diffusion model
  const response = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      version: 'dc76b3a17e5ae17060a208425df0a801a0d94855b49bcbc94a3358ca2b35d48d',
      input: {
        input_image: imageUrl,
        video_length: Math.min(duration * fps, 25), // SVD max 25 frames
        sizing_strategy: 'maintain_aspect_ratio',
        frames_per_second: fps,
        motion_bucket_id: 127, // Higher = more motion
        decoding_t: 14,
      },
    }),
  })

  if (!response.ok) {
    throw new Error(`Replicate API error: ${response.status}`)
  }

  const prediction = await response.json()

  // Poll for completion
  let result = prediction
  while (result.status !== 'succeeded' && result.status !== 'failed') {
    await new Promise(resolve => setTimeout(resolve, 2000))
    const poll = await fetch(`https://api.replicate.com/v1/predictions/${result.id}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    })
    result = await poll.json()
  }

  if (result.status === 'failed') {
    throw new Error(`Video generation failed: ${result.error}`)
  }

  // Download and save the video
  const videoResponse = await fetch(result.output)
  const videoBuffer = Buffer.from(await videoResponse.arrayBuffer())
  const filename = `vid_${crypto.randomUUID().slice(0, 8)}.mp4`
  const outputPath = path.join(OUTPUT_DIR, filename)
  await writeFile(outputPath, videoBuffer)

  return {
    videoUrl: `/generated-videos/from-image/${filename}`,
    provider: 'replicate',
    model: 'stable-video-diffusion',
    duration,
    width,
    height,
  }
}

// ---------- Provider: Pollinations.ai ----------

async function generateWithPollinations(
  imageUrl: string,
  duration: number,
  _motion: string,
  width: number,
  height: number,
): Promise<ImageToVideoResult> {
  // Pollinations video endpoint (experimental)
  const params = new URLSearchParams({
    image: imageUrl,
    duration: String(duration),
    width: String(width),
    height: String(height),
  })

  const response = await fetch(`https://video.pollinations.ai/generate?${params}`)
  if (!response.ok) {
    throw new Error(`Pollinations video API error: ${response.status}`)
  }

  const videoBuffer = Buffer.from(await response.arrayBuffer())
  const filename = `vid_${crypto.randomUUID().slice(0, 8)}.mp4`
  const outputPath = path.join(OUTPUT_DIR, filename)
  await writeFile(outputPath, videoBuffer)

  return {
    videoUrl: `/generated-videos/from-image/${filename}`,
    provider: 'pollinations',
    model: 'pollinations-video',
    duration,
    width,
    height,
  }
}

// ---------- Provider: Local Ken Burns (ffmpeg-based) ----------

async function generateLocalKenBurns(
  imageUrl: string,
  duration: number,
  motion: string,
  fps: number,
  width: number,
  height: number,
): Promise<ImageToVideoResult> {
  // Download the source image first
  let imageBuffer: Buffer
  if (imageUrl.startsWith('http')) {
    const imgResponse = await fetch(imageUrl)
    imageBuffer = Buffer.from(await imgResponse.arrayBuffer())
  } else {
    const { readFile } = await import('fs/promises')
    const localPath = imageUrl.startsWith('/') 
      ? path.join(process.cwd(), 'public', imageUrl)
      : imageUrl
    imageBuffer = await readFile(localPath)
  }

  const imageFilename = `src_${crypto.randomUUID().slice(0, 8)}.png`
  const imagePath = path.join(OUTPUT_DIR, imageFilename)
  await writeFile(imagePath, imageBuffer)

  const filename = `vid_${crypto.randomUUID().slice(0, 8)}.mp4`
  const outputPath = path.join(OUTPUT_DIR, filename)

  // Build ffmpeg filter for the motion type
  const totalFrames = duration * fps
  const filter = buildMotionFilter(motion, width, height, totalFrames)

  // Try to use ffmpeg for the Ken Burns effect
  const { execSync } = await import('child_process')
  try {
    execSync(
      `ffmpeg -loop 1 -i "${imagePath}" -vf "${filter}" -c:v libx264 -t ${duration} -pix_fmt yuv420p -r ${fps} -y "${outputPath}"`,
      { timeout: 30000, stdio: 'pipe' }
    )
  } catch {
    // Fallback: if ffmpeg is not available, create a simple static video
    // by writing frames using canvas (would need sharp or canvas package)
    throw new Error(
      'ffmpeg is required for local video generation. ' +
      'Install it with: brew install ffmpeg (macOS) or apt-get install ffmpeg (Linux). ' +
      'Alternatively, set REPLICATE_API_KEY for cloud-based generation.'
    )
  }

  // Clean up source image
  const { unlink } = await import('fs/promises')
  await unlink(imagePath).catch(() => {})

  return {
    videoUrl: `/generated-videos/from-image/${filename}`,
    provider: 'local',
    model: `ffmpeg-${motion}`,
    duration,
    width,
    height,
  }
}

function buildMotionFilter(motion: string, w: number, h: number, frames: number): string {
  // All filters scale image larger than output, then crop with animated offset
  const scale = 1.2
  const sw = Math.round(w * scale)
  const sh = Math.round(h * scale)

  switch (motion) {
    case 'zoom-in':
      return `scale=${sw}:${sh},zoompan=z='min(zoom+0.001,1.2)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=${w}x${h}`
    case 'zoom-out':
      return `scale=${sw}:${sh},zoompan=z='if(lte(zoom,1.0),1.2,max(1.001,zoom-0.001))':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=${w}x${h}`
    case 'pan-left':
      return `scale=${sw}:${sh},crop=${w}:${h}:'(${sw}-${w})*t/${frames*1.0/24}':0`
    case 'pan-right':
      return `scale=${sw}:${sh},crop=${w}:${h}:'(${sw}-${w})*(1-t/${frames*1.0/24})':0`
    case 'pan-up':
      return `scale=${sw}:${sh},crop=${w}:${h}:0:'(${sh}-${h})*t/${frames*1.0/24}'`
    case 'ken-burns':
    default:
      return `scale=${sw}:${sh},zoompan=z='min(zoom+0.0008,1.15)':x='iw/2-(iw/zoom/2)+sin(on/${frames}*3.14)*10':y='ih/2-(ih/zoom/2)':d=${frames}:s=${w}x${h}`
  }
}
