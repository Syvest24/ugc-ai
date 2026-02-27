import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { ensureUser, prisma } from '@/lib/db'
import { apiSuccess, unauthorized, serverError, notFound, badRequest } from '@/lib/api-response'
import { logger } from '@/lib/logger'

// GET /api/image — list user's generated images (paginated)
export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.email) return unauthorized()

    const user = await ensureUser(session.user.email)
    const { searchParams } = new URL(req.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')))
    const favoritesOnly = searchParams.get('favorites') === 'true'
    const skip = (page - 1) * limit

    const where = {
      userId: user.id,
      ...(favoritesOnly ? { isFavorite: true } : {}),
    }

    const [images, total] = await Promise.all([
      prisma.generatedImage.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.generatedImage.count({ where }),
    ])

    return apiSuccess({
      data: images,
      meta: { page, limit, total },
    })
  } catch (error) {
    logger.error('List images error', { error: error instanceof Error ? error.message : String(error) })
    return serverError()
  }
}

// DELETE /api/image?id=xxx — delete a generated image
export async function DELETE(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.email) return unauthorized()

    const user = await ensureUser(session.user.email)
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return badRequest('Image ID required')

    const image = await prisma.generatedImage.findUnique({ where: { id } })
    if (!image || image.userId !== user.id) return notFound('Image not found')

    await prisma.generatedImage.delete({ where: { id } })
    return apiSuccess({ data: { deleted: true } })
  } catch (error) {
    logger.error('Delete image error', { error: error instanceof Error ? error.message : String(error) })
    return serverError()
  }
}

// PATCH /api/image?id=xxx — toggle favorite
export async function PATCH(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.email) return unauthorized()

    const user = await ensureUser(session.user.email)
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return badRequest('Image ID required')

    const image = await prisma.generatedImage.findUnique({ where: { id } })
    if (!image || image.userId !== user.id) return notFound('Image not found')

    const updated = await prisma.generatedImage.update({
      where: { id },
      data: { isFavorite: !image.isFavorite },
    })
    return apiSuccess({ data: updated })
  } catch (error) {
    logger.error('Toggle image favorite error', { error: error instanceof Error ? error.message : String(error) })
    return serverError()
  }
}
