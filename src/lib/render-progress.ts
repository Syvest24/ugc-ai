/**
 * Render Progress Store — in-memory singleton tracking per-user render progress.
 *
 * Used by the SSE endpoint to stream live progress to the client while a
 * long-running video render is happening in the queue.
 */

export interface RenderProgressEntry {
  jobId: string
  userId: string
  progress: number       // 0–1
  stage: 'queued' | 'rendering' | 'processing' | 'completed' | 'failed'
  startedAt: number
  updatedAt: number
}

const globalForProgress = globalThis as unknown as { _renderProgressMap?: Map<string, RenderProgressEntry> }

export const renderProgressMap: Map<string, RenderProgressEntry> =
  globalForProgress._renderProgressMap ?? new Map()

if (process.env.NODE_ENV !== 'production') {
  globalForProgress._renderProgressMap = renderProgressMap
}

export function setRenderProgress(userId: string, data: Partial<RenderProgressEntry> & { jobId: string }) {
  const now = Date.now()
  const existing = renderProgressMap.get(userId)
  renderProgressMap.set(userId, {
    userId,
    jobId: data.jobId,
    progress: data.progress ?? existing?.progress ?? 0,
    stage: data.stage ?? existing?.stage ?? 'queued',
    startedAt: existing?.startedAt ?? now,
    updatedAt: now,
  })

  // Evict stale entries (> 2 hours old)
  const cutoff = now - 2 * 60 * 60 * 1000
  for (const [uid, entry] of renderProgressMap.entries()) {
    if (entry.updatedAt < cutoff) renderProgressMap.delete(uid)
  }
}

export function getRenderProgress(userId: string): RenderProgressEntry | undefined {
  return renderProgressMap.get(userId)
}

export function clearRenderProgress(userId: string) {
  renderProgressMap.delete(userId)
}
