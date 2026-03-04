/**
 * Video-to-Video Style Transfer
 *
 * Transform existing videos into new styles using AI.
 *
 * Providers:
 *  1. Replicate — style transfer models
 *  2. Local ffmpeg — basic filter effects (always available)
 */

import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import crypto from 'crypto'
import { execSync } from 'child_process'

const IS_SERVERLESS = !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME || !!process.env.RAILWAY_ENVIRONMENT

const OUTPUT_DIR = IS_SERVERLESS
  ? path.join('/tmp', 'generated', 'video-to-video')
  : path.join(process.cwd(), 'public', 'generated', 'video-to-video')

export interface VideoToVideoOptions {
  /** URL or local path of the source video */
  videoUrl: string
  /** Style to apply */
  style: string
  /** Text prompt for style guidance */
  prompt?: string
  /** Strength of style transfer (0.0 - 1.0) */
  strength?: number
  /** Provider */
  provider?: 'replicate' | 'local'
}

export interface VideoToVideoResult {
  videoUrl: string
  provider: string
  model: string
  style: string
}

export const VIDEO_STYLES = [
  { id: 'anime', name: 'Anime', desc: 'Japanese anime art style', prompt: 'anime style, vibrant colors, cel shading' },
  { id: 'oil-painting', name: 'Oil Painting', desc: 'Classic oil painting look', prompt: 'oil painting, brushstrokes, canvas texture, artistic' },
  { id: 'watercolor', name: 'Watercolor', desc: 'Soft watercolor effect', prompt: 'watercolor painting, soft edges, fluid colors' },
  { id: 'cyberpunk', name: 'Cyberpunk', desc: 'Neon-lit cyberpunk aesthetic', prompt: 'cyberpunk style, neon lights, futuristic, dark atmosphere' },
  { id: 'vintage', name: 'Vintage Film', desc: 'Retro film grain look', prompt: 'vintage film, retro colors, grain, VHS' },
  { id: 'comic', name: 'Comic Book', desc: 'Bold comic book style', prompt: 'comic book style, bold outlines, halftone dots, pop art' },
  { id: 'sketch', name: 'Pencil Sketch', desc: 'Hand-drawn pencil sketch', prompt: 'pencil sketch, hand drawn, graphite, detailed lines' },
  { id: 'noir', name: 'Film Noir', desc: 'Black and white dramatic', prompt: 'film noir, black and white, high contrast, dramatic shadows' },
  { id: 'pixel', name: 'Pixel Art', desc: '8-bit retro pixel style', prompt: 'pixel art, 8-bit, retro game, pixelated' },
  { id: '3d-cartoon', name: '3D Cartoon', desc: 'Pixar-like 3D cartoon', prompt: '3D cartoon, Pixar style, smooth rendering, vibrant' },
] as const

/**
 * Apply style transfer to a video
 */
export async function transformVideo(options: VideoToVideoOptions): Promise<VideoToVideoResult> {
  const provider = options.provider || selectProvider()

  if (!existsSync(OUTPUT_DIR)) {
    await mkdir(OUTPUT_DIR, { recursive: true })
  }

  switch (provider) {
    case 'replicate':
      return transformWithReplicate(options)
    case 'local':
      return transformWithFfmpeg(options)
    default:
      return transformWithFfmpeg(options)
  }
}

function selectProvider(): VideoToVideoOptions['provider'] {
  if (process.env.REPLICATE_API_TOKEN || process.env.REPLICATE_API_KEY) {
    return 'replicate'
  }
  return 'local'
}

/**
 * Style transfer via Replicate
 */
