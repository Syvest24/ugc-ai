/**
 * Structured Request Logger
 * 
 * Lightweight JSON logger for API requests. Outputs structured logs
 * that can be piped to any log aggregator (Datadog, ELK, CloudWatch, etc.).
 * 
 * In development: pretty-prints to console.
 * In production: outputs compact JSON lines for machine parsing.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  // Request context
  method?: string
  path?: string
  status?: number
  durationMs?: number
  // User context
  userId?: string
  email?: string
  // Error context
  error?: string
  stack?: string
  // Arbitrary metadata
  [key: string]: unknown
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

const MIN_LEVEL = LOG_LEVELS[(process.env.LOG_LEVEL as LogLevel) || 'info'] ?? 1

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= MIN_LEVEL
}

function formatLog(entry: LogEntry): string {
  if (process.env.NODE_ENV === 'production') {
    return JSON.stringify(entry)
  }

  // Dev: colorized, human-readable
  const colors: Record<LogLevel, string> = {
    debug: '\x1b[36m', // cyan
    info: '\x1b[32m',  // green
    warn: '\x1b[33m',  // yellow
    error: '\x1b[31m', // red
  }
  const reset = '\x1b[0m'
  const color = colors[entry.level]

  const meta: Record<string, unknown> = { ...entry }
  delete meta.timestamp
  delete meta.level
  delete meta.message
  delete meta.method
  delete meta.path
  delete meta.status
  delete meta.durationMs

  const route = entry.method && entry.path ? ` ${entry.method} ${entry.path}` : ''
  const status = entry.status ? ` → ${entry.status}` : ''
  const duration = entry.durationMs !== undefined ? ` (${entry.durationMs}ms)` : ''
  const extras = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : ''

  return `${color}[${entry.level.toUpperCase()}]${reset} ${entry.timestamp}${route}${status}${duration} ${entry.message}${extras}`
}

function log(level: LogLevel, message: string, data?: Record<string, unknown>) {
  if (!shouldLog(level)) return

  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...data,
  }

  const output = formatLog(entry)

  switch (level) {
    case 'error':
      console.error(output)
      break
    case 'warn':
      console.warn(output)
      break
    default:
      console.log(output)
  }
}

export const logger = {
  debug: (message: string, data?: Record<string, unknown>) => log('debug', message, data),
  info: (message: string, data?: Record<string, unknown>) => log('info', message, data),
  warn: (message: string, data?: Record<string, unknown>) => log('warn', message, data),
  error: (message: string, data?: Record<string, unknown>) => log('error', message, data),

  /**
   * Create a request-scoped logger that auto-includes method/path context.
   * Usage:
   *   const reqLog = logger.forRequest(req)
   *   reqLog.info('Processing started')
   *   reqLog.info('Done', { status: 200, durationMs: 42 })
   */
  forRequest: (req: { method: string; url: string }, extra?: Record<string, unknown>) => {
    const url = new URL(req.url)
    const context = {
      method: req.method,
      path: url.pathname,
      ...extra,
    }

    return {
      debug: (message: string, data?: Record<string, unknown>) =>
        log('debug', message, { ...context, ...data }),
      info: (message: string, data?: Record<string, unknown>) =>
        log('info', message, { ...context, ...data }),
      warn: (message: string, data?: Record<string, unknown>) =>
        log('warn', message, { ...context, ...data }),
      error: (message: string, data?: Record<string, unknown>) =>
        log('error', message, { ...context, ...data }),
    }
  },

  /**
   * Log an API request lifecycle (start + end).
   * Returns a function to call when the request completes.
   */
  apiRequest: (req: { method: string; url: string }, userId?: string) => {
    const start = Date.now()
    const url = new URL(req.url)
    const context = {
      method: req.method,
      path: url.pathname,
      userId,
    }

    log('info', 'Request started', context)

    return (status: number, extra?: Record<string, unknown>) => {
      log('info', 'Request completed', {
        ...context,
        status,
        durationMs: Date.now() - start,
        ...extra,
      })
    }
  },
}
