import { auth } from '@/lib/auth'
import { ensureUser, getUserStats } from '@/lib/db'
import { apiSuccess, unauthorized, serverError } from '@/lib/api-response'
import { logger } from '@/lib/logger'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.email) return unauthorized()

    const user = await ensureUser(session.user.email, session.user.name)
    const stats = await getUserStats(user.id)

    return apiSuccess({ data: stats })
  } catch (error) {
    logger.error('Stats error', { error: error instanceof Error ? error.message : String(error) })
    return serverError('Failed to load stats')
  }
}
