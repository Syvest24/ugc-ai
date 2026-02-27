/**
 * Video Render Queue — Semaphore-based concurrency limiter
 * 
 * Prevents CPU exhaustion by limiting simultaneous video renders.
 * Additional requests are queued and processed in FIFO order.
 */

import { renderVideo, type VideoRenderInput, type VideoRenderOutput } from './video-renderer'

interface QueuedJob {
  id: string
  userId: string
  resolve: (value: VideoRenderOutput) => void
  reject: (error: Error) => void
  input: VideoRenderInput
  enqueuedAt: number
  timeoutId?: ReturnType<typeof setTimeout>
}

interface QueueStatus {
  active: number
  waiting: number
  maxConcurrent: number
  totalProcessed: number
  totalFailed: number
}

const MAX_CONCURRENT = parseInt(process.env.RENDER_MAX_CONCURRENT || '2', 10)
const RENDER_TIMEOUT_MS = parseInt(process.env.RENDER_TIMEOUT_MS || '300000', 10) // 5 minutes
const MAX_QUEUE_SIZE = parseInt(process.env.RENDER_MAX_QUEUE || '10', 10)

class RenderQueue {
  private active = 0
  private queue: QueuedJob[] = []
  private totalProcessed = 0
  private totalFailed = 0

  /**
   * Enqueue a render job. Returns a promise that resolves when rendering completes.
   * Rejects if the queue is full or the render times out.
   */
  async enqueue(input: VideoRenderInput, userId: string): Promise<VideoRenderOutput & { queuedMs: number }> {
    // Check queue capacity
    if (this.queue.length >= MAX_QUEUE_SIZE) {
      throw new QueueFullError(
        `Render queue is full (${MAX_QUEUE_SIZE} jobs waiting). Please try again later.`,
        this.queue.length
      )
    }

    const jobId = `job-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    const enqueuedAt = Date.now()

    return new Promise<VideoRenderOutput & { queuedMs: number }>((resolve, reject) => {
      const job: QueuedJob = {
        id: jobId,
        userId,
        resolve: (result) => {
          if (job.timeoutId) clearTimeout(job.timeoutId)
          resolve({ ...result, queuedMs: Date.now() - enqueuedAt })
        },
        reject: (error) => {
          if (job.timeoutId) clearTimeout(job.timeoutId)
          reject(error)
        },
        input,
        enqueuedAt,
      }

      // Set a timeout for the entire lifecycle (queue wait + render)
      job.timeoutId = setTimeout(() => {
        // Remove from queue if still waiting
        const idx = this.queue.indexOf(job)
        if (idx !== -1) {
          this.queue.splice(idx, 1)
        }
        reject(new RenderTimeoutError('Video render timed out', RENDER_TIMEOUT_MS))
      }, RENDER_TIMEOUT_MS)

      this.queue.push(job)
      this.processNext()
    })
  }

  /**
   * Get the current position in queue for a given user.
   * Returns -1 if user has no jobs in queue.
   */
  getPositionForUser(userId: string): number {
    const idx = this.queue.findIndex(j => j.userId === userId)
    return idx === -1 ? -1 : idx + 1
  }

  /**
   * Get queue status for monitoring/health checks.
   */
  getStatus(): QueueStatus {
    return {
      active: this.active,
      waiting: this.queue.length,
      maxConcurrent: MAX_CONCURRENT,
      totalProcessed: this.totalProcessed,
      totalFailed: this.totalFailed,
    }
  }

  private async processNext(): Promise<void> {
    if (this.active >= MAX_CONCURRENT || this.queue.length === 0) return

    const job = this.queue.shift()!
    this.active++

    try {
      console.log(`[RenderQueue] Starting job ${job.id} for user ${job.userId} (active: ${this.active}, waiting: ${this.queue.length})`)
      const result = await renderVideo(job.input)
      this.totalProcessed++
      console.log(`[RenderQueue] Completed job ${job.id} in ${Date.now() - job.enqueuedAt}ms`)
      job.resolve(result)
    } catch (error) {
      this.totalFailed++
      console.error(`[RenderQueue] Failed job ${job.id}:`, error)
      job.reject(error instanceof Error ? error : new Error(String(error)))
    } finally {
      this.active--
      // Process next job in queue
      this.processNext()
    }
  }
}

// Custom error classes for caller differentiation
export class QueueFullError extends Error {
  public readonly queueSize: number
  constructor(message: string, queueSize: number) {
    super(message)
    this.name = 'QueueFullError'
    this.queueSize = queueSize
  }
}

export class RenderTimeoutError extends Error {
  public readonly timeoutMs: number
  constructor(message: string, timeoutMs: number) {
    super(message)
    this.name = 'RenderTimeoutError'
    this.timeoutMs = timeoutMs
  }
}

// Singleton instance — shared across all requests in the same Node.js process
const globalForQueue = globalThis as unknown as { renderQueue?: RenderQueue }
export const renderQueue = globalForQueue.renderQueue ?? new RenderQueue()
if (process.env.NODE_ENV !== 'production') {
  globalForQueue.renderQueue = renderQueue
}

export type { QueueStatus }
