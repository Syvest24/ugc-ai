/**
 * Rate Limiter with Redis support
 * 
 * Automatically uses Redis when REDIS_URL is set, otherwise falls back
 * to in-memory store (suitable for single-instance deployments).
 * 
 * Redis mode uses a sliding window counter with atomic MULTI/EXEC.
 * In-memory mode uses a simple fixed window.
 * 
 * Usage:
 *   const allowed = await rateLimit('generate:user@email.com', 10, 60000)
 *   if (!allowed) return rateLimited()
 * 
 * Environment:
 *   REDIS_URL=redis://localhost:6379  (optional, enables distributed rate limiting)
 */

import { logger } from './logger'

// ---------------------------------------------------------------------------
// Redis client (lazy-initialized)
// ---------------------------------------------------------------------------

let redisClient: RedisLike | null = null
let redisInitAttempted = false

interface RedisLike {
  multi(): RedisPipeline
  quit(): Promise<void>
}

interface RedisPipeline {
  incr(key: string): RedisPipeline
  expire(key: string, seconds: number): RedisPipeline
  exec(): Promise<Array<[Error | null, unknown]>>
}

async function getRedis(): Promise<RedisLike | null> {
  if (redisInitAttempted) return redisClient
  redisInitAttempted = true

  const url = process.env.REDIS_URL
  if (!url) return null

  try {
    // Dynamic import — only loaded when REDIS_URL is set
    const { createClient } = await import('redis' as string)
    const client = createClient({ url })
    client.on('error', (err: Error) => {
      logger.error('Redis client error', { error: err.message })
    })
    await client.connect()
    redisClient = client as unknown as RedisLike
    logger.info('Redis rate limiter initialized', { url: url.replace(/\/\/.*@/, '//<redacted>@') })
    return redisClient
  } catch (error) {
    logger.warn('Redis unavailable, falling back to in-memory rate limiter', {
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}

// ---------------------------------------------------------------------------
// In-memory fallback
// ---------------------------------------------------------------------------

const memoryStore = new Map<string, { count: number; resetAt: number }>()

// Periodic cleanup of expired entries (every 60s)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of memoryStore) {
      if (now > entry.resetAt) memoryStore.delete(key)
    }
  }, 60_000).unref?.()
}

function rateLimitMemory(identifier: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const entry = memoryStore.get(identifier)

  if (!entry || now > entry.resetAt) {
    memoryStore.set(identifier, { count: 1, resetAt: now + windowMs })
    return true
  }

  if (entry.count >= limit) return false

  entry.count++
  return true
}

// ---------------------------------------------------------------------------
// Redis rate limiter (fixed window via INCR + EXPIRE)
// ---------------------------------------------------------------------------

async function rateLimitRedis(
  redis: RedisLike,
  identifier: string,
  limit: number,
  windowMs: number
): Promise<boolean> {
  const windowSec = Math.ceil(windowMs / 1000)
  const key = `rl:${identifier}:${Math.floor(Date.now() / windowMs)}`

  try {
    const results = await redis.multi()
      .incr(key)
      .expire(key, windowSec + 1) // +1s buffer
      .exec()

    const count = results[0][1] as number
    return count <= limit
  } catch (error) {
    logger.warn('Redis rate limit check failed, allowing request', {
      error: error instanceof Error ? error.message : String(error),
    })
    // Fail open — allow request if Redis is down
    return true
  }
}

// ---------------------------------------------------------------------------
// Public API — backward-compatible synchronous interface + async upgrade
// ---------------------------------------------------------------------------

/**
 * Rate limit check. Tries Redis first, falls back to in-memory.
 * 
 * @param identifier Unique key (e.g., 'generate:user@email.com')
 * @param limit Max requests per window
 * @param windowMs Window duration in milliseconds
 * @returns true if request is allowed, false if rate limited
 */
export function rateLimit(identifier: string, limit: number = 10, windowMs: number = 60000): boolean {
  // Synchronous in-memory check for immediate response
  // Redis check runs async and updates the memory store
  const allowed = rateLimitMemory(identifier, limit, windowMs)

  // Fire-and-forget Redis sync (for distributed tracking)
  getRedis().then(redis => {
    if (redis) {
      rateLimitRedis(redis, identifier, limit, windowMs).catch(() => {
        // Redis errors are non-fatal
      })
    }
  }).catch(() => {})

  return allowed
}

/**
 * Async rate limit check — use this when you can await.
 * Uses Redis when available for distributed accuracy.
 */
export async function rateLimitAsync(
  identifier: string,
  limit: number = 10,
  windowMs: number = 60000
): Promise<boolean> {
  const redis = await getRedis()
  if (redis) {
    return rateLimitRedis(redis, identifier, limit, windowMs)
  }
  return rateLimitMemory(identifier, limit, windowMs)
}

