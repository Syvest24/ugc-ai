import { auth } from '@/lib/auth'
import { ensureUser, getUserStats } from '@/lib/db'
import Link from 'next/link'
import { PenSquare, BookMarked, Zap, TrendingUp, ArrowRight, Sparkles, Video, Film, ImageIcon } from 'lucide-react'
import type { Metadata } from 'next'
import OnboardingModal from '@/components/OnboardingModal'
import QuickGenerate from '@/components/QuickGenerate'

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
    violet: 'w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center shadow-lg shadow-violet-500/25',
    pink: 'w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-pink-600 flex items-center justify-center shadow-lg shadow-pink-500/25',
    blue: 'w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/25',
    emerald: 'w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/25',
  }
  const statIconTextColors: Record<string, string> = {
    violet: 'w-5 h-5 text-white',
    pink: 'w-5 h-5 text-white',
    blue: 'w-5 h-5 text-white',
    emerald: 'w-5 h-5 text-white',
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
    <div className="p-8 animate-fade-in">
      <OnboardingModal />
      {/* Welcome */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-1">Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-pink-400">{name}</span> \uD83D\uDC4B</h1>
        <p className="text-gray-400">Ready to create content that converts?</p>
      </div>

      {/* Quick Generate */}
      <QuickGenerate />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((stat, i) => {
          const Icon = stat.icon
          return (
            <div key={stat.label} className={`bg-gray-900/60 border border-gray-800 hover:border-gray-700 rounded-2xl p-5 card-interactive glow-hover animate-fade-in-up stagger-${i + 1}`} role="status" aria-label={`${stat.label}: ${stat.value}`}>
              <div className="flex items-center gap-3 mb-3">
                <div className={statIconColors[stat.color]}>
                  <Icon className={statIconTextColors[stat.color]} aria-hidden="true" />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-white mb-0.5">{stat.value}</div>
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
              className={`group p-6 rounded-2xl border transition-all card-interactive ${
                action.primary
                  ? 'bg-gradient-to-br from-violet-600/15 to-pink-600/5 border-violet-500/30 hover:border-violet-500/50 hover:shadow-lg hover:shadow-violet-500/10'
                  : 'bg-gray-900/60 border-gray-800 hover:border-gray-700'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${
                    action.primary ? 'bg-gradient-to-br from-violet-500 to-pink-500 shadow-lg shadow-violet-500/20' : 'bg-gray-800'
                  }`}>
                    <Icon className={`w-5 h-5 ${action.primary ? 'text-white' : 'text-gray-400'}`} aria-hidden="true" />
                  </div>
                  <h3 className="font-semibold text-white mb-1">{action.label}</h3>
                  <p className="text-sm text-gray-400">{action.desc}</p>
                </div>
                <ArrowRight className={`w-5 h-5 mt-1 transition-transform group-hover:translate-x-1 ${
                  action.primary ? 'text-violet-400' : 'text-gray-600'
                }`} aria-hidden="true" />
              </div>
            </Link>
          )
        })}
      </div>

      {/* Platforms */}
      <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-4 h-4 text-violet-400" aria-hidden="true" />
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
