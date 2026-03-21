import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts'
import fs from 'fs'
import path from 'path'
import { isR2Configured, uploadToR2 } from './r2'

const IS_SERVERLESS = !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME || !!process.env.RAILWAY_ENVIRONMENT

export interface TTSWordBoundary {
  text: string
  startMs: number
  endMs: number
}

export interface TTSResult {
  audioPath: string
  audioBase64?: string
  duration: number // total ms
  wordBoundaries: TTSWordBoundary[]
}

// UGC-friendly voices - natural, young, energetic
export const VOICES = {
  // Female — Natural & UGC-ready
  'jenny': 'en-US-JennyNeural',
  'aria': 'en-US-AriaNeural',
  'sara': 'en-US-SaraNeural',
  'emma': 'en-GB-SoniaNeural',
  'michelle': 'en-US-MichelleNeural',
  'ana': 'en-US-AnaNeural',
  // Male — Natural & UGC-ready
  'guy': 'en-US-GuyNeural',
  'davis': 'en-US-DavisNeural',
  'jason': 'en-US-JasonNeural',
  'ryan': 'en-GB-RyanNeural',
  'tony': 'en-US-TonyNeural',
  'andrew': 'en-US-AndrewNeural',
} as const

export type VoiceId = keyof typeof VOICES

const OUTPUT_DIR = IS_SERVERLESS
  ? path.join('/tmp', 'generated', 'audio')
  : path.join(process.cwd(), 'public', 'generated', 'audio')

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

function validateMP3(filePath: string): boolean {
  try {
    const fd = fs.openSync(filePath, 'r')
    const header = Buffer.alloc(4)
    fs.readSync(fd, header, 0, 4, 0)
    fs.closeSync(fd)
    // ID3v2 tag header
    if (header[0] === 0x49 && header[1] === 0x44 && header[2] === 0x33) return true
    // MPEG audio frame sync
    if (header[0] === 0xff && (header[1] & 0xe0) === 0xe0) return true
    return false
  } catch {
    return false
  }
}

export async function generateTTS(
  text: string,
  voiceId: VoiceId = 'jenny',
  rate: string = '+0%',
  pitch: string = '+0Hz'
): Promise<TTSResult> {
  // Cap text at ~5000 chars (~3 minutes of speech) to prevent timeouts
  const MAX_TTS_CHARS = 5000
  let processedText = text
  if (processedText.length > MAX_TTS_CHARS) {
    console.warn(`[TTS] Text too long (${processedText.length} chars), truncating to ${MAX_TTS_CHARS}`)
    processedText = processedText.slice(0, MAX_TTS_CHARS)
    // Avoid cutting mid-word — trim to last complete sentence or word
    const lastSentenceEnd = processedText.lastIndexOf('.')
    const lastSpace = processedText.lastIndexOf(' ')
    if (lastSentenceEnd > MAX_TTS_CHARS * 0.8) {
      processedText = processedText.slice(0, lastSentenceEnd + 1)
    } else if (lastSpace > MAX_TTS_CHARS * 0.8) {
      processedText = processedText.slice(0, lastSpace)
    }
  }

  // Retry up to 2 times for transient WebSocket failures
  let lastError: Error | null = null
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`[TTS] Retry attempt ${attempt + 1}/3`)
        await new Promise(r => setTimeout(r, 1000 * attempt))
      }
      return await _generateTTSAttempt(processedText, voiceId, rate, pitch)
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
      console.warn(`[TTS] Attempt ${attempt + 1} failed:`, lastError.message)
    }
  }
  throw lastError || new Error('TTS generation failed after 3 attempts')
}

