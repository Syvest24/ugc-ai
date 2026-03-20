import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { rateLimit } from '@/lib/rate-limit'
import { isR2Configured, uploadToR2 } from '@/lib/r2'
import { apiSuccess, unauthorized, rateLimited, badRequest, serverError } from '@/lib/api-response'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import crypto from 'crypto'

const IS_SERVERLESS = !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME || !!process.env.RAILWAY_ENVIRONMENT
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.email) return unauthorized()

    if (!rateLimit(`avatar-upload:${session.user.email}`, 20, 60 * 60 * 1000)) {
      return rateLimited()
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) return badRequest('No file provided')
    if (!ALLOWED_TYPES.includes(file.type)) {
      return badRequest('Invalid file type. Use JPG, PNG, or WebP.')
    }
    if (file.size > MAX_FILE_SIZE) {
      return badRequest('File too large. Maximum 10 MB.')
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
    const filename = `avatar_${crypto.randomUUID().slice(0, 8)}.${ext}`

    let imageUrl: string

    if (isR2Configured) {
      imageUrl = await uploadToR2(`avatars/${filename}`, buffer)
    } else {
      const dir = IS_SERVERLESS
        ? path.join('/tmp', 'generated', 'avatar')
        : path.join(process.cwd(), 'public', 'generated', 'avatar')

      if (!existsSync(dir)) await mkdir(dir, { recursive: true })
      await writeFile(path.join(dir, filename), buffer)

      imageUrl = IS_SERVERLESS
        ? `/api/generated/avatar/${filename}`
        : `/generated/avatar/${filename}`
    }

    return apiSuccess({ data: { imageUrl } })
  } catch (err) {
    console.error('[avatar/upload] Error:', err)
    return serverError(err instanceof Error ? err.message : 'Upload failed')
  }
}
