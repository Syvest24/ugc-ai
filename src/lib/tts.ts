import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts'
import fs from 'fs'
import path from 'path'

const IS_SERVERLESS = !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME || !!process.env.RAILWAY_ENVIRONMENT

export interface TTSWordBoundary {
  text: string
  startMs: number
  endMs: number
}

export interface TTSResult {
  audioPath: string
  duration: number // total ms
  wordBoundaries: TTSWordBoundary[]
}

// UGC-friendly voices - natural, young, energetic
export const VOICES = {
  // Female
  'jenny': 'en-US-JennyNeural',
  'aria': 'en-US-AriaNeural',
  'sara': 'en-US-SaraNeural',
  'emma': 'en-GB-SoniaNeural',
  // Male
  'guy': 'en-US-GuyNeural',
  'davis': 'en-US-DavisNeural',
  'jason': 'en-US-JasonNeural',
  'ryan': 'en-GB-RyanNeural',
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

export async function generateTTS(
  text: string,
  voiceId: VoiceId = 'jenny',
  rate: string = '+0%',
  pitch: string = '+0Hz'
): Promise<TTSResult> {
  ensureDir(OUTPUT_DIR)

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

    writeStream.on('finish', () => {
      tts.close()

      if (IS_SERVERLESS) {
        // On serverless, convert to data URI since /tmp isn't publicly accessible
        const audioBuffer = fs.readFileSync(audioPath)
        const dataUri = `data:audio/mpeg;base64,${audioBuffer.toString('base64')}`
        // Clean up temp file
        try { fs.unlinkSync(audioPath) } catch { /* ignore */ }
        resolve({
          audioPath: dataUri,
          duration: lastEndMs > 0 ? lastEndMs : estimateDuration(text),
          wordBoundaries,
        })
      } else {
        resolve({
          audioPath: `/generated/audio/${id}.mp3`,
          duration: lastEndMs > 0 ? lastEndMs : estimateDuration(text),
          wordBoundaries,
        })
      }
    })

    writeStream.on('error', (err) => {
      tts.close()
      reject(err)
    })

    audioStream.on('error', (err: Error) => {
      tts.close()
      reject(err)
    })
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
