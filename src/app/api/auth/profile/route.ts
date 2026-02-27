import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma, ensureUser } from '@/lib/db'
import { z } from 'zod'
import { apiSuccess, unauthorized, badRequest, serverError } from '@/lib/api-response'
import { logger } from '@/lib/logger'
import bcrypt from 'bcryptjs'

const updateProfileSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100).optional(),
  currentPassword: z.string().min(1).optional(),
  newPassword: z.string().min(8, 'Password must be at least 8 characters').max(128).optional(),
}).refine(data => {
  // If changing password, both fields are required
  if (data.newPassword && !data.currentPassword) return false
  if (data.currentPassword && !data.newPassword) return false
  return true
}, { message: 'Both current and new password are required to change password' })

// GET /api/auth/profile — return current user info
export async function GET(req: NextRequest) {
  let done = (_status: number, _extra?: Record<string, unknown>) => {}
  try {
    const session = await auth()
    if (!session?.user?.email) return unauthorized()
    done = logger.apiRequest(req, session?.user?.email)

    const user = await ensureUser(session.user.email, session.user.name)

    done(200)
    return apiSuccess({
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
      },
    })
  } catch (error) {
    logger.error('Profile GET error', { error: error instanceof Error ? error.message : String(error) })
    done(500)
    return serverError('Failed to load profile')
  }
}

// PATCH /api/auth/profile — update name and/or password
export async function PATCH(req: NextRequest) {
  let done = (_status: number, _extra?: Record<string, unknown>) => {}
  try {
    const session = await auth()
    if (!session?.user?.email) return unauthorized()
    done = logger.apiRequest(req, session?.user?.email)

    const body = await req.json()
    const parsed = updateProfileSchema.safeParse(body)
    if (!parsed.success) {
      done(400)
      return badRequest('Invalid input', parsed.error.flatten().fieldErrors)
    }

    const user = await ensureUser(session.user.email, session.user.name)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {}

    // Update name
    if (parsed.data.name !== undefined) {
      updateData.name = parsed.data.name
    }

    // Update password
    if (parsed.data.currentPassword && parsed.data.newPassword) {
      if (!user.passwordHash) {
        done(400)
        return badRequest('No password set for this account')
      }

      const valid = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash)
      if (!valid) {
        done(400)
        return badRequest('Current password is incorrect')
      }

      updateData.passwordHash = await bcrypt.hash(parsed.data.newPassword, 12)
    }

    if (Object.keys(updateData).length === 0) {
      done(400)
      return badRequest('No changes provided')
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: updateData,
    })

    done(200)
    return apiSuccess({
      data: {
        id: updated.id,
        email: updated.email,
        name: updated.name,
      },
      meta: { message: 'Profile updated successfully' },
    })
  } catch (error) {
    logger.error('Profile PATCH error', { error: error instanceof Error ? error.message : String(error) })
    done(500)
    return serverError('Failed to update profile')
  }
}
