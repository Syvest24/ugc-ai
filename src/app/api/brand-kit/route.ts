import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { ensureUser, prisma } from '@/lib/db'
import { z } from 'zod'
import { apiSuccess, unauthorized, badRequest, serverError } from '@/lib/api-response'
import { logger } from '@/lib/logger'

const brandKitSchema = z.object({
  brandName: z.string().max(100).optional().nullable(),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#A855F7'),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#EC4899'),
  accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#3B82F6'),
  logoUrl: z.string().url().max(500).optional().nullable().or(z.literal('')).or(z.literal(null)),
  defaultVoice: z.string().max(50).default('jenny'),
  defaultTone: z.enum(['casual', 'bold', 'emotional', 'educational', 'storytelling']).default('casual'),
  defaultPlatform: z.enum(['tiktok', 'instagram', 'youtube_shorts', 'twitter_x', 'linkedin']).default('tiktok'),
  tagline: z.string().max(200).optional().nullable(),
})

// GET - Fetch user's brand kit
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.email) return unauthorized()

    const user = await ensureUser(session.user.email, session.user.name)
    const brandKit = await prisma.brandKit.findUnique({
      where: { userId: user.id },
    })

    if (!brandKit) {
      return apiSuccess({
        data: {
          exists: false,
          brandKit: {
            brandName: '',
            primaryColor: '#A855F7',
            secondaryColor: '#EC4899',
            accentColor: '#3B82F6',
            logoUrl: '',
            defaultVoice: 'jenny',
            defaultTone: 'casual',
            defaultPlatform: 'tiktok',
            tagline: '',
          },
        },
      })
    }

    return apiSuccess({ data: { exists: true, brandKit } })
  } catch (error) {
    logger.error('Brand kit fetch error', { error: error instanceof Error ? error.message : String(error) })
    return serverError('Failed to fetch brand kit')
  }
}

// POST/PUT - Create or update brand kit
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.email) return unauthorized()

    const user = await ensureUser(session.user.email, session.user.name)
    const body = await req.json()
    const parsed = brandKitSchema.safeParse(body)

    if (!parsed.success) return badRequest('Invalid input', parsed.error.flatten().fieldErrors)

    const data = {
      brandName: parsed.data.brandName || null,
      primaryColor: parsed.data.primaryColor,
      secondaryColor: parsed.data.secondaryColor,
      accentColor: parsed.data.accentColor,
      logoUrl: parsed.data.logoUrl || null,
      defaultVoice: parsed.data.defaultVoice,
      defaultTone: parsed.data.defaultTone,
      defaultPlatform: parsed.data.defaultPlatform,
      tagline: parsed.data.tagline || null,
    }

    const brandKit = await prisma.brandKit.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        ...data,
      },
      update: data,
    })

    return apiSuccess({ data: { brandKit } })
  } catch (error) {
    logger.error('Brand kit save error', { error: error instanceof Error ? error.message : String(error) })
    return serverError('Failed to save brand kit')
  }
}
