import { isGoogleTTSConfigured } from '@/lib/google-tts'
import { apiSuccess } from '@/lib/api-response'

export async function GET() {
  return apiSuccess({
    data: {
      googleAvailable: isGoogleTTSConfigured,
      engines: [
        { id: 'edge', name: 'Edge TTS', available: true },
        { id: 'google', name: 'Google WaveNet', available: isGoogleTTSConfigured },
      ],
    },
  })
}
