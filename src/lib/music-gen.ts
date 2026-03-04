/**
 * AI Music Generator
 *
 * Generate background music from text prompts or mood selections.
 *
 * Providers:
 *  1. Replicate (MusicGen) — high quality
 *  2. Free fallback — curated royalty-free tracks
 */

import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import crypto from 'crypto'

const IS_SERVERLESS = !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME || !!process.env.RAILWAY_ENVIRONMENT

const OUTPUT_DIR = IS_SERVERLESS
  ? path.join('/tmp', 'generated', 'music')
  : path.join(process.cwd(), 'public', 'generated', 'music')

export interface MusicGenerateOptions {
  /** Text prompt describing the music */
  prompt: string
  /** Duration in seconds (default: 10, max: 30) */
  duration?: number
  /** Music genre/mood preset */
  mood?: string
  /** Provider */
  provider?: 'replicate' | 'free'
}

export interface MusicResult {
  audioUrl: string
  provider: string
  model: string
  duration: number
  prompt: string
}

export const MUSIC_MOODS = [
  { id: 'upbeat', name: 'Upbeat', prompt: 'upbeat pop music, energetic, positive vibes, catchy melody', icon: '🎵' },
  { id: 'chill', name: 'Chill', prompt: 'chill lo-fi hip hop beats, relaxed, smooth jazz elements', icon: '😌' },
  { id: 'dramatic', name: 'Dramatic', prompt: 'dramatic cinematic orchestral music, epic, powerful', icon: '🎬' },
  { id: 'corporate', name: 'Corporate', prompt: 'corporate background music, professional, motivational, clean', icon: '💼' },
  { id: 'electronic', name: 'Electronic', prompt: 'electronic dance music, synth, modern beats, EDM', icon: '🎧' },
  { id: 'acoustic', name: 'Acoustic', prompt: 'acoustic guitar folk music, warm, organic, gentle', icon: '🎸' },
  { id: 'ambient', name: 'Ambient', prompt: 'ambient atmospheric soundscape, ethereal, floating, calm', icon: '🌊' },
  { id: 'hip-hop', name: 'Hip Hop', prompt: 'hip hop trap beat, 808 bass, modern rap instrumental', icon: '🎤' },
  { id: 'rock', name: 'Rock', prompt: 'rock instrumental, electric guitar, drums, energetic', icon: '🎸' },
  { id: 'jazz', name: 'Jazz', prompt: 'smooth jazz, saxophone, piano, relaxing groove', icon: '🎷' },
  { id: 'classical', name: 'Classical', prompt: 'classical piano music, elegant, refined, Chopin style', icon: '🎹' },
  { id: 'fun', name: 'Fun & Quirky', prompt: 'fun quirky music, playful xylophone, ukulele, happy', icon: '🎪' },
] as const

/**
 * Generate music from a text prompt
 */
export async function generateMusic(options: MusicGenerateOptions): Promise<MusicResult> {
  const provider = options.provider || selectProvider()

  if (!existsSync(OUTPUT_DIR)) {
    await mkdir(OUTPUT_DIR, { recursive: true })
  }

  // Enhance prompt with mood if provided
  let prompt = options.prompt
  if (options.mood) {
    const moodInfo = MUSIC_MOODS.find(m => m.id === options.mood)
    if (moodInfo) {
      prompt = `${moodInfo.prompt}, ${prompt}`
    }
  }

  const enhancedOptions = { ...options, prompt }

  switch (provider) {
    case 'replicate':
      return generateWithReplicate(enhancedOptions)
    case 'free':
      return generateFree(enhancedOptions)
    default:
      return generateFree(enhancedOptions)
  }
}

function selectProvider(): MusicGenerateOptions['provider'] {
  if (process.env.REPLICATE_API_TOKEN || process.env.REPLICATE_API_KEY) {
    return 'replicate'
  }
  return 'free'
}

/**
 * Generate via Replicate MusicGen
 */
