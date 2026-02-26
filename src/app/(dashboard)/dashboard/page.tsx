import { auth } from '@/lib/auth'
import Link from 'next/link'
import { PenSquare, BookMarked, Zap, TrendingUp, ArrowRight, Sparkles } from 'lucide-react'

export default async function DashboardPage() {
  const session = await auth()
  const name = session?.user?.name || session?.user?.email?.split('@')[0] || 'Creator'

  const stats = [
    { label: 'Content Generated', value: '–', icon: Zap, color: 'violet' },
    { label: 'Saved Items', value: '–', icon: BookMarked, color: 'pink' },
    { label: 'Platforms Used', value: '5', icon: TrendingUp, color: 'blue' },
  ]

  const quickActions = [
    { href: '/generate', label: 'Generate New Content', desc: 'Create hooks, scripts, captions & more', icon: PenSquare, primary: true },
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {stats.map(stat => {
          const Icon = stat.icon
          return (
            <div key={stat.label} className="bg-gray-900/60 border border-gray-800 rounded-xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-9 h-9 rounded-lg bg-${stat.color}-600/20 border border-${stat.color}-600/30 flex items-center justify-center`}>
                  <Icon className={`w-4 h-4 text-${stat.color}-400`} />
                </div>
              </div>
              <div className="text-2xl font-bold text-white mb-0.5">{stat.value}</div>
              <div className="text-sm text-gray-400">{stat.label}</div>
            </div>
          )
        })}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
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
