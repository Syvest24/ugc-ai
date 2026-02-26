import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

// In-memory storage for demo (replace with Prisma in production)
const savedContent: Map<string, unknown[]> = new Map()

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const userId = session.user.id || session.user.email || 'anonymous'
  const content = savedContent.get(userId) || []
  return NextResponse.json({ content })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const userId = session.user.id || session.user.email || 'anonymous'
  const body = await req.json()
  const existing = savedContent.get(userId) || []
  const newItem = { ...body, id: crypto.randomUUID(), savedAt: new Date().toISOString() }
  savedContent.set(userId, [...existing, newItem])
  return NextResponse.json({ success: true, item: newItem })
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const userId = session.user.id || session.user.email || 'anonymous'
  const { id } = await req.json()
  const existing = savedContent.get(userId) || []
  savedContent.set(userId, (existing as { id: string }[]).filter((item) => item.id !== id))
  return NextResponse.json({ success: true })
}
