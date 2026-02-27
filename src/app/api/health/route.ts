import { renderQueue } from '@/lib/render-queue'

/**
 * Health Check Endpoint
 * 
 * Returns system status for monitoring, load balancers, and uptime checks.
 * This endpoint is public (no auth required).
 * 
 * GET /api/health              → always 200 (for Railway healthcheck)
 * GET /api/health?details=true → includes DB + component checks (may 503)
 */

export async function GET(req: Request) {
  const url = new URL(req.url)
  const showDetails = url.searchParams.get('details') === 'true'
  const start = Date.now()

  // Basic healthcheck — always return 200 so Railway knows the process is alive
  if (!showDetails) {
    return Response.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      responseMs: Date.now() - start,
    })
  }

  // Detailed healthcheck — includes DB connectivity
  const checks: Record<string, { status: 'ok' | 'degraded' | 'down'; latencyMs?: number; message?: string }> = {}

  // Database check (lazy import to avoid crashing when DATABASE_URL is missing)
  try {
    const { prisma } = await import('@/lib/db')
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

  return Response.json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    responseMs: Date.now() - start,
    checks,
    version: process.env.npm_package_version || '1.0.0',
    nodeVersion: process.version,
    memoryMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
    renderQueue: {
      active: queueStatus.active,
      waiting: queueStatus.waiting,
      maxConcurrent: queueStatus.maxConcurrent,
      totalProcessed: queueStatus.totalProcessed,
      totalFailed: queueStatus.totalFailed,
    },
  }, { status: httpStatus })
}