async function transformWithReplicate(options: VideoToVideoOptions): Promise<VideoToVideoResult> {
  const apiKey = process.env.REPLICATE_API_TOKEN || process.env.REPLICATE_API_KEY || ''
  if (!apiKey) throw new Error('REPLICATE_API_TOKEN not configured')

  const styleInfo = VIDEO_STYLES.find(s => s.id === options.style)
  const stylePrompt = options.prompt || styleInfo?.prompt || options.style

  // Use video-to-video model
  const createRes = await fetch('https://api.replicate.com/v1/models/wan-ai/wan2.1-i2v-480p/predictions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input: {
        image: options.videoUrl,
        prompt: stylePrompt,
        negative_prompt: 'blurry, low quality, distorted',
        num_frames: 81,
        guidance_scale: 5.0,
        num_inference_steps: 30,
      },
    }),
  })

  if (!createRes.ok) {
    const err = await createRes.text()
    console.warn(`[video-to-video] Replicate error: ${err}`)
    return transformWithFfmpeg(options)
  }

  const prediction = await createRes.json()
  const maxWait = 300_000
  const start = Date.now()
  let result = prediction

  while (Date.now() - start < maxWait) {
    if (result.status === 'succeeded') break
    if (result.status === 'failed' || result.status === 'canceled') {
      throw new Error(`Style transfer failed: ${result.error || 'Unknown'}`)
    }
    await new Promise(r => setTimeout(r, 5000))
    const pollRes = await fetch(`https://api.replicate.com/v1/predictions/${result.id}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    })
    result = await pollRes.json()
  }

  if (result.status !== 'succeeded') {
    return transformWithFfmpeg(options)
  }

  const outputUrl = typeof result.output === 'string' ? result.output : result.output?.[0]
  if (!outputUrl) return transformWithFfmpeg(options)

  const videoRes = await fetch(outputUrl)
  const videoBuffer = Buffer.from(await videoRes.arrayBuffer())
  const filename = `v2v_${crypto.randomUUID().slice(0, 8)}.mp4`
  const outputPath = path.join(OUTPUT_DIR, filename)
  await writeFile(outputPath, videoBuffer)

  const servePath = IS_SERVERLESS
    ? `/api/generated/video-to-video/${filename}`
    : `/generated/video-to-video/${filename}`

  return {
    videoUrl: servePath,
    provider: 'replicate',
    model: 'wan2.1-v2v',
    style: options.style,
  }
}

/**
 * Local ffmpeg style filters as fallback
 */
async function transformWithFfmpeg(options: VideoToVideoOptions): Promise<VideoToVideoResult> {
  const filename = `v2v_${crypto.randomUUID().slice(0, 8)}.mp4`
  const outputPath = path.join(OUTPUT_DIR, filename)

  // Download source video first
  const srcFilename = `src_${crypto.randomUUID().slice(0, 8)}.mp4`
  const srcPath = path.join(OUTPUT_DIR, srcFilename)

  if (options.videoUrl.startsWith('http')) {
    const res = await fetch(options.videoUrl)
    const buf = Buffer.from(await res.arrayBuffer())
    await writeFile(srcPath, buf)
  }

  const inputPath = options.videoUrl.startsWith('http') ? srcPath : options.videoUrl

  // Map style to ffmpeg filter
  const filterMap: Record<string, string> = {
    'anime': 'edgedetect=low=0.1:high=0.4,colorbalance=bs=0.3:gs=-0.1:rs=-0.1',
    'oil-painting': 'gblur=sigma=2,unsharp=5:5:1.5,eq=contrast=1.3:brightness=0.05',
    'watercolor': 'gblur=sigma=3,eq=saturation=1.5:brightness=0.1',
    'cyberpunk': 'colorbalance=rs=-0.3:gs=-0.1:bs=0.4,eq=contrast=1.4:brightness=-0.1',
    'vintage': 'colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131:0,eq=contrast=1.1:brightness=0.05',
    'comic': 'edgedetect=low=0.08:high=0.3,negate,eq=contrast=2.0',
    'sketch': 'format=gray,edgedetect=low=0.1:high=0.4,negate',
    'noir': 'format=gray,eq=contrast=1.6:brightness=-0.1',
    'pixel': 'scale=iw/8:ih/8:flags=neighbor,scale=iw*8:ih*8:flags=neighbor',
    '3d-cartoon': 'gblur=sigma=1.5,eq=saturation=1.8:contrast=1.2:brightness=0.05',
  }

  const filter = filterMap[options.style] || filterMap['vintage']

  try {
    execSync(`ffmpeg -i "${inputPath}" -vf "${filter}" -c:a copy -y "${outputPath}"`, {
      timeout: 60_000,
      stdio: 'pipe',
    })
  } catch (err) {
    console.error('[video-to-video] ffmpeg error:', err)
    // Simplest fallback: just copy
    execSync(`ffmpeg -i "${inputPath}" -c copy -y "${outputPath}"`, {
      timeout: 30_000,
      stdio: 'pipe',
    })
  }

  const servePath = IS_SERVERLESS
    ? `/api/generated/video-to-video/${filename}`
    : `/generated/video-to-video/${filename}`

  return {
    videoUrl: servePath,
    provider: 'local',
    model: 'ffmpeg-filter',
    style: options.style,
  }
}

/**
 * Get available providers and styles
 */
export function getVideoToVideoProviders() {
  return [
    {
      id: 'replicate',
      name: 'Replicate AI',
      available: !!(process.env.REPLICATE_API_TOKEN || process.env.REPLICATE_API_KEY),
      description: 'AI-powered style transfer (best quality)',
    },
    {
      id: 'local',
      name: 'Local (ffmpeg)',
      available: true,
      description: 'Quick filter effects using ffmpeg',
    },
  ]
}
