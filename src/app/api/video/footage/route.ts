import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { searchStockVideos, searchStockImages, extractSearchKeywords } from '@/lib/stock-footage'
import { rateLimit } from '@/lib/rate-limit'
import { apiSuccess, unauthorized, rateLimited, badRequest, serverError } from '@/lib/api-response'
import { logger } from '@/lib/logger'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return unauthorized()

    const identifier = session.user.id || session.user.email || 'anonymous'
    if (!rateLimit(`footage:${identifier}`, 30, 60 * 60 * 1000)) return rateLimited()

    const body = await req.json()
    const { productName, productDescription, platform, type = 'video' } = body

    if (!productName || !productDescription) {
      return badRequest('Product name and description are required')
    }

    const keywords = extractSearchKeywords(productName, productDescription, platform || 'tiktok')

    const orientation =
      platform === 'linkedin' || platform === 'twitter_x' ? 'square' as const : 'portrait' as const

    const results = []
    for (const keyword of keywords.slice(0, 3)) {
      if (type === 'image') {
        const images = await searchStockImages(keyword, { perPage: 3, orientation })
        results.push(...images)
      } else {
        const videos = await searchStockVideos(keyword, { perPage: 3, orientation })
        results.push(...videos)
      }
    }

    const unique = results.filter(
      (item, index, self) => index === self.findIndex(t => t.id === item.id)
    )

    return apiSuccess({
      data: {
        keywords,
        clips: unique.slice(0, 10),
      },
    })
  } catch (error) {
    logger.error('Stock footage error', { error: error instanceof Error ? error.message : String(error) })
    const errorMessage = error instanceof Error ? error.message : 'Stock footage search failed'
    return serverError(errorMessage)
  }
}
