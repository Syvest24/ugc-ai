import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { ensureUser } from '@/lib/db'
import { getRenderProgress } from '@/lib/render-progress'

/**
 * GET /api/video/render/progress
 *
 * Server-Sent Events endpoint that streams real-time render progress
 * for the currently authenticated user's active render job.
 *
 * Events emitted:
 *   data: { progress: number, stage: string, jobId: string }
 *
 * The client should close the connection when stage === 'completed' | 'failed'.
 */
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email) {
    return new Response('Unauthorized', { status: 401 })
  }

  const user = await ensureUser(session.user.email, session.user.name)

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      let closed = false

      const send = (data: Record<string, unknown>) => {
        if (closed) return
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
        } catch {
          closed = true
        }
      }

      // Send an initial ping so the client knows we're connected
      send({ type: 'ping', progress: 0, stage: 'queued' })

      const POLL_INTERVAL_MS = 500
      const MAX_WAIT_MS = 360_000 // 6 minutes

      const startedAt = Date.now()

      const interval = setInterval(() => {
        if (closed) {
          clearInterval(interval)
          return
        }

        if (Date.now() - startedAt > MAX_WAIT_MS) {
          send({ type: 'timeout', progress: 0, stage: 'failed' })
          clearInterval(interval)
          try { controller.close() } catch { /* ignore */ }
          closed = true
          return
        }

        const entry = getRenderProgress(user.id)
        if (!entry) {
          send({ type: 'progress', progress: 0, stage: 'idle', jobId: null })
          return
        }

        send({
          type: 'progress',
          progress: Math.round(entry.progress * 100) / 100,
          stage: entry.stage,
          jobId: entry.jobId,
          elapsed: Date.now() - entry.startedAt,
        })

        if (entry.stage === 'completed' || entry.stage === 'failed') {
          clearInterval(interval)
          try { controller.close() } catch { /* ignore */ }
          closed = true
        }
      }, POLL_INTERVAL_MS)

      // Clean up if the client disconnects
      req.signal.addEventListener('abort', () => {
        clearInterval(interval)
        closed = true
        try { controller.close() } catch { /* ignore */ }
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering for SSE
    },
  })
}
