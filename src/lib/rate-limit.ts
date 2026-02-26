// In-memory rate limiting store.
// Note: This works for single-instance deployments. For multi-instance or
// serverless production environments, replace with a Redis-backed or
// database-backed implementation (e.g. Upstash Redis or Vercel KV).
const rateLimitStore = new Map<string, { count: number; resetAt: number }>()

export function rateLimit(identifier: string, limit: number = 10, windowMs: number = 60000): boolean {
  const now = Date.now()
  const entry = rateLimitStore.get(identifier)

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(identifier, { count: 1, resetAt: now + windowMs })
    return true
  }

  if (entry.count >= limit) {
    return false
  }

  entry.count++
  return true
}
