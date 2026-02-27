import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma, ensureUser } from '@/lib/db'
import { z } from 'zod'
import { apiSuccess, unauthorized, badRequest, notFound, serverError } from '@/lib/api-response'
import { logger } from '@/lib/logger'
import { parseJsonField } from '@/lib/json-field'

// Validation schemas
const saveContentSchema = z.object({
  productName: z.string().max(200).default(''),
  productDescription: z.string().max(2000).default(''),
  targetAudience: z.string().max(500).default(''),
  platform: z.string().max(50).default(''),
  contentGoal: z.string().max(100).default(''),
  tone: z.string().max(50).default(''),
  ctaType: z.string().max(200).default(''),
  rawOutput: z.string().max(50000).optional(),
  output: z.object({
    hookBank: z.array(z.string().max(500)).max(20).default([]),
    script: z.string().max(10000).default(''),
    altAngles: z.record(z.string(), z.unknown()).default({}),
    caption: z.string().max(5000).default(''),
    hashtags: z.array(z.string().max(100)).max(50).default([]),
    ctaVariations: z.array(z.string().max(500)).max(10).default([]),
    thumbnailTexts: z.array(z.string().max(200)).max(10).default([]),
    engagementBaits: z.array(z.string().max(500)).max(10).default([]),
    repurposedContent: z.string().max(10000).default(''),
    abVariants: z.array(z.unknown()).max(10).default([]),
  }).optional(),
})

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  favorites: z.enum(['true', 'false']).optional(),
  search: z.string().max(200).optional(),
  platform: z.string().max(50).optional(),
  contentGoal: z.string().max(100).optional(),
})

// GET saved content
export async function GET(req: NextRequest) {
  let done = (_status: number, _extra?: Record<string, unknown>) => {}
  try {
    const session = await auth()
    if (!session?.user?.email) return unauthorized()
    done = logger.apiRequest(req, session?.user?.email)

    const user = await ensureUser(session.user.email, session.user.name)
    const searchParams = req.nextUrl.searchParams
    const params = paginationSchema.safeParse({
      page: searchParams.get('page') || '1',
      limit: searchParams.get('limit') || '20',
      favorites: searchParams.get('favorites') || undefined,
      search: searchParams.get('search') || undefined,
      platform: searchParams.get('platform') || undefined,
      contentGoal: searchParams.get('contentGoal') || undefined,
    })

    if (!params.success) {
      done(400)
      return badRequest('Invalid pagination parameters')
    }

    const { page, limit, favorites, search, platform, contentGoal } = params.data
    const favoritesOnly = favorites === 'true'

    // Build where clause with search/filter support
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      userId: user.id,
      ...(favoritesOnly ? { isFavorite: true } : {}),
      ...(platform ? { platform } : {}),
      ...(contentGoal ? { contentGoal } : {}),
    }

    if (search) {
      where.OR = [
        { productName: { contains: search } },
        { productDescription: { contains: search } },
        { targetAudience: { contains: search } },
        { caption: { contains: search } },
        { script: { contains: search } },
      ]
    }

    const [content, total] = await Promise.all([
      prisma.generatedContent.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.generatedContent.count({ where }),
    ])

    // Parse JSON fields back to objects
    const parsed = content.map(item => ({
      id: item.id,
      productName: item.productName,
      productDescription: item.productDescription,
      targetAudience: item.targetAudience,
      platform: item.platform,
      contentGoal: item.contentGoal,
      tone: item.tone,
      ctaType: item.ctaType,
      isFavorite: item.isFavorite,
      savedAt: item.createdAt.toISOString(),
      output: {
        hookBank: parseJsonField<string[]>(item.hookBank, []),
        script: item.script,
        altAngles: parseJsonField<Record<string, unknown>>(item.altAngles, {}),
        caption: item.caption,
        hashtags: parseJsonField<string[]>(item.hashtags, []),
        ctaVariations: parseJsonField<string[]>(item.ctaVariations, []),
        thumbnailTexts: parseJsonField<string[]>(item.thumbnailTexts, []),
        engagementBaits: parseJsonField<string[]>(item.engagementBaits, []),
        repurposedContent: item.repurposedContent,
        abVariants: parseJsonField<unknown[]>(item.abVariants, []),
      },
    }))

    done(200)
    return apiSuccess({ data: { content: parsed }, meta: { total, page, limit } })
  } catch (error) {
    logger.error('Save GET error', { error: error instanceof Error ? error.message : String(error) })
    done(500)
    return serverError('Failed to load saved content')
  }
}

