import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { rateLimit } from '@/lib/rate-limit'
import { editImage, getImageEditProviders, EDIT_OPERATIONS, RESTYLE_OPTIONS } from '@/lib/image-editor'
import { apiSuccess, unauthorized, rateLimited, badRequest, serverError } from '@/lib/api-response'
import { logger } from '@/lib/logger'
import type { EditOperation } from '@/lib/image-editor'

/**
 * POST /api/image/edit — Apply AI edit to an image
 * GET  /api/image/edit — List operations and providers
 */

export async function POST(req: NextRequest) {
  let done = (_status: number, _extra?: Record<string, unknown>) => {}
  try {
    const session = await auth()
    if (!session?.user?.email) return unauthorized()
    done = logger.apiRequest(req, session.user.email)

    const identifier = session.user.email
    if (!rateLimit(`img-edit:${identifier}`, 20, 60 * 60 * 1000)) {
      done(429)
      return rateLimited()
    }

    const body = await req.json()
    const { imageUrl, operation, prompt, style, scaleFactor } = body

    if (!imageUrl || typeof imageUrl !== 'string') {
      done(400)
      return badRequest('Image URL is required')
    }

    const validOps = EDIT_OPERATIONS.map(o => o.id)
    if (!operation || !validOps.includes(operation)) {
      done(400)
      return badRequest(`Invalid operation. Valid: ${validOps.join(', ')}`)
    }

    const result = await editImage({
      imageUrl,
      operation: operation as EditOperation,
      prompt,
      style,
      scaleFactor,
    })

    done(200)
    return apiSuccess({ data: result })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Image editing failed'
    console.error('[api/image/edit] Error:', msg)
    done(500)
    return serverError(msg)
  }
}

export async function GET() {
  return apiSuccess({
    data: {
      providers: getImageEditProviders(),
      operations: EDIT_OPERATIONS,
      restyleOptions: RESTYLE_OPTIONS,
    },
  })
}
