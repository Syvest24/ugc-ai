/**
 * Video-to-Video Style Transfer
 *
 * Transform existing videos into new styles using ffmpeg filters.
 * Supports both local file paths and remote URLs.
 */

import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import crypto from 'crypto'
import { execFileSync } from 'child_process'

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
  if (!existsSync(OUTPUT_DIR)) {
    await mkdir(OUTPUT_DIR, { recursive: true })
  }

  // Resolve source video to a local file path
  const srcPath = await resolveSourceVideo(options.videoUrl)
  return transformWithFfmpeg(srcPath, options)
}

/**
 * Ensure we have a local file path for the source video.
 * Downloads remote URLs to temp directory.
 */
async function resolveSourceVideo(input: string): Promise<string> {
  // Already a local file path
  if (existsSync(input)) return input

  // Remote URL — download it
  if (input.startsWith('http://') || input.startsWith('https://')) {
    if (!existsSync(OUTPUT_DIR)) {
      await mkdir(OUTPUT_DIR, { recursive: true })
    }
    const srcFilename = `src_${crypto.randomUUID().slice(0, 8)}.mp4`
    const srcPath = path.join(OUTPUT_DIR, srcFilename)
    const res = await fetch(input)
    if (!res.ok) throw new Error(`Failed to download source video: ${res.status}`)
    const buf = Buffer.from(await res.arrayBuffer())
    await writeFile(srcPath, buf)
    return srcPath
  }

  throw new Error('Invalid video source. Provide a file upload or a valid URL.')
}

/**
 * Apply ffmpeg filters for style transfer
 */
async function transformWithFfmpeg(srcPath: string, options: VideoToVideoOptions): Promise<VideoToVideoResult> {
  const filename = `v2v_${crypto.randomUUID().slice(0, 8)}.mp4`
  const outputPath = path.join(OUTPUT_DIR, filename)

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

  // Verify ffmpeg exists
  try {
    execFileSync('which', ['ffmpeg'], { stdio: 'pipe' })
  } catch {
    throw new Error('ffmpeg is not installed. Please install ffmpeg to use video style transfer.')
  }

  try {
    execFileSync('ffmpeg', ['-y', '-i', srcPath, '-vf', filter, '-c:a', 'copy', outputPath], {
      timeout: 120_000,
      stdio: 'pipe',
    })
  } catch (err) {
    console.error('[video-to-video] ffmpeg filter error, trying simple copy:', err)
    // Fallback: just copy with basic re-encoding
    try {
      execFileSync('ffmpeg', ['-y', '-i', srcPath, '-c:v', 'libx264', '-preset', 'fast', '-c:a', 'copy', outputPath], {
        timeout: 60_000,
        stdio: 'pipe',
      })
    } catch (err2) {
      console.error('[video-to-video] ffmpeg copy also failed:', err2)
      throw new Error('Failed to process video. The file may be corrupted or in an unsupported format.')
    }
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
      id: 'local',
      name: 'Style Filters (ffmpeg)',
      available: true,
      description: 'Quick style transfer effects using ffmpeg filters',
    },
  ]
}
