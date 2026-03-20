import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { generateTTS, type VoiceId, VOICES } from '@/lib/tts'
import { generateGoogleTTS, type GoogleVoiceId, GOOGLE_VOICES, isGoogleTTSConfigured } from '@/lib/google-tts'
import { rateLimit } from '@/lib/rate-limit'
import { apiSuccess, unauthorized, rateLimited, badRequest, serverError } from '@/lib/api-response'
import { logger } from '@/lib/logger'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return unauthorized()

    const identifier = session.user.id || session.user.email || 'anonymous'
    if (!rateLimit(`tts:${identifier}`, 30, 60 * 60 * 1000)) return rateLimited()

    const body = await req.json()
    const { text, voice, rate, pitch, engine } = body

    if (!text || typeof text !== 'string' || text.length > 2000) {
      return badRequest('Text is required (max 2000 chars)')
    }

    // Determine which engine to use based on voice ID or explicit engine param
    const useGoogle = engine === 'google' || (typeof voice === 'string' && voice.startsWith('g-'))

    let result
    if (useGoogle) {
      if (!isGoogleTTSConfigured) {
        return badRequest('Google Cloud TTS not configured. Set GOOGLE_TTS_API_KEY in environment variables.')
      }
      const googleVoiceId = (voice && voice in GOOGLE_VOICES ? voice : 'g-aria') as GoogleVoiceId
      result = await generateGoogleTTS(
        text,
        googleVoiceId,
        rate || '+0%',
        pitch || '+0Hz'
      )
    } else {
      const edgeVoiceId = (voice && voice in VOICES ? voice : 'jenny') as VoiceId
      result = await generateTTS(
        text,
        edgeVoiceId,
        rate || '+0%',
        pitch || '+0Hz'
      )
    }

    return apiSuccess({
      data: {
        audioUrl: result.audioPath,
        audioBase64: result.audioBase64,
        duration: result.duration,
        wordBoundaries: result.wordBoundaries,
        engine: useGoogle ? 'google' : 'edge',
        googleAvailable: isGoogleTTSConfigured,
      },
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    logger.error('TTS error', { error: msg })
    return serverError(`Voice generation failed: ${msg.includes('timed out') ? 'Connection timed out — try again.' : 'Please try again.'}`)
  }
}
