import { NextRequest, NextResponse } from 'next/server'
import { AVATAR_PRESETS, generateAvatarFaceUrl } from '@/lib/avatar'

/**
 * GET /api/video/avatar/preview?preset=ai-woman-1
 *
 * Redirects to the Pollinations AI face URL for a given preset.
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

  const faceUrl = generateAvatarFaceUrl(preset.prompt, preset.seed)

  // Redirect to Pollinations — browser/img tag will follow the redirect.
  // Cache the redirect for 24 hours so thumbnails are fast after first load.
  return NextResponse.redirect(faceUrl, {
    status: 302,
    headers: {
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  })
}
