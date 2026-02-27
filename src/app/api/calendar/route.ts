import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { ensureUser, prisma } from '@/lib/db'
import { z } from 'zod'
import { apiSuccess, unauthorized, badRequest, notFound, serverError } from '@/lib/api-response'
import { parseJsonField } from '@/lib/json-field'
import { logger } from '@/lib/logger'

const VALID_PLATFORMS = ['tiktok', 'instagram', 'youtube_shorts', 'twitter_x', 'linkedin'] as const
const VALID_STATUSES = ['scheduled', 'posted', 'missed'] as const

const createEventSchema = z.object({
  title: z.string().min(1).max(200),
  platform: z.enum(VALID_PLATFORMS),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  time: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be HH:mm').optional().nullable(),
  contentId: z.string().max(100).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().nullable(),
})

const updateEventSchema = z.object({
  id: z.string().min(1).max(100),
  title: z.string().min(1).max(200).optional(),
  platform: z.enum(VALID_PLATFORMS).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  time: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  status: z.enum(VALID_STATUSES).optional(),
  notes: z.string().max(1000).optional().nullable(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().nullable(),
  contentId: z.string().max(100).optional().nullable(),
})

// GET - fetch calendar events for a date range
export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.email) return unauthorized()

    const user = await ensureUser(session.user.email, session.user.name)
    const { searchParams } = new URL(req.url)
    const month = searchParams.get('month') // YYYY-MM format
    const year = searchParams.get('year')

    let dateFilter: { gte?: string; lte?: string } | undefined

    if (month) {
      dateFilter = {
        gte: `${month}-01`,
        lte: `${month}-31`,
      }
    } else if (year) {
      dateFilter = {
        gte: `${year}-01-01`,
        lte: `${year}-12-31`,
      }
    }

    const events = await prisma.calendarEvent.findMany({
      where: {
        userId: user.id,
        ...(dateFilter ? { date: dateFilter } : {}),
      },
      include: {
        content: {
          select: {
            id: true,
            productName: true,
            platform: true,
            hookBank: true,
          },
        },
      },
      orderBy: [{ date: 'asc' }, { time: 'asc' }],
    })

    const parsed = events.map((e: typeof events[number]) => ({
      ...e,
      content: e.content
        ? {
            ...e.content,
            hookBank: parseJsonField<string[]>(e.content.hookBank, []),
          }
        : null,
    }))

    return apiSuccess({ data: { events: parsed } })
  } catch (error) {
    logger.error('Calendar GET error', { error: error instanceof Error ? error.message : String(error) })
    return serverError('Failed to load calendar')
  }
}

// POST - create a new calendar event
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.email) return unauthorized()

    const user = await ensureUser(session.user.email, session.user.name)
    const body = await req.json()
    const parsed = createEventSchema.safeParse(body)

    if (!parsed.success) return badRequest('Invalid input', parsed.error.flatten().fieldErrors)

    const { title, platform, date, time, contentId, notes, color } = parsed.data

    const event = await prisma.calendarEvent.create({
      data: {
        userId: user.id,
        contentId: contentId || null,
        title,
        platform,
        date,
        time: time || null,
        notes: notes || null,
        color: color || null,
      },
    })

    return apiSuccess({ data: { event } })
  } catch (error) {
    logger.error('Calendar POST error', { error: error instanceof Error ? error.message : String(error) })
    return serverError('Failed to create event')
  }
}

// PATCH - update a calendar event
export async function PATCH(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.email) return unauthorized()

    const user = await ensureUser(session.user.email, session.user.name)
    const body = await req.json()
    const parsed = updateEventSchema.safeParse(body)

    if (!parsed.success) return badRequest('Invalid input', parsed.error.flatten().fieldErrors)

    const { id, ...updates } = parsed.data

    const existing = await prisma.calendarEvent.findFirst({
      where: { id, userId: user.id },
    })

    if (!existing) return notFound('Event not found')

    const event = await prisma.calendarEvent.update({
      where: { id },
      data: {
        ...(updates.title !== undefined ? { title: updates.title } : {}),
        ...(updates.platform !== undefined ? { platform: updates.platform } : {}),
        ...(updates.date !== undefined ? { date: updates.date } : {}),
        ...(updates.time !== undefined ? { time: updates.time } : {}),
        ...(updates.status !== undefined ? { status: updates.status } : {}),
        ...(updates.notes !== undefined ? { notes: updates.notes } : {}),
        ...(updates.color !== undefined ? { color: updates.color } : {}),
        ...(updates.contentId !== undefined ? { contentId: updates.contentId } : {}),
      },
    })

    return apiSuccess({ data: { event } })
  } catch (error) {
    logger.error('Calendar PATCH error', { error: error instanceof Error ? error.message : String(error) })
    return serverError('Failed to update event')
  }
}

// DELETE - remove a calendar event
export async function DELETE(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.email) return unauthorized()

    const user = await ensureUser(session.user.email, session.user.name)
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) return badRequest('Event ID is required')

    const existing = await prisma.calendarEvent.findFirst({
      where: { id, userId: user.id },
    })

    if (!existing) return notFound('Event not found')

    await prisma.calendarEvent.delete({ where: { id } })

    return apiSuccess({ data: { deleted: true } })
  } catch (error) {
    logger.error('Calendar DELETE error', { error: error instanceof Error ? error.message : String(error) })
    return serverError('Failed to delete event')
  }
}
