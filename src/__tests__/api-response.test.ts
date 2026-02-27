import { describe, it, expect } from 'vitest'
import { apiSuccess, apiError, unauthorized, badRequest, notFound, rateLimited, serverError } from '@/lib/api-response'

async function bodyOf(response: Response) {
  return response.json()
}

describe('api-response', () => {
  describe('apiSuccess', () => {
    it('returns 200 with data and success flag', async () => {
      const res = apiSuccess({ data: { id: '1' } })
      expect(res.status).toBe(200)
      const body = await bodyOf(res)
      expect(body.success).toBe(true)
      expect(body.data).toEqual({ id: '1' })
      expect(body.meta.timestamp).toBeDefined()
    })

    it('supports custom status code', async () => {
      const res = apiSuccess({ data: null, status: 201 })
      expect(res.status).toBe(201)
    })

    it('includes meta when provided', async () => {
      const res = apiSuccess({ data: [], meta: { page: 1, total: 42 } })
      const body = await bodyOf(res)
      expect(body.meta.page).toBe(1)
      expect(body.meta.total).toBe(42)
    })
  })

  describe('apiError', () => {
    it('returns error with success false', async () => {
      const res = apiError({ error: 'boom', status: 500 })
      expect(res.status).toBe(500)
      const body = await bodyOf(res)
      expect(body.success).toBe(false)
      expect(body.error).toBe('boom')
    })

    it('includes details when provided', async () => {
      const res = apiError({ error: 'bad', status: 400, details: { field: 'email' } })
      const body = await bodyOf(res)
      expect(body.details).toEqual({ field: 'email' })
    })
  })

  describe('convenience helpers', () => {
    it('unauthorized returns 401', async () => {
      const res = unauthorized()
      expect(res.status).toBe(401)
      const body = await bodyOf(res)
      expect(body.error).toBe('Unauthorized')
    })

    it('badRequest returns 400 with message', async () => {
      const res = badRequest('Invalid email')
      expect(res.status).toBe(400)
      const body = await bodyOf(res)
      expect(body.error).toBe('Invalid email')
    })

    it('notFound returns 404', async () => {
      const res = notFound()
      expect(res.status).toBe(404)
    })

    it('rateLimited returns 429', async () => {
      const res = rateLimited()
      expect(res.status).toBe(429)
    })

    it('serverError returns 500', async () => {
      const res = serverError()
      expect(res.status).toBe(500)
    })
  })
})
