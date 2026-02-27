import { auth } from '@/lib/auth'
import { ensureUser, getUserStats } from '@/lib/db'
import Link from 'next/link'
import { PenSquare, BookMarked, Zap, TrendingUp, ArrowRight, Sparkles, Video, Film, ImageIcon } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Dashboard' }

export default async function DashboardPage() {
  const session = await auth()
  const name = session?.user?.name || session?.user?.email?.split('@')[0] || 'Creator'

  // Fetch real stats from DB
  let stats = { contentGenerated: 0, videosCreated: 0, savedItems: 0, imagesGenerated: 0, platformsUsed: 0, totalUsage: 0, recentUsage: [] as { count: number }[] }
  if (session?.user?.email) {
    try {
      const user = await ensureUser(session.user.email, session.user.name)
      stats = await getUserStats(user.id)
    } catch {
      // DB might not be migrated yet
    }
  }

  const statIconColors: Record<string, string> = {
    violet: 'w-9 h-9 rounded-lg bg-violet-600/20 border border-violet-600/30 flex items-center justify-center',
    pink: 'w-9 h-9 rounded-lg bg-pink-600/20 border border-pink-600/30 flex items-center justify-center',
    blue: 'w-9 h-9 rounded-lg bg-blue-600/20 border border-blue-600/30 flex items-center justify-center',
    emerald: 'w-9 h-9 rounded-lg bg-emerald-600/20 border border-emerald-600/30 flex items-center justify-center',
  }
  const statIconTextColors: Record<string, string> = {
    violet: 'w-4 h-4 text-violet-400',
    pink: 'w-4 h-4 text-pink-400',
    blue: 'w-4 h-4 text-blue-400',
    emerald: 'w-4 h-4 text-emerald-400',
  }
  const statCards = [
    { label: 'Content Generated', value: stats.contentGenerated.toString(), icon: Zap, color: 'violet' },
    { label: 'Videos Created', value: stats.videosCreated.toString(), icon: Film, color: 'pink' },
    { label: 'AI Images', value: stats.imagesGenerated.toString(), icon: ImageIcon, color: 'emerald' },
    { label: 'Saved Items', value: stats.savedItems.toString(), icon: BookMarked, color: 'blue' },
  ]

  const quickActions = [
    { href: '/generate', label: 'Generate New Content', desc: 'Create hooks, scripts, captions & more', icon: PenSquare, primary: true },
    { href: '/video', label: 'Create Video', desc: 'Turn scripts into downloadable UGC videos', icon: Video, primary: true },
    { href: '/images', label: 'AI Images', desc: 'Generate stunning images with AI', icon: ImageIcon, primary: true },
    { href: '/saved', label: 'View Saved Content', desc: 'Browse your saved generations', icon: BookMarked, primary: false },
  ]

  return (
    <div className="p-8">
      {/* Welcome */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-1">Welcome back, {name} 👋</h1>
        <p className="text-gray-400">Ready to create content that converts?</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map(stat => {
          const Icon = stat.icon
          return (
            <div key={stat.label} className="bg-gray-900/60 border border-gray-800 rounded-xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className={statIconColors[stat.color]}>
                  <Icon className={statIconTextColors[stat.color]} />
                </div>
              </div>
              <div className="text-2xl font-bold text-white mb-0.5">{stat.value}</div>
              <div className="text-sm text-gray-400">{stat.label}</div>
            </div>
          )
        })}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {quickActions.map(action => {
          const Icon = action.icon
          return (
            <Link
              key={action.href}
              href={action.href}
              className={`group p-6 rounded-xl border transition-all ${
                action.primary
                  ? 'bg-violet-600/10 border-violet-600/40 hover:bg-violet-600/20'
                  : 'bg-gray-900/60 border-gray-800 hover:border-gray-700'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-4 ${
                    action.primary ? 'bg-violet-600' : 'bg-gray-800'
                  }`}>
                    <Icon className={`w-5 h-5 ${action.primary ? 'text-white' : 'text-gray-400'}`} />
                  </div>
                  <h3 className="font-semibold text-white mb-1">{action.label}</h3>
                  <p className="text-sm text-gray-400">{action.desc}</p>
                </div>
                <ArrowRight className={`w-5 h-5 mt-1 transition-transform group-hover:translate-x-1 ${
                  action.primary ? 'text-violet-400' : 'text-gray-600'
                }`} />
              </div>
            </Link>
          )
        })}
      </div>

      {/* Platforms */}
      <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-4 h-4 text-violet-400" />
          <h2 className="font-semibold text-white">Supported Platforms</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {['TikTok', 'Instagram', 'YouTube Shorts', 'Twitter/X', 'LinkedIn'].map(platform => (
            <span key={platform} className="bg-gray-800 text-gray-300 text-xs font-medium px-3 py-1.5 rounded-full border border-gray-700">
              {platform}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
