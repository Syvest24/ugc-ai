import { prisma } from '@/lib/db'
import { renderQueue } from '@/lib/render-queue'

/**
 * Health Check Endpoint
 * 
 * Returns system status for monitoring, load balancers, and uptime checks.
 * This endpoint is public (no auth required).
 * 
 * GET /api/health
 * GET /api/health?details=true  (includes component breakdown)
 */

export async function GET(req: Request) {
  const url = new URL(req.url)
  const showDetails = url.searchParams.get('details') === 'true'
  const start = Date.now()

  const checks: Record<string, { status: 'ok' | 'degraded' | 'down'; latencyMs?: number; message?: string }> = {}

  // Database check
  try {
    const dbStart = Date.now()
    await prisma.$queryRawUnsafe('SELECT 1')
    checks.database = { status: 'ok', latencyMs: Date.now() - dbStart }
  } catch (error) {
    checks.database = {
      status: 'down',
      message: error instanceof Error ? error.message : 'Database unreachable',
    }
  }

  // Render queue status
  const queueStatus = renderQueue.getStatus()
  checks.renderQueue = {
    status: queueStatus.active >= queueStatus.maxConcurrent ? 'degraded' : 'ok',
    message: `${queueStatus.active}/${queueStatus.maxConcurrent} active, ${queueStatus.waiting} waiting`,
  }

  // Overall status
  const allOk = Object.values(checks).every(c => c.status === 'ok')
  const anyDown = Object.values(checks).some(c => c.status === 'down')
  const overallStatus = anyDown ? 'down' : allOk ? 'ok' : 'degraded'
  const httpStatus = anyDown ? 503 : 200

  const response: Record<string, unknown> = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    responseMs: Date.now() - start,
  }

  if (showDetails) {
    response.checks = checks
    response.version = process.env.npm_package_version || '1.0.0'
    response.nodeVersion = process.version
    response.memoryMB = Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
    response.renderQueue = {
      active: queueStatus.active,
      waiting: queueStatus.waiting,
      maxConcurrent: queueStatus.maxConcurrent,
      totalProcessed: queueStatus.totalProcessed,
      totalFailed: queueStatus.totalFailed,
    }
  }

  return Response.json(response, { status: httpStatus })
}
