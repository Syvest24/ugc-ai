import { NextRequest } from 'next/server'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'
import { apiSuccess, badRequest, conflict, rateLimited, serverError } from '@/lib/api-response'
import { logger } from '@/lib/logger'
import { rateLimit } from '@/lib/rate-limit'

const registerSchema = z.object({
  email: z.string().email().max(200),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
  name: z.string().min(1).max(100).optional(),
})

export async function POST(req: NextRequest) {
  const done = logger.apiRequest(req)
  try {
    // Rate limit: 5 registrations per IP per 15 minutes
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    if (!rateLimit(`register:${ip}`, 5, 15 * 60 * 1000)) {
      done(429)
      return rateLimited()
    }
    const body = await req.json()
    const parsed = registerSchema.safeParse(body)

    if (!parsed.success) {
      done(400)
      return badRequest('Invalid input', parsed.error.flatten().fieldErrors)
    }

    const { email, password, name } = parsed.data

    // Check if user already exists
    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    })

    if (existing) {
      done(409)
      return conflict('An account with this email already exists')
    }

    // Hash password with bcrypt (12 rounds)
    const passwordHash = await bcrypt.hash(password, 12)

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        name: name || email.split('@')[0],
        passwordHash,
      },
    })

    done(200)
    return apiSuccess({
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      },
    })
  } catch (error) {
    logger.error('Registration error', { error: error instanceof Error ? error.message : String(error) })
    done(500)
    return serverError('Registration failed')
  }
}
