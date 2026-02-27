'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { Trash2, Download, ExternalLink, BookMarked, Video, Search, X, Filter, ChevronDown, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import Link from 'next/link'
import type { GeneratedOutput } from '@/types'
import OutputSection from '@/components/OutputSection'
import { PLATFORM_LABELS, CONTENT_GOAL_LABELS } from '@/lib/constants'

interface SavedItem {
  id: string
  productName: string
  platform: string
  contentGoal: string
  tone: string
  output: GeneratedOutput
  savedAt: string
}

const platformLabels = PLATFORM_LABELS
const goalLabels = CONTENT_GOAL_LABELS

const PAGE_SIZE = 20

export default function SavedPage() {
  const router = useRouter()
  const [items, setItems] = useState<SavedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)

  // Filters
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [platformFilter, setPlatformFilter] = useState('')
  const [goalFilter, setGoalFilter] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  // Debounce search input
  useEffect(() => {
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), 400)
    return () => clearTimeout(debounceRef.current)
  }, [search])

  const buildUrl = useCallback((p: number) => {
    const params = new URLSearchParams()
    params.set('page', String(p))
    params.set('limit', String(PAGE_SIZE))
    if (debouncedSearch) params.set('search', debouncedSearch)
    if (platformFilter) params.set('platform', platformFilter)
    if (goalFilter) params.set('contentGoal', goalFilter)
    return `/api/save?${params}`
  }, [debouncedSearch, platformFilter, goalFilter])

  // Fetch first page when filters change
  useEffect(() => {
    setLoading(true)
    setPage(1)
    fetch(buildUrl(1))
      .then(r => r.json())
      .then(data => {
        setItems(data.data?.content || [])
        setTotal(data.meta?.total || 0)
      })
      .catch(() => toast.error('Failed to load saved content'))
      .finally(() => setLoading(false))
  }, [buildUrl])

  const loadMore = async () => {
    const nextPage = page + 1
    setLoadingMore(true)
    try {
      const res = await fetch(buildUrl(nextPage))
      const data = await res.json()
      const newItems: SavedItem[] = data.data?.content || []
      setItems(prev => [...prev, ...newItems])
      setPage(nextPage)
    } catch {
      toast.error('Failed to load more')
    } finally {
      setLoadingMore(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await fetch('/api/save', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      setItems(items.filter(i => i.id !== id))
      setTotal(t => t - 1)
      toast.success('Deleted')
      router.refresh()
    } catch {
      toast.error('Failed to delete')
    }
  }

  const handleDownload = (item: SavedItem) => {
    const text = `UGCForge – ${item.productName}
Platform: ${platformLabels[item.platform] || item.platform}
Saved: ${new Date(item.savedAt).toLocaleDateString()}

=== HOOKS ===
${item.output.hookBank.map((h, i) => `${i + 1}. ${h}`).join('\n')}

=== SCRIPT ===
${item.output.script}

=== CAPTION ===
${item.output.caption}

=== HASHTAGS ===
${item.output.hashtags.join('\n')}
`
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ugcforge-${item.productName.replace(/\s+/g, '-').toLowerCase()}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const hasMore = items.length < total
  const activeFilters = [platformFilter, goalFilter].filter(Boolean).length

  const clearFilters = () => {
    setSearch('')
    setPlatformFilter('')
    setGoalFilter('')
    setShowFilters(false)
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-800 rounded w-48" />
          <div className="h-4 bg-gray-800 rounded w-64" />
          <div className="space-y-3 mt-6">
            {[1, 2, 3].map(i => <div key={i} className="h-24 bg-gray-800 rounded-xl" />)}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-1">Saved Content</h1>
        <p className="text-gray-400">{total} saved generation{total !== 1 ? 's' : ''}</p>
      </div>

      {/* Search & Filters Bar */}
      <div className="mb-6 space-y-3">
        <div className="flex gap-3">
          {/* Search input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search by product name, description, caption..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-8 py-2.5 rounded-lg bg-gray-900/60 border border-gray-800 text-sm text-gray-200 placeholder:text-gray-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 transition-colors"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors border ${
              showFilters || activeFilters > 0
                ? 'bg-violet-600/20 border-violet-500/50 text-violet-300'
                : 'bg-gray-900/60 border-gray-800 text-gray-400 hover:text-gray-200'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
            {activeFilters > 0 && (
              <span className="bg-violet-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                {activeFilters}
              </span>
            )}
          </button>
        </div>

        {/* Filter dropdowns */}
        {showFilters && (
          <div className="flex gap-3 items-end bg-gray-900/40 border border-gray-800 rounded-xl p-4">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Platform</label>
              <div className="relative">
                <select
                  value={platformFilter}
                  onChange={e => setPlatformFilter(e.target.value)}
                  className="w-full appearance-none rounded-lg bg-gray-800/50 border border-gray-700 px-3 py-2 text-sm text-gray-200 focus:border-violet-500 focus:outline-none pr-8"
                >
                  <option value="">All platforms</option>
                  {Object.entries(platformLabels).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
              </div>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Content Goal</label>
              <div className="relative">
                <select
                  value={goalFilter}
                  onChange={e => setGoalFilter(e.target.value)}
                  className="w-full appearance-none rounded-lg bg-gray-800/50 border border-gray-700 px-3 py-2 text-sm text-gray-200 focus:border-violet-500 focus:outline-none pr-8"
                >
                  <option value="">All goals</option>
                  {Object.entries(goalLabels).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
              </div>
            </div>
            {activeFilters > 0 && (
              <button
                onClick={clearFilters}
                className="text-xs text-red-400 hover:text-red-300 px-3 py-2 transition-colors whitespace-nowrap"
              >
                Clear all
              </button>
            )}
          </div>
        )}
      </div>

      {items.length === 0 ? (
        <div className="text-center py-20">
          <BookMarked className="w-12 h-12 text-gray-700 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-400 mb-2">
            {debouncedSearch || platformFilter || goalFilter
              ? 'No results match your filters'
              : 'No saved content yet'}
          </h3>
          <p className="text-gray-500 text-sm">
            {debouncedSearch || platformFilter || goalFilter
              ? 'Try adjusting your search or filters'
              : 'Generate content and save it to see it here'}
          </p>
          {(debouncedSearch || platformFilter || goalFilter) && (
            <button
              onClick={clearFilters}
              className="mt-4 text-sm text-violet-400 hover:text-violet-300 transition-colors"
            >
              Clear all filters
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {items.map(item => (
              <div key={item.id} className="bg-gray-900/60 border border-gray-800 rounded-xl overflow-hidden">
                <div className="p-5 flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-white mb-1 truncate">{item.productName}</h3>
                    <div className="flex gap-2 flex-wrap">
                      <span className="text-xs bg-gray-800 text-gray-300 px-2 py-1 rounded border border-gray-700">
                        {platformLabels[item.platform] || item.platform}
                      </span>
                      <span className="text-xs bg-gray-800 text-gray-300 px-2 py-1 rounded border border-gray-700">
                        {goalLabels[item.contentGoal] || item.contentGoal?.replace(/_/g, ' ')}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(item.savedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0 ml-4">
                    <button
                      onClick={() => setExpanded(expanded === item.id ? null : item.id)}
                      className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-200 bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded transition-colors border border-gray-700"
                    >
                      <ExternalLink className="w-3 h-3" />
                      {expanded === item.id ? 'Collapse' : 'Expand'}
                    </button>
                    <button
                      onClick={() => handleDownload(item)}
                      className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-200 bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded transition-colors border border-gray-700"
                    >
                      <Download className="w-3 h-3" />
                      Download
                    </button>
                    <Link
                      href={`/video?contentId=${item.id}`}
                      className="flex items-center gap-1 text-xs text-pink-400 hover:text-pink-300 bg-pink-900/20 hover:bg-pink-900/40 px-3 py-1.5 rounded transition-colors border border-pink-800/40"
                    >
                      <Video className="w-3 h-3" />
                      Create Video
                    </Link>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 bg-red-900/20 hover:bg-red-900/40 px-3 py-1.5 rounded transition-colors border border-red-800/40"
                    >
                      <Trash2 className="w-3 h-3" />
                      Delete
                    </button>
                  </div>
                </div>
                {expanded === item.id && (
                  <div className="border-t border-gray-800 p-5 space-y-2">
                    <OutputSection title="🎯 Hook Options" content={item.output.hookBank} defaultOpen={true} />
                    <OutputSection title="🎬 Script" content={item.output.script} />
                    <OutputSection title="📝 Caption" content={item.output.caption} />
                    <OutputSection title="#️⃣ Hashtags" content={item.output.hashtags} />
                    <OutputSection title="📣 CTA Variations" content={item.output.ctaVariations} />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Load More */}
          {hasMore && (
            <div className="mt-6 text-center">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-gray-200 rounded-lg text-sm font-medium transition-colors border border-gray-700"
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    Load more ({total - items.length} remaining)
                  </>
                )}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
