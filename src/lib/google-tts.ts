import textToSpeech from '@google-cloud/text-to-speech'
import fs from 'fs'
import path from 'path'
import { isR2Configured, uploadToR2 } from './r2'
import type { TTSResult, TTSWordBoundary } from './tts'

const IS_SERVERLESS = !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME || !!process.env.RAILWAY_ENVIRONMENT

const OUTPUT_DIR = IS_SERVERLESS
  ? path.join('/tmp', 'generated', 'audio')
  : path.join(process.cwd(), 'public', 'generated', 'audio')

// Google Cloud TTS configuration
// Requires GOOGLE_TTS_API_KEY env var (easiest) or GOOGLE_APPLICATION_CREDENTIALS (service account JSON)
export const isGoogleTTSConfigured = !!(process.env.GOOGLE_TTS_API_KEY || process.env.GOOGLE_APPLICATION_CREDENTIALS)

// WaveNet voices — highest quality free tier (1M chars/month)
export const GOOGLE_VOICES = {
  // Female — WaveNet (natural, expressive)
  'g-aria': { name: 'en-US-Wavenet-F', gender: 'FEMALE' as const, label: 'Aria (Google)', style: 'Clear & Natural' },
  'g-luna': { name: 'en-US-Wavenet-H', gender: 'FEMALE' as const, label: 'Luna (Google)', style: 'Warm & Smooth' },
  'g-ella': { name: 'en-US-Wavenet-C', gender: 'FEMALE' as const, label: 'Ella (Google)', style: 'Young & Bright' },
  'g-sophie': { name: 'en-GB-Wavenet-A', gender: 'FEMALE' as const, label: 'Sophie (Google)', style: 'British & Elegant' },
  'g-chloe': { name: 'en-US-Wavenet-E', gender: 'FEMALE' as const, label: 'Chloe (Google)', style: 'Soft & Friendly' },
  'g-freya': { name: 'en-AU-Wavenet-A', gender: 'FEMALE' as const, label: 'Freya (Google)', style: 'Australian & Fresh' },
  // Male — WaveNet
  'g-james': { name: 'en-US-Wavenet-D', gender: 'MALE' as const, label: 'James (Google)', style: 'Deep & Confident' },
  'g-noah': { name: 'en-US-Wavenet-B', gender: 'MALE' as const, label: 'Noah (Google)', style: 'Warm & Casual' },
  'g-oliver': { name: 'en-GB-Wavenet-B', gender: 'MALE' as const, label: 'Oliver (Google)', style: 'British & Professional' },
  'g-liam': { name: 'en-US-Wavenet-A', gender: 'MALE' as const, label: 'Liam (Google)', style: 'Young & Dynamic' },
  'g-ethan': { name: 'en-US-Wavenet-J', gender: 'MALE' as const, label: 'Ethan (Google)', style: 'Storyteller & Rich' },
  'g-jack': { name: 'en-AU-Wavenet-B', gender: 'MALE' as const, label: 'Jack (Google)', style: 'Australian & Energetic' },
} as const

export type GoogleVoiceId = keyof typeof GOOGLE_VOICES

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

function getClient() {
  const apiKey = process.env.GOOGLE_TTS_API_KEY
  if (apiKey) {
    return new textToSpeech.TextToSpeechClient({ apiKey })
  }
  // Falls back to GOOGLE_APPLICATION_CREDENTIALS env var (service account)
  return new textToSpeech.TextToSpeechClient()
}

// Convert rate string like "+20%" to a float speaking rate (1.0 = normal)
function parseRate(rate: string): number {
  const match = rate.match(/^([+-]?\d+)%$/)
  if (!match) return 1.0
  return 1.0 + parseInt(match[1]) / 100
}

// Convert pitch string like "+2Hz" to semitones (-20 to 20)
function parsePitch(pitch: string): number {
  const match = pitch.match(/^([+-]?\d+)/)
  if (!match) return 0
  return parseInt(match[1])
}

