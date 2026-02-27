import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { generateTTS, type VoiceId, VOICES } from '@/lib/tts'
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
    const { text, voice, rate, pitch } = body

    if (!text || typeof text !== 'string' || text.length > 2000) {
      return badRequest('Text is required (max 2000 chars)')
    }

    const voiceId = (voice && voice in VOICES ? voice : 'jenny') as VoiceId

    const result = await generateTTS(
      text,
      voiceId,
      rate || '+0%',
      pitch || '+0Hz'
    )

    return apiSuccess({
      data: {
        audioUrl: result.audioPath,
        duration: result.duration,
        wordBoundaries: result.wordBoundaries,
      },
    })
  } catch (error) {
    logger.error('TTS error', { error: error instanceof Error ? error.message : String(error) })
    return serverError('Voice generation failed. Please try again.')
  }
}
