import { NextResponse } from 'next/server'

// Standard API envelope: { success, data?, error?, meta? }

interface ApiMeta {
  page?: number
  limit?: number
  total?: number
  timestamp?: string
  [key: string]: unknown
}

interface SuccessOptions<T> {
  data: T
  status?: number
  meta?: ApiMeta
}

interface ErrorOptions {
  error: string
  status?: number
  details?: unknown
}

export function apiSuccess<T>({ data, status = 200, meta }: SuccessOptions<T>) {
  return NextResponse.json(
    {
      success: true,
      data,
      meta: { timestamp: new Date().toISOString(), ...meta },
    },
    { status }
  )
}

export function apiError({ error, status = 500, details }: ErrorOptions) {
  return NextResponse.json(
    {
      success: false,
      error,
      ...(details ? { details } : {}),
      meta: { timestamp: new Date().toISOString() },
    },
    { status }
  )
}

// Common error responses
export const unauthorized = () => apiError({ error: 'Unauthorized', status: 401 })
export const badRequest = (error: string, details?: unknown) =>
  apiError({ error, status: 400, details })
export const notFound = (error = 'Not found') => apiError({ error, status: 404 })
export const conflict = (error: string) => apiError({ error, status: 409 })
export const rateLimited = () => apiError({ error: 'Too many requests. Please try again later.', status: 429 })
export const serverError = (error = 'Internal server error') => apiError({ error, status: 500 })