export async function generateGoogleTTS(
  text: string,
  voiceId: GoogleVoiceId = 'g-aria',
  rate: string = '+0%',
  pitch: string = '+0Hz'
): Promise<TTSResult> {
  if (!isGoogleTTSConfigured) {
    throw new Error('Google Cloud TTS not configured. Set GOOGLE_TTS_API_KEY or GOOGLE_APPLICATION_CREDENTIALS.')
  }

  ensureDir(OUTPUT_DIR)

  const voiceConfig = GOOGLE_VOICES[voiceId]
  if (!voiceConfig) {
    throw new Error(`Unknown Google voice: ${voiceId}`)
  }

  console.log(`[Google TTS] Generating: voice=${voiceId} (${voiceConfig.name}), rate=${rate}, text=${text.substring(0, 60)}...`)

  const client = getClient()

  try {
    const response = await client.synthesizeSpeech({
      input: { text },
      voice: {
        languageCode: voiceConfig.name.substring(0, 5), // e.g. "en-US"
        name: voiceConfig.name,
        ssmlGender: voiceConfig.gender,
      },
      audioConfig: {
        audioEncoding: 'MP3' as const,
        sampleRateHertz: 24000,
        speakingRate: parseRate(rate),
        pitch: parsePitch(pitch),
        effectsProfileId: ['headphone-class-device'],
      },
    })

    const audioContent = response[0]?.audioContent
    if (!audioContent) {
      throw new Error('Google TTS returned empty audio')
    }

    const audioBuffer = Buffer.from(audioContent as Uint8Array)

    if (audioBuffer.length < 1024) {
      throw new Error(`Google TTS returned too-small audio (${audioBuffer.length} bytes)`)
    }

    const id = `gtts-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const audioPath = path.join(OUTPUT_DIR, `${id}.mp3`)
    fs.writeFileSync(audioPath, audioBuffer)

    console.log(`[Google TTS] Audio saved: ${audioPath} (${(audioBuffer.length / 1024).toFixed(1)}KB)`)

    // Build word boundaries from text estimation (Google TTS timepoints are limited)
    const wordBoundaries = estimateWordBoundaries(text, audioBuffer.length)

    // Base64 for client-side preview
    const audioBase64 = audioBuffer.length < 2 * 1024 * 1024
      ? audioBuffer.toString('base64')
      : undefined

    // Upload to R2 or serve locally
    let servePath: string
    if (isR2Configured) {
      try {
        servePath = await uploadToR2(`audio/${id}.mp3`, audioBuffer)
      } catch (err) {
        console.warn('[Google TTS] R2 upload failed, falling back to local:', err)
        servePath = IS_SERVERLESS
          ? `/api/generated/audio/${id}.mp3`
          : `/generated/audio/${id}.mp3`
      }
    } else {
      servePath = IS_SERVERLESS
        ? `/api/generated/audio/${id}.mp3`
        : `/generated/audio/${id}.mp3`
    }

    return {
      audioPath: servePath,
      audioBase64,
      duration: estimateDuration(text, parseRate(rate)),
      wordBoundaries,
    }
  } finally {
    await client.close().catch(() => {})
  }
}

// Estimate word boundaries based on text and speaking rate
function estimateWordBoundaries(text: string, _audioSize: number): TTSWordBoundary[] {
  const words = text.split(/\s+/).filter(w => w.length > 0)
  if (words.length === 0) return []

  const totalDuration = estimateDuration(text, 1.0)
  const avgWordDuration = totalDuration / words.length
  const boundaries: TTSWordBoundary[] = []
  let currentMs = 0

  for (const word of words) {
    // Longer words take slightly longer
    const factor = Math.max(0.5, Math.min(2.0, word.length / 5))
    const wordDuration = avgWordDuration * factor
    boundaries.push({
      text: word,
      startMs: currentMs,
      endMs: currentMs + wordDuration,
    })
    currentMs += wordDuration
  }

  return boundaries
}

function estimateDuration(text: string, speakingRate: number = 1.0): number {
  const words = text.split(/\s+/).length
  // Average ~150 words per minute at normal rate
  return (words / (150 * speakingRate)) * 60 * 1000
}
