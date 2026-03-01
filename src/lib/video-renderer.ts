import path from 'path'
import fs from 'fs'

const IS_SERVERLESS = !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME || !!process.env.RAILWAY_ENVIRONMENT

// Platform aspect ratios and dimensions
export const PLATFORM_DIMENSIONS: Record<string, { width: number; height: number }> = {
  tiktok: { width: 1080, height: 1920 },
  instagram: { width: 1080, height: 1920 },
  youtube_shorts: { width: 1080, height: 1920 },
  twitter_x: { width: 1080, height: 1080 },
  linkedin: { width: 1080, height: 1080 },
}

// Custom aspect ratio overrides
export const ASPECT_RATIO_DIMENSIONS: Record<string, { width: number; height: number }> = {
  '9:16': { width: 1080, height: 1920 },
  '1:1': { width: 1080, height: 1080 },
  '16:9': { width: 1920, height: 1080 },
  '4:5': { width: 1080, height: 1350 },
}

// Quality presets
export const QUALITY_PRESETS: Record<string, { crf: number; scale: number; label: string }> = {
  draft: { crf: 35, scale: 0.5, label: 'Draft (fast, smaller file)' },
  standard: { crf: 23, scale: 1, label: 'Standard (balanced)' },
  high: { crf: 18, scale: 1, label: 'High (best quality, larger file)' },
}

export interface VideoRenderInput {
  template: 'CaptionStyle' | 'TextOnScreen' | 'SplitScreen' | 'Countdown' | 'Testimonial' | 'BeforeAfter' | 'ProductShowcase' | 'Cinematic' | 'Neon' | 'Minimalist' | 'Magazine'
  hook: string
  scriptLines: string[]
  cta: string
  audioSrc?: string
  backgroundImage?: string
  sceneImages?: string[] // per-scene AI-generated background images
  wordBoundaries?: { text: string; startMs: number; endMs: number }[]
  platform: string
  durationMs?: number
  captionStyle?: 'karaoke' | 'word-by-word' | 'fade'
  hookStyle?: 'pop' | 'typewriter' | 'slide'
  colorAccent?: string
  // Avatar / Talking Head
  avatarFaceUrl?: string
  avatarVideoUrl?: string
  avatarIsVideo?: boolean
  avatarPosition?: 'bottom-left' | 'bottom-right' | 'bottom-center' | 'top-left' | 'top-right'
  avatarShape?: 'circle' | 'rounded' | 'rectangle'
  avatarSize?: 'small' | 'medium' | 'large'
  // Export options
  aspectRatio?: '9:16' | '1:1' | '16:9' | '4:5'
  quality?: 'draft' | 'standard' | 'high'
  format?: 'mp4' | 'gif'
}

export interface VideoRenderOutput {
  videoPath: string
  thumbnailPath?: string
  durationMs: number
  width: number
  height: number
  format?: string
  quality?: string
  aspectRatio?: string
}

const OUTPUT_DIR = IS_SERVERLESS
  ? path.join('/tmp', 'generated', 'video')
  : path.join(process.cwd(), 'public', 'generated', 'video')

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

