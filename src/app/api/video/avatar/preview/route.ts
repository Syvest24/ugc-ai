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

  let localPath: string
  try {
    localPath = await fetchAvatarFace(preset.prompt, preset.seed)
  } catch {
    // Return a simple SVG placeholder when AI generation fails
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><rect width="512" height="512" fill="#374151"/><circle cx="256" cy="200" r="80" fill="#9CA3AF"/><ellipse cx="256" cy="420" rx="130" ry="100" fill="#9CA3AF"/></svg>`
    return new NextResponse(svg, {
      status: 200,
      headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=60' },
    })
  }

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
