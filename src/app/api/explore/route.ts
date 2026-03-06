import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { apiSuccess, unauthorized, serverError } from '@/lib/api-response'
import { logger } from '@/lib/logger'
import { prisma } from '@/lib/db'

/**
 * GET /api/explore — Get gallery of generated content (images + videos)
 */
export async function GET(req: NextRequest) {
  let done = (_status: number, _extra?: Record<string, unknown>) => {}
  try {
    const session = await auth()
    if (!session?.user?.email) return unauthorized()
    done = logger.apiRequest(req, session.user.email)

    const page = Number(req.nextUrl.searchParams.get('page') || '1')
    const limit = Math.min(Number(req.nextUrl.searchParams.get('limit') || '20'), 50)
    const type = req.nextUrl.searchParams.get('type') || 'all'
    // scope=my (default) scopes to current user; scope=community shows all users
    const scope = req.nextUrl.searchParams.get('scope') || 'my'

    const currentUser = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } })
    const userFilter = scope === 'community' ? {} : { userId: currentUser?.id }

    const items: Array<{
      id: string
      type: string
      title: string
      content: string
      createdAt: Date
      user?: { name?: string | null; image?: string | null }
    }> = []

    // Fetch images
    if (type === 'all' || type === 'image') {
      const images = await prisma.generatedImage.findMany({
        where: userFilter,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: (page - 1) * limit,
        select: {
          id: true,
          prompt: true,
          imageUrl: true,
          createdAt: true,
          user: { select: { name: true } },
        },
      })
      items.push(...images.map(img => ({
        id: img.id,
        type: 'image' as const,
        title: img.prompt.slice(0, 60),
        content: img.imageUrl,
        createdAt: img.createdAt,
        user: { name: img.user.name },
      })))
    }

    // Fetch videos
    if (type === 'all' || type === 'video') {
      const videos = await prisma.video.findMany({
        where: { status: 'completed', ...userFilter },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: (page - 1) * limit,
        select: {
          id: true,
          hook: true,
          videoPath: true,
          thumbnailPath: true,
          createdAt: true,
          user: { select: { name: true } },
        },
      })
      items.push(...videos.map(vid => ({
        id: vid.id,
        type: 'video' as const,
        title: vid.hook.slice(0, 60),
        content: vid.videoPath || '',
        createdAt: vid.createdAt,
        user: { name: vid.user.name },
      })))
    }

    // Sort by date
    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    done(200)
    return apiSuccess({
      data: items.slice(0, limit),
      meta: { page, limit, total: items.length },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch explore content'
    console.error('[api/explore] Error:', msg)
    done(500)
    return serverError(msg)
  }
}
