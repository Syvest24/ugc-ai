import { PrismaClient } from '@prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import path from 'path'

const dbUrl = 'file:' + path.join(process.cwd(), 'dev.db')

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  const adapter = new PrismaBetterSqlite3({ url: dbUrl })
  return new PrismaClient({ adapter })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Get or verify user from DB — never creates users (registration-only)
export async function ensureUser(email: string, name?: string | null) {
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    throw new Error(`User not found: ${email}`)
  }
  // Update name if provided and different
  if (name && name !== user.name) {
    return prisma.user.update({ where: { email }, data: { name } })
  }
  return user
}

// Get user by email
export async function getUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email } })
}

// Track usage
export async function trackUsage(userId: string) {
  const date = new Date().toISOString().split('T')[0]
  return prisma.usageRecord.upsert({
    where: { userId_date: { userId, date } },
    update: { count: { increment: 1 } },
    create: { userId, date, count: 1 },
  })
}

// Get user stats
export async function getUserStats(userId: string) {
  const [contentCount, videoCount, savedCount, imageCount, usageRecords] = await Promise.all([
    prisma.generatedContent.count({ where: { userId } }),
    prisma.video.count({ where: { userId, status: 'completed' } }),
    prisma.generatedContent.count({ where: { userId, isFavorite: true } }),
    prisma.generatedImage.count({ where: { userId } }),
    prisma.usageRecord.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
      take: 30,
    }),
  ])

  const platformsUsed = await prisma.generatedContent.findMany({
    where: { userId },
    select: { platform: true },
    distinct: ['platform'],
  })

  const totalUsage = usageRecords.reduce((sum: number, r: { count: number }) => sum + r.count, 0)

  return {
    contentGenerated: contentCount,
    videosCreated: videoCount,
    savedItems: savedCount,
    imagesGenerated: imageCount,
    platformsUsed: platformsUsed.length,
    totalUsage,
    recentUsage: usageRecords,
  }
}