async function _generateTTSAttempt(
  text: string,
  voiceId: VoiceId = 'jenny',
  rate: string = '+0%',
  pitch: string = '+0Hz'
): Promise<TTSResult> {
  ensureDir(OUTPUT_DIR)

  console.log(`[TTS] Generating: voice=${voiceId}, rate=${rate}, text=${text.substring(0, 60)}...`)

  const tts = new MsEdgeTTS()
  const voiceName = VOICES[voiceId]
  await tts.setMetadata(voiceName, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3, {
    wordBoundaryEnabled: true,
    sentenceBoundaryEnabled: false,
  })

  const id = `tts-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const audioPath = path.join(OUTPUT_DIR, `${id}.mp3`)

  const { audioStream, metadataStream } = tts.toStream(text, { rate, pitch })

  return new Promise((resolve, reject) => {
    const writeStream = fs.createWriteStream(audioPath)
    const wordBoundaries: TTSWordBoundary[] = []
    let lastEndMs = 0

    // Pipe audio to file
    audioStream.pipe(writeStream)

    // Collect word boundaries from metadata stream
    if (metadataStream) {
      metadataStream.on('data', (data: Buffer | string) => {
        try {
          const str = typeof data === 'string' ? data : data.toString('utf-8')
          const parsed = JSON.parse(str)
          // Format: { Metadata: [{ Type: "WordBoundary", Data: { Offset, Duration, text: { Text } } }] }
          const entries = parsed.Metadata || [parsed]
          for (const entry of entries) {
            if (entry.Type === 'WordBoundary' || entry.type === 'WordBoundary') {
              const offsetMs = (entry.Data?.Offset || entry.offset || 0) / 10000
              const durationMs = (entry.Data?.Duration || entry.duration || 0) / 10000
              const wordText = entry.Data?.text?.Text || entry.text || ''
              if (wordText) {
                wordBoundaries.push({
                  text: wordText,
                  startMs: offsetMs,
                  endMs: offsetMs + durationMs,
                })
                lastEndMs = offsetMs + durationMs
              }
            }
          }
        } catch {
          // Not all chunks are valid JSON, skip
        }
      })
    }

    writeStream.on('finish', async () => {
      tts.close()

      // Verify audio file has content and valid format
      const stat = fs.statSync(audioPath)
      console.log(`[TTS] Audio file created: ${audioPath} (${(stat.size / 1024).toFixed(1)}KB, ${wordBoundaries.length} word boundaries)`)
      if (stat.size < 1024) {
        reject(new Error(`TTS generated too-small audio file (${stat.size} bytes)`))
        return
      }
      if (!validateMP3(audioPath)) {
        reject(new Error('TTS generated invalid audio data (not a valid MP3)'))
        return
      }

      // Read audio for client-side preview playback
      const audioBuffer = fs.readFileSync(audioPath)
      const audioBase64 = audioBuffer.length < 2 * 1024 * 1024
        ? audioBuffer.toString('base64')
        : undefined

      // Upload to R2 if configured
      let servePath: string
      if (isR2Configured) {
        try {
          const r2Key = `audio/${id}.mp3`
          servePath = await uploadToR2(r2Key, audioBuffer)
        } catch (err) {
          console.warn('[TTS] R2 upload failed, falling back to local serve:', err)
          servePath = IS_SERVERLESS
            ? `/api/generated/audio/${id}.mp3`
            : `/generated/audio/${id}.mp3`
        }
      } else {
        servePath = IS_SERVERLESS
          ? `/api/generated/audio/${id}.mp3`
          : `/generated/audio/${id}.mp3`
      }

      resolve({
        audioPath: servePath,
        audioBase64,
        duration: lastEndMs > 0 ? lastEndMs : estimateDuration(text),
        wordBoundaries,
      })
    })

    writeStream.on('error', (err) => {
      tts.close()
      reject(err)
    })

    audioStream.on('error', (err: Error) => {
      tts.close()
      reject(err)
    })

    // Timeout: prevent hanging if TTS WebSocket stalls
    const timeout = setTimeout(async () => {
      tts.close()
      // Check if we got partial audio
      if (fs.existsSync(audioPath)) {
        const stat = fs.statSync(audioPath)
        if (stat.size > 0) {
          console.warn(`[TTS] Timeout but partial audio saved (${(stat.size / 1024).toFixed(1)}KB)`)
          const audioBuffer = fs.readFileSync(audioPath)
          const audioBase64 = audioBuffer.length < 2 * 1024 * 1024
            ? audioBuffer.toString('base64')
            : undefined
          let servePath: string
          if (isR2Configured) {
            try {
              servePath = await uploadToR2(`audio/${id}.mp3`, audioBuffer)
            } catch {
              servePath = IS_SERVERLESS
                ? `/api/generated/audio/${id}.mp3`
                : `/generated/audio/${id}.mp3`
            }
          } else {
            servePath = IS_SERVERLESS
              ? `/api/generated/audio/${id}.mp3`
              : `/generated/audio/${id}.mp3`
          }
          resolve({
            audioPath: servePath,
            audioBase64,
            duration: lastEndMs > 0 ? lastEndMs : estimateDuration(text),
            wordBoundaries,
          })
          return
        }
      }
      reject(new Error('TTS generation timed out after 60 seconds'))
    }, 60000)

    // Clear timeout on success
    const originalResolve = resolve
    resolve = ((value: TTSResult) => {
      clearTimeout(timeout)
      originalResolve(value)
    }) as typeof resolve
    const originalReject = reject
    reject = ((reason: unknown) => {
      clearTimeout(timeout)
      originalReject(reason)
    }) as typeof reject
  })
}

// Fallback duration estimate when metadata isn't available
function estimateDuration(text: string): number {
  const words = text.split(/\s+/).length
  // Average speaking rate ~150 words per minute
  return (words / 150) * 60 * 1000
}

// Clean up old audio files (older than 1 hour)
export function cleanupOldAudio() {
  if (!fs.existsSync(OUTPUT_DIR)) return
  const files = fs.readdirSync(OUTPUT_DIR)
  const now = Date.now()
  for (const file of files) {
    const filePath = path.join(OUTPUT_DIR, file)
    const stat = fs.statSync(filePath)
    if (now - stat.mtimeMs > 60 * 60 * 1000) {
      fs.unlinkSync(filePath)
    }
  }
}
