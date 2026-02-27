import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is required')
  }
  const adapter = new PrismaPg({ connectionString })
  return new PrismaClient({ adapter })
}

/**
 * Lazy-initialized Prisma client.
 * Only connects when first accessed, preventing crashes at module-load
 * time when DATABASE_URL isn't yet available (e.g. during Next.js page
 * pre-rendering at build time).
 */
function getPrismaClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient()
  }
  return globalForPrisma.prisma
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getPrismaClient()
    const value = (client as unknown as Record<string | symbol, unknown>)[prop]
    if (typeof value === 'function') {
      return value.bind(client)
    }
    return value
  },
})

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
