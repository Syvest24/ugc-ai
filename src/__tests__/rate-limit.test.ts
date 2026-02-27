import { describe, it, expect } from 'vitest'
import { rateLimit } from '@/lib/rate-limit'

describe('rateLimit (in-memory)', () => {
  it('allows requests within the limit', () => {
    const key = `test-allow-${Date.now()}`
    expect(rateLimit(key, 3, 60000)).toBe(true)
    expect(rateLimit(key, 3, 60000)).toBe(true)
    expect(rateLimit(key, 3, 60000)).toBe(true)
  })

  it('blocks requests exceeding the limit', () => {
    const key = `test-block-${Date.now()}`
    rateLimit(key, 2, 60000)
    rateLimit(key, 2, 60000)
    expect(rateLimit(key, 2, 60000)).toBe(false)
  })

  it('resets after the window expires', async () => {
    const key = `test-reset-${Date.now()}`
    rateLimit(key, 1, 100) // 100ms window
    expect(rateLimit(key, 1, 100)).toBe(false) // blocked

    await new Promise(r => setTimeout(r, 150))
    expect(rateLimit(key, 1, 100)).toBe(true) // allowed again
  })

  it('isolates different identifiers', () => {
    const keyA = `test-iso-a-${Date.now()}`
    const keyB = `test-iso-b-${Date.now()}`
    rateLimit(keyA, 1, 60000)
    expect(rateLimit(keyA, 1, 60000)).toBe(false) // A blocked
    expect(rateLimit(keyB, 1, 60000)).toBe(true)  // B still allowed
  })
})
