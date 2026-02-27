'use client'
import { useState, useEffect } from 'react'
import {
  BarChart3,
  TrendingUp,
  Video,
  FileText,
  Star,
  Calendar,
  Clock,
  Zap,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react'
import { PLATFORM_COLORS, PLATFORM_LABELS, TEMPLATE_LABELS } from '@/lib/constants'

interface AnalyticsData {
  overview: {
    totalContent: number
    totalVideos: number
    completedVideos: number
    failedVideos: number
    favorites: number
    scheduledPosts: number
    postedPosts: number
    totalRenderTimeMs: number
  }
  platformBreakdown: { platform: string; content: number; videos: number; scheduled: number }[]
  templateUsage: { template: string; count: number }[]
  contentGoals: { goal: string; count: number }[]
  toneBreakdown: { tone: string; count: number }[]
  dailyActivity: { date: string; generations: number }[]
  recentActivity: { type: string; title: string; platform: string; date: string }[]
}

function StatCard({ icon, label, value, sub, color }: {
  icon: React.ReactNode
  label: string
  value: string | number
  sub?: string
  color?: string
}) {
  return (
    <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color || '#A855F7'}20` }}>
          {icon}
        </div>
        <span className="text-xs text-gray-400 uppercase tracking-wide">{label}</span>
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  )
}

function BarChart({ data, labelKey, valueKey, color }: {
  data: Record<string, unknown>[]
  labelKey: string
  valueKey: string
  color?: string
}) {
  const max = Math.max(...data.map(d => Number(d[valueKey]) || 0), 1)
  return (
    <div className="space-y-2">
      {data.map((item, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="w-28 text-xs text-gray-400 truncate text-right">{String(item[labelKey])}</div>
          <div className="flex-1 h-6 bg-gray-800/60 rounded-md overflow-hidden relative">
            <div
              className="h-full rounded-md transition-all duration-500"
              style={{
                width: `${(Number(item[valueKey]) / max) * 100}%`,
                background: color || '#A855F7',
                minWidth: Number(item[valueKey]) > 0 ? '8px' : '0',
              }}
            />
            <span className="absolute right-2 top-0 h-full flex items-center text-xs text-gray-300 font-medium">
              {Number(item[valueKey])}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

function MiniChart({ data }: { data: { date: string; generations: number }[] }) {
  const max = Math.max(...data.map(d => d.generations), 1)
  const barWidth = 100 / data.length
  return (
    <div className="h-32 flex items-end gap-[2px]">
      {data.map((d, i) => {
        const height = (d.generations / max) * 100
        const isToday = i === data.length - 1
        return (
          <div
            key={d.date}
            className="group relative flex-1"
            style={{ minWidth: `${barWidth}%` }}
          >
            <div
              className={`w-full rounded-t transition-all ${isToday ? 'bg-violet-500' : 'bg-violet-500/40 hover:bg-violet-500/60'}`}
              style={{ height: `${Math.max(height, 2)}%` }}
            />
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10">
              <div className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white whitespace-nowrap shadow-lg">
                {d.date.slice(5)}: {d.generations}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/analytics')
      .then(res => res.json())
      .then(d => {
        if (!d.error && d.data) setData(d.data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Loading analytics...</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="p-8">
        <p className="text-gray-400">Failed to load analytics data.</p>
      </div>
    )
  }

  const { overview } = data
  const totalGeneratedTime = overview.totalRenderTimeMs
    ? `${Math.round(overview.totalRenderTimeMs / 1000)}s total`
    : 'No renders yet'

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <BarChart3 className="w-8 h-8 text-violet-400" />
          Analytics Dashboard
        </h1>
        <p className="text-gray-400 mt-1">Track your content creation journey</p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={<FileText className="w-4 h-4 text-violet-400" />}
          label="Content Generated"
          value={overview.totalContent}
          color="#A855F7"
        />
        <StatCard
          icon={<Video className="w-4 h-4 text-emerald-400" />}
          label="Videos Rendered"
          value={overview.completedVideos}
          sub={overview.failedVideos > 0 ? `${overview.failedVideos} failed` : undefined}
          color="#10B981"
        />
        <StatCard
          icon={<Star className="w-4 h-4 text-amber-400" />}
          label="Favorites"
          value={overview.favorites}
          color="#F59E0B"
        />
        <StatCard
          icon={<Calendar className="w-4 h-4 text-blue-400" />}
          label="Scheduled"
          value={overview.scheduledPosts}
          sub={overview.postedPosts > 0 ? `${overview.postedPosts} posted` : undefined}
          color="#3B82F6"
        />
      </div>

      {/* Daily Activity Chart */}
      <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-violet-400" />
            Daily Activity (Last 30 Days)
          </h2>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Clock className="w-3 h-3" />
            {totalGeneratedTime}
          </div>
        </div>
        <MiniChart data={data.dailyActivity} />
        <div className="flex justify-between mt-2 text-[10px] text-gray-600">
          <span>{data.dailyActivity[0]?.date.slice(5)}</span>
          <span>Today</span>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Platform Breakdown */}
        <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Platform Breakdown</h2>
          {data.platformBreakdown.length > 0 ? (
            <div className="space-y-4">
              {data.platformBreakdown.map(p => {
                const total = p.content + p.videos + p.scheduled
                const color = PLATFORM_COLORS[p.platform] || '#A855F7'
                return (
                  <div key={p.platform}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-200">
                        {PLATFORM_LABELS[p.platform] || p.platform}
                      </span>
                      <span className="text-xs text-gray-500">{total} total</span>
                    </div>
                    <div className="flex gap-1 h-5">
                      {p.content > 0 && (
                        <div
                          className="rounded-l flex items-center justify-center text-[10px] text-white font-medium"
                          style={{
                            width: `${(p.content / total) * 100}%`,
                            background: color,
                            minWidth: '20px',
                          }}
                        >
                          {p.content}
                        </div>
                      )}
                      {p.videos > 0 && (
                        <div
                          className="flex items-center justify-center text-[10px] text-white font-medium"
                          style={{
                            width: `${(p.videos / total) * 100}%`,
                            background: `${color}99`,
                            minWidth: '20px',
                          }}
                        >
                          {p.videos}
                        </div>
                      )}
                      {p.scheduled > 0 && (
                        <div
                          className="rounded-r flex items-center justify-center text-[10px] text-white font-medium"
                          style={{
                            width: `${(p.scheduled / total) * 100}%`,
                            background: `${color}55`,
                            minWidth: '20px',
                          }}
                        >
                          {p.scheduled}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
              <div className="flex gap-4 text-[10px] text-gray-500 mt-2 pt-2 border-t border-gray-800">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-violet-500" /> Content</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-violet-500/60" /> Videos</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-violet-500/30" /> Scheduled</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">No data yet. Start generating content!</p>
          )}
        </div>

        {/* Template Usage */}
        <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Video Templates Used</h2>
          {data.templateUsage.length > 0 ? (
            <BarChart
              data={data.templateUsage.map(t => ({
                label: TEMPLATE_LABELS[t.template] || t.template,
                count: t.count,
              }))}
              labelKey="label"
              valueKey="count"
              color="#10B981"
            />
          ) : (
            <p className="text-sm text-gray-500">No videos rendered yet.</p>
          )}
        </div>
      </div>

      {/* Second two-column row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Content Goals */}
        <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Content Goals</h2>
          {data.contentGoals.length > 0 ? (
            <BarChart
              data={data.contentGoals}
              labelKey="goal"
              valueKey="count"
              color="#F59E0B"
            />
          ) : (
            <p className="text-sm text-gray-500">No content generated yet.</p>
          )}
        </div>

        {/* Tone Breakdown */}
        <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Tone Distribution</h2>
          {data.toneBreakdown.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {data.toneBreakdown.map(t => {
                const maxCount = data.toneBreakdown[0]?.count || 1
                const intensity = 0.2 + (t.count / maxCount) * 0.8
                return (
                  <div
                    key={t.tone}
                    className="rounded-lg px-3 py-2 border border-gray-700"
                    style={{ background: `rgba(168, 85, 247, ${intensity * 0.2})` }}
                  >
                    <div className="text-sm font-medium text-white capitalize">{t.tone}</div>
                    <div className="text-xs text-gray-400">{t.count} uses</div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No content generated yet.</p>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-400" />
          Recent Activity
        </h2>
        {data.recentActivity.length > 0 ? (
          <div className="space-y-2">
            {data.recentActivity.map((item, i) => {
              const icon = item.type === 'content'
                ? <FileText className="w-4 h-4 text-violet-400" />
                : <Video className="w-4 h-4 text-emerald-400" />
              const platformColor = PLATFORM_COLORS[item.platform] || '#A855F7'
              const timeAgo = getTimeAgo(item.date)

              return (
                <div key={i} className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-gray-800/40 transition-colors">
                  {icon}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-200 truncate">{item.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded-full text-white"
                        style={{ background: platformColor }}
                      >
                        {PLATFORM_LABELS[item.platform] || item.platform}
                      </span>
                      <span className="text-[10px] text-gray-500">{timeAgo}</span>
                    </div>
                  </div>
                  {item.type === 'video' && item.title.includes('completed') && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  )}
                  {item.type === 'video' && item.title.includes('failed') && (
                    <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No activity yet. Generate some content to get started!</p>
        )}
      </div>
    </div>
  )
}

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days}d ago`
  return `${Math.floor(days / 7)}w ago`
}