export async function renderVideo(input: VideoRenderInput): Promise<VideoRenderOutput> {
  ensureDir(OUTPUT_DIR)

  // Determine dimensions: custom aspect ratio > platform default
  let dimensions: { width: number; height: number }
  if (input.aspectRatio && ASPECT_RATIO_DIMENSIONS[input.aspectRatio]) {
    dimensions = ASPECT_RATIO_DIMENSIONS[input.aspectRatio]
  } else {
    dimensions = PLATFORM_DIMENSIONS[input.platform] || PLATFORM_DIMENSIONS.tiktok
  }

  const qualityPreset = QUALITY_PRESETS[input.quality || 'standard']
  const format = input.format || 'mp4'

  // Scale dimensions for draft quality
  const scaledWidth = Math.round(dimensions.width * qualityPreset.scale)
  const scaledHeight = Math.round(dimensions.height * qualityPreset.scale)

  const fps = format === 'gif' ? 15 : 30
  const durationMs = input.durationMs || 30000 // default 30 seconds
  // For GIF, cap at 10 seconds to keep file size reasonable
  const effectiveDurationMs = format === 'gif' ? Math.min(durationMs, 10000) : durationMs
  const durationInFrames = Math.ceil((effectiveDurationMs / 1000) * fps)

  const ext = format === 'gif' ? 'gif' : 'mp4'
  const videoId = `video-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const outputPath = path.join(OUTPUT_DIR, `${videoId}.${ext}`)

  try {
    // Dynamic import to avoid bundling issues with Next.js
    const { bundle } = await import('@remotion/bundler' as string)
    const { renderMedia, selectComposition } = await import('@remotion/renderer')

    console.log(`[Render] Starting: template=${input.template}, duration=${effectiveDurationMs}ms, format=${format}, ${scaledWidth}x${scaledHeight}`)

    // Bundle the Remotion project
    const bundleLocation = await bundle({
      entryPoint: path.join(process.cwd(), 'src', 'remotion', 'index.ts'),
      webpackOverride: (config: Record<string, unknown>) => config,
    })
    console.log(`[Render] Bundle created at: ${bundleLocation}`)

    // Resolve audio source: copy audio file into the Remotion bundle
    // so headless Chromium can access it via the bundle's HTTP server.
    let resolvedAudioSrc = input.audioSrc
    if (resolvedAudioSrc) {
      // Convert URL paths to absolute filesystem paths
      let absoluteAudioPath: string | null = null
      if (resolvedAudioSrc.startsWith('/api/generated/')) {
        const relativePart = resolvedAudioSrc.replace('/api/generated/', '')
        absoluteAudioPath = path.join('/tmp', 'generated', relativePart)
      } else if (resolvedAudioSrc.startsWith('/generated/')) {
        absoluteAudioPath = path.join(process.cwd(), 'public', resolvedAudioSrc)
      } else if (resolvedAudioSrc.startsWith('/tmp/') || resolvedAudioSrc.startsWith('/Users/') || resolvedAudioSrc.startsWith('/home/')) {
        absoluteAudioPath = resolvedAudioSrc
      }

      // Copy audio file into the Remotion bundle so Chromium can serve it
      if (absoluteAudioPath && fs.existsSync(absoluteAudioPath)) {
        const audioFilename = path.basename(absoluteAudioPath)
        fs.copyFileSync(absoluteAudioPath, path.join(bundleLocation, audioFilename))
        resolvedAudioSrc = `/${audioFilename}` // served from bundle root
        console.log(`[Render] Copied audio to bundle: ${audioFilename}`)
      } else {
        console.warn(`[Render] Audio file not found: ${absoluteAudioPath || resolvedAudioSrc}`)
        resolvedAudioSrc = undefined
      }
    }

    const inputProps = {
      hook: input.hook,
      scriptLines: input.scriptLines,
      caption: '',
      cta: input.cta,
      audioSrc: resolvedAudioSrc,
      backgroundImage: input.backgroundImage,
      sceneImages: input.sceneImages || [],
      wordBoundaries: input.wordBoundaries || [],
      captionStyle: input.captionStyle || 'karaoke',
      hookStyle: input.hookStyle || 'pop',
      colorAccent: input.colorAccent || '#A855F7',
      // Avatar
      avatarFaceUrl: input.avatarFaceUrl,
      avatarVideoUrl: input.avatarVideoUrl,
      avatarIsVideo: input.avatarIsVideo || false,
      avatarPosition: input.avatarPosition || 'bottom-right',
      avatarShape: input.avatarShape || 'circle',
      avatarSize: input.avatarSize || 'medium',
    }

    // Select composition with props
    const composition = await selectComposition({
      serveUrl: bundleLocation,
      id: input.template,
      inputProps,
    })

    // Override composition config with final dimensions
    const compositionWithDimensions = {
      ...composition,
      width: scaledWidth,
      height: scaledHeight,
      durationInFrames,
      fps,
    }

    // Build render options based on format
    const renderOptions: Record<string, unknown> = {
      composition: compositionWithDimensions,
      serveUrl: bundleLocation,
      outputLocation: outputPath,
      inputProps,
    }

    if (format === 'gif') {
      renderOptions.codec = 'gif'
      // GIF-specific: lower scale for smaller file
      renderOptions.everyNthFrame = 2
    } else {
      renderOptions.codec = 'h264'
      renderOptions.crf = qualityPreset.crf
    }

    // Add progress logging and browser error capture
    renderOptions.onBrowserLog = (log: { text: string; type: string }) => {
      if (log.type === 'error') {
        console.error(`[Render] Browser error: ${log.text}`)
      }
    }

    console.log(`[Render] Starting renderMedia for ${input.template}...`)

    // Render
    await renderMedia(renderOptions as Parameters<typeof renderMedia>[0])

    console.log(`[Render] Completed: ${outputPath}`)

    // Verify output file was created
    if (!fs.existsSync(outputPath)) {
      throw new Error('Render completed but output file was not created')
    }
    const outputStat = fs.statSync(outputPath)
    if (outputStat.size === 0) {
      fs.unlinkSync(outputPath)
      throw new Error('Render completed but output file is empty')
    }
    console.log(`[Render] Output file size: ${(outputStat.size / 1024 / 1024).toFixed(2)}MB`)

    return {
      videoPath: IS_SERVERLESS
        ? `/api/generated/video/${videoId}.${ext}`
        : `/generated/video/${videoId}.${ext}`,
      durationMs: effectiveDurationMs,
      width: scaledWidth,
      height: scaledHeight,
      format,
      quality: input.quality || 'standard',
      aspectRatio: input.aspectRatio || (dimensions.width === dimensions.height ? '1:1' : dimensions.width > dimensions.height ? '16:9' : '9:16'),
    }
  } catch (error) {
    console.error('Video render error:', error)
    throw new Error(`Video rendering failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// Extract audio from an existing video file
// Sanitize file paths to prevent path traversal attacks
function sanitizePath(inputPath: string): string {
  // Remove null bytes, ../ sequences, and resolve to prevent traversal
  const cleaned = inputPath.replace(/\0/g, '').replace(/\.\./g, '').replace(/\/\//g, '/')
  // Only allow paths starting with /generated/
  if (!cleaned.startsWith('/generated/')) {
    throw new Error('Invalid path: must be within /generated/ directory')
  }
  // Only allow alphanumeric, hyphens, dots, slashes
  if (!/^\/generated\/[a-zA-Z0-9\-_./]+$/.test(cleaned)) {
    throw new Error('Invalid path: contains forbidden characters')
  }
  return cleaned
}

export async function extractAudio(videoPath: string): Promise<string> {
  // Validate and sanitize the input path
  const safePath = sanitizePath(videoPath)
  const baseDir = IS_SERVERLESS ? '/tmp' : path.join(process.cwd(), 'public')
  const absolutePath = path.resolve(baseDir, safePath.slice(1)) // remove leading /

  // Verify the resolved path is still within generated/
  const generatedDir = path.resolve(baseDir, 'generated')
  if (!absolutePath.startsWith(generatedDir)) {
    throw new Error('Path traversal attempt detected')
  }

  if (!fs.existsSync(absolutePath)) {
    throw new Error('Video file not found')
  }

  const audioId = `audio-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const audioDir = IS_SERVERLESS
    ? path.join('/tmp', 'generated', 'audio')
    : path.join(process.cwd(), 'public', 'generated', 'audio')
  ensureDir(audioDir)
  const outputPath = path.join(audioDir, `${audioId}.mp3`)

  try {
    const ffmpegPath = (await import('ffmpeg-static')).default
    const { execFileSync } = await import('child_process')
    // Use execFileSync instead of execSync to prevent shell injection
    execFileSync(ffmpegPath as string, [
      '-i', absolutePath,
      '-vn',
      '-acodec', 'libmp3lame',
      '-q:a', '2',
      outputPath,
    ], {
      timeout: 60000,
    })
    return `/generated/audio/${audioId}.mp3`
  } catch (error) {
    console.error('Audio extraction error:', error)
    throw new Error(`Audio extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// Clean up old video files (older than 2 hours)
export function cleanupOldVideos() {
  if (!fs.existsSync(OUTPUT_DIR)) return
  const files = fs.readdirSync(OUTPUT_DIR)
  const now = Date.now()
  for (const file of files) {
    const filePath = path.join(OUTPUT_DIR, file)
    const stat = fs.statSync(filePath)
    if (now - stat.mtimeMs > 2 * 60 * 60 * 1000) {
      fs.unlinkSync(filePath)
    }
  }
}
