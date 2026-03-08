import { NextRequest, NextResponse } from 'next/server'
import { AVATAR_PRESETS, fetchAvatarFace } from '@/lib/avatar'

/**
 * GET /api/video/avatar/preview?preset=ai-woman-1
 *
 * Fetches and serves the AI face image for a given preset.
 * Uses a fixed seed per preset so the thumbnail is stable/cacheable.
 */
export async function GET(req: NextRequest) {
  const presetId = req.nextUrl.searchParams.get('preset')
  if (!presetId) {
    return NextResponse.json({ error: 'Missing preset parameter' }, { status: 400 })
  }

  const preset = AVATAR_PRESETS.find(p => p.id === presetId)
  if (!preset) {
    return NextResponse.json({ error: `Unknown preset: ${presetId}` }, { status: 404 })
  }

  const localPath = await fetchAvatarFace(preset.prompt, preset.seed)

  // If it's a data URI (placeholder or serverless), redirect to it directly
  // Otherwise, redirect to the local file path
  if (localPath.startsWith('data:')) {
    return NextResponse.redirect(localPath, { status: 302 })
  }

  const baseUrl = req.nextUrl.origin
  return NextResponse.redirect(`${baseUrl}${localPath}`, {
    status: 302,
    headers: {
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  })
}
