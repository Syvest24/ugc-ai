import { auth } from '@/lib/auth'
import { prisma, ensureUser } from '@/lib/db'
import { apiSuccess, unauthorized, serverError } from '@/lib/api-response'
import { logger } from '@/lib/logger'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.email) return unauthorized()

    const user = await ensureUser(session.user.email, session.user.name)

    // Fetch all data in parallel — bounded queries
    const [contents, videos, usageRecords, calendarEvents, totalContentCount, totalVideoCount] = await Promise.all([
      prisma.generatedContent.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 500,
        select: {
          id: true,
          productName: true,
          platform: true,
          contentGoal: true,
          tone: true,
          isFavorite: true,
          createdAt: true,
        },
      }),
      prisma.video.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 500,
        select: {
          id: true,
          template: true,
          platform: true,
          status: true,
          durationMs: true,
          createdAt: true,
        },
      }),
      prisma.usageRecord.findMany({
        where: { userId: user.id },
        orderBy: { date: 'desc' },
        take: 30,
      }),
      prisma.calendarEvent.findMany({
        where: { userId: user.id },
        take: 1000,
        select: {
          id: true,
          platform: true,
          status: true,
          date: true,
        },
      }),
      prisma.generatedContent.count({ where: { userId: user.id } }),
      prisma.video.count({ where: { userId: user.id } }),
    ])

    // --- Overview stats ---
    const totalContent = totalContentCount
    const totalVideos = totalVideoCount
    const completedVideos = videos.filter((v: typeof videos[number]) => v.status === 'completed').length
    const favorites = contents.filter((c: typeof contents[number]) => c.isFavorite).length
    const scheduledPosts = calendarEvents.filter((e: typeof calendarEvents[number]) => e.status === 'scheduled').length
    const postedPosts = calendarEvents.filter((e: typeof calendarEvents[number]) => e.status === 'posted').length

    // --- Platform breakdown ---
    const platformCounts: Record<string, { content: number; videos: number; scheduled: number }> = {}
    for (const c of contents) {
      if (!platformCounts[c.platform]) platformCounts[c.platform] = { content: 0, videos: 0, scheduled: 0 }
      platformCounts[c.platform].content++
    }
    for (const v of videos) {
      if (!platformCounts[v.platform]) platformCounts[v.platform] = { content: 0, videos: 0, scheduled: 0 }
      platformCounts[v.platform].videos++
    }
    for (const e of calendarEvents) {
      if (!platformCounts[e.platform]) platformCounts[e.platform] = { content: 0, videos: 0, scheduled: 0 }
      platformCounts[e.platform].scheduled++
    }

    // --- Template usage ---
    const templateCounts: Record<string, number> = {}
    for (const v of videos) {
      templateCounts[v.template] = (templateCounts[v.template] || 0) + 1
    }

    // --- Content goal breakdown ---
    const goalCounts: Record<string, number> = {}
    for (const c of contents) {
      goalCounts[c.contentGoal] = (goalCounts[c.contentGoal] || 0) + 1
    }

    // --- Tone breakdown ---
    const toneCounts: Record<string, number> = {}
    for (const c of contents) {
      toneCounts[c.tone] = (toneCounts[c.tone] || 0) + 1
    }

    // --- Daily activity (last 30 days) ---
    const dailyActivity: { date: string; generations: number }[] = []
    const today = new Date()
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      const record = usageRecords.find((r: typeof usageRecords[number]) => r.date === dateStr)
      dailyActivity.push({
        date: dateStr,
        generations: record ? record.count : 0,
      })
    }

    // --- Recent activity feed ---
    type ActivityItem = { type: string; title: string; platform: string; date: string }
    const recentActivity: ActivityItem[] = []

    for (const c of contents.slice(0, 10)) {
      recentActivity.push({
        type: 'content',
        title: c.productName,
        platform: c.platform,
        date: (c.createdAt as Date).toISOString(),
      })
    }
    for (const v of videos.slice(0, 10)) {
      recentActivity.push({
        type: 'video',
        title: `${v.template} video (${v.status})`,
        platform: v.platform,
        date: (v.createdAt as Date).toISOString(),
      })
    }
    recentActivity.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    // --- Video render stats ---
    const totalRenderTimeMs = videos
      .filter((v: typeof videos[number]) => v.status === 'completed' && v.durationMs)
      .reduce((sum: number, v: typeof videos[number]) => sum + (v.durationMs || 0), 0)
    const failedVideos = videos.filter((v: typeof videos[number]) => v.status === 'failed').length

    return apiSuccess({
      data: {
        overview: {
          totalContent,
          totalVideos,
          completedVideos,
          failedVideos,
          favorites,
          scheduledPosts,
          postedPosts,
          totalRenderTimeMs,
        },
        platformBreakdown: Object.entries(platformCounts).map(([platform, counts]) => ({
          platform,
          ...counts,
        })),
        templateUsage: Object.entries(templateCounts)
          .map(([template, count]) => ({ template, count }))
          .sort((a, b) => b.count - a.count),
        contentGoals: Object.entries(goalCounts)
          .map(([goal, count]) => ({ goal, count }))
          .sort((a, b) => b.count - a.count),
        toneBreakdown: Object.entries(toneCounts)
          .map(([tone, count]) => ({ tone, count }))
          .sort((a, b) => b.count - a.count),
        dailyActivity,
        recentActivity: recentActivity.slice(0, 15),
      },
    })
  } catch (error) {
    logger.error('Analytics error', { error: error instanceof Error ? error.message : String(error) })
    return serverError('Failed to load analytics')
  }
}
