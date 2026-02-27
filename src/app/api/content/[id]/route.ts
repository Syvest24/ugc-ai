import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { ensureUser, prisma } from '@/lib/db'
import { apiSuccess, unauthorized, notFound, serverError } from '@/lib/api-response'
import { parseJsonField } from '@/lib/json-field'
import { logger } from '@/lib/logger'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.email) return unauthorized()

    const { id } = await params
    const user = await ensureUser(session.user.email, session.user.name)

    const content = await prisma.generatedContent.findFirst({
      where: {
        id,
        userId: user.id,
      },
    })

    if (!content) return notFound('Content not found')

    // Parse JSON fields back to arrays/objects
    const parsed = {
      id: content.id,
      productName: content.productName,
      productDescription: content.productDescription,
      targetAudience: content.targetAudience,
      platform: content.platform,
      contentGoal: content.contentGoal,
      tone: content.tone,
      ctaType: content.ctaType,
      createdAt: content.createdAt,
      output: {
        hookBank: parseJsonField<string[]>(content.hookBank, []),
        script: content.script,
        altAngles: parseJsonField<Record<string, unknown>>(content.altAngles, {}),
        caption: content.caption,
        hashtags: parseJsonField<string[]>(content.hashtags, []),
        ctaVariations: parseJsonField<string[]>(content.ctaVariations, []),
        thumbnailTexts: parseJsonField<string[]>(content.thumbnailTexts, []),
        engagementBaits: parseJsonField<string[]>(content.engagementBaits, []),
        repurposedContent: content.repurposedContent,
        abVariants: parseJsonField<unknown[]>(content.abVariants, []),
      },
    }

    return apiSuccess({ data: parsed })
  } catch (error) {
    logger.error('Content fetch error', { error: error instanceof Error ? error.message : String(error) })
    return serverError('Failed to fetch content')
  }
}