async function generateWithReplicate(options: MusicGenerateOptions): Promise<MusicResult> {
  const apiKey = process.env.REPLICATE_API_TOKEN || process.env.REPLICATE_API_KEY || ''
  if (!apiKey) throw new Error('REPLICATE_API_TOKEN not configured')

  const duration = Math.min(options.duration || 10, 30)

  const models = [
    {
      owner: 'meta',
      name: 'musicgen',
      label: 'MusicGen',
      buildInput: () => ({
        prompt: options.prompt,
        duration,
        model_version: 'stereo-melody-large',
        output_format: 'mp3',
        normalization_strategy: 'peak',
      }),
    },
    {
      owner: 'facebookresearch',
      name: 'musicgen',
      label: 'MusicGen (FB)',
      buildInput: () => ({
        prompt: options.prompt,
        duration,
        model_version: 'stereo-large',
        output_format: 'mp3',
      }),
    },
  ]

  for (const model of models) {
    try {
      const createRes = await fetch(`https://api.replicate.com/v1/models/${model.owner}/${model.name}/predictions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ input: model.buildInput() }),
      })

      if (!createRes.ok) {
        const err = await createRes.text()
        console.warn(`[music-gen] ${model.label} failed: ${err}`)
        continue
      }

      const prediction = await createRes.json()
      const maxWait = 180_000
      const start = Date.now()
      let result = prediction

      while (Date.now() - start < maxWait) {
        if (result.status === 'succeeded') break
        if (result.status === 'failed' || result.status === 'canceled') {
          throw new Error(`${model.label} failed: ${result.error || 'Unknown'}`)
        }
        await new Promise(r => setTimeout(r, 3000))
        const pollRes = await fetch(`https://api.replicate.com/v1/predictions/${result.id}`, {
          headers: { 'Authorization': `Bearer ${apiKey}` },
        })
        result = await pollRes.json()
      }

      if (result.status !== 'succeeded') {
        console.warn(`[music-gen] ${model.label} timed out`)
        continue
      }

      const outputUrl = typeof result.output === 'string' ? result.output : result.output?.[0]
      if (!outputUrl) continue

      // Download and save
      const audioRes = await fetch(outputUrl)
      const audioBuffer = Buffer.from(await audioRes.arrayBuffer())
      const ext = outputUrl.includes('.wav') ? 'wav' : 'mp3'
      const filename = `music_${crypto.randomUUID().slice(0, 8)}.${ext}`
      const outputPath = path.join(OUTPUT_DIR, filename)
      await writeFile(outputPath, audioBuffer)

      const servePath = IS_SERVERLESS
        ? `/api/generated/music/${filename}`
        : `/generated/music/${filename}`

      return {
        audioUrl: servePath,
        provider: 'replicate',
        model: model.label,
        duration,
        prompt: options.prompt,
      }
    } catch (err) {
      console.warn(`[music-gen] ${model.label} error:`, err)
      continue
    }
  }

  return generateFree(options)
}

/**
 * Free fallback — generate a simple tone or return a placeholder
 */
async function generateFree(options: MusicGenerateOptions): Promise<MusicResult> {
  // Use Pollinations audio API if available
  const prompt = encodeURIComponent(options.prompt)
  const audioUrl = `https://audio.pollinations.ai/prompt/${prompt}?model=musicgen&duration=${options.duration || 10}`

  return {
    audioUrl,
    provider: 'pollinations',
    model: 'pollinations-musicgen',
    duration: options.duration || 10,
    prompt: options.prompt,
  }
}

/**
 * Get provider info
 */
export function getMusicProviders() {
  return [
    {
      id: 'replicate',
      name: 'MusicGen (Replicate)',
      available: !!(process.env.REPLICATE_API_TOKEN || process.env.REPLICATE_API_KEY),
      description: 'High-quality AI music generation by Meta',
    },
    {
      id: 'free',
      name: 'Pollinations (Free)',
      available: true,
      description: 'Free AI music generation',
    },
  ]
}