// POST save new content
export async function POST(req: NextRequest) {
  let done = (_status: number, _extra?: Record<string, unknown>) => {}
  try {
    const session = await auth()
    if (!session?.user?.email) return unauthorized()
    done = logger.apiRequest(req, session?.user?.email)

    const user = await ensureUser(session.user.email, session.user.name)
    const body = await req.json()
    const parsed = saveContentSchema.safeParse(body)

    if (!parsed.success) {
      done(400)
      return badRequest('Invalid input', parsed.error.flatten().fieldErrors)
    }

    const data = parsed.data
    const output = data.output ?? {
      hookBank: [], script: '', altAngles: {},
      caption: '', hashtags: [], ctaVariations: [],
      thumbnailTexts: [], engagementBaits: [],
      repurposedContent: '', abVariants: [],
    }

    const item = await prisma.generatedContent.create({
      data: {
        userId: user.id,
        productName: data.productName,
        productDescription: data.productDescription,
        targetAudience: data.targetAudience,
        platform: data.platform,
        contentGoal: data.contentGoal,
        tone: data.tone,
        ctaType: data.ctaType,
        hookBank: JSON.stringify(output.hookBank),
        script: output.script,
        altAngles: JSON.stringify(output.altAngles),
        caption: output.caption,
        hashtags: JSON.stringify(output.hashtags),
        ctaVariations: JSON.stringify(output.ctaVariations),
        thumbnailTexts: JSON.stringify(output.thumbnailTexts),
        engagementBaits: JSON.stringify(output.engagementBaits),
        repurposedContent: output.repurposedContent,
        abVariants: JSON.stringify(output.abVariants),
        rawOutput: data.rawOutput || null,
        isFavorite: true,
      },
    })

    done(200)
    return apiSuccess({
      data: {
        item: {
          id: item.id,
          productName: item.productName,
          platform: item.platform,
          savedAt: item.createdAt.toISOString(),
        },
      },
    })
  } catch (error) {
    logger.error('Save POST error', { error: error instanceof Error ? error.message : String(error) })
    done(500)
    return serverError('Failed to save content')
  }
}

// DELETE saved content
export async function DELETE(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.email) return unauthorized()

    const user = await ensureUser(session.user.email, session.user.name)
    const body = await req.json()
    const id = z.string().min(1).max(100).safeParse(body.id)

    if (!id.success) return badRequest('Valid content ID is required')

    const content = await prisma.generatedContent.findFirst({
      where: { id: id.data, userId: user.id },
    })

    if (!content) return notFound('Not found')

    await prisma.generatedContent.delete({ where: { id: id.data } })
    return apiSuccess({ data: { deleted: true } })
  } catch (error) {
    logger.error('Save DELETE error', { error: error instanceof Error ? error.message : String(error) })
    return serverError('Failed to delete content')
  }
}

// PATCH toggle favorite
export async function PATCH(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.email) return unauthorized()

    const user = await ensureUser(session.user.email, session.user.name)
    const body = await req.json()
    const patchSchema = z.object({
      id: z.string().min(1).max(100),
      isFavorite: z.boolean().optional(),
    })
    const parsed = patchSchema.safeParse(body)

    if (!parsed.success) return badRequest('Valid content ID is required')

    const content = await prisma.generatedContent.findFirst({
      where: { id: parsed.data.id, userId: user.id },
    })

    if (!content) return notFound('Not found')

    await prisma.generatedContent.update({
      where: { id: parsed.data.id },
      data: { isFavorite: parsed.data.isFavorite ?? !content.isFavorite },
    })

    return apiSuccess({ data: { updated: true } })
  } catch (error) {
    logger.error('Save PATCH error', { error: error instanceof Error ? error.message : String(error) })
    return serverError('Failed to update content')
  }
}
