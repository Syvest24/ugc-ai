'use client'
import { useState, useEffect } from 'react'
import { Trash2, Download, ExternalLink, BookMarked } from 'lucide-react'
import toast from 'react-hot-toast'
import type { GeneratedOutput } from '@/types'
import OutputSection from '@/components/OutputSection'

interface SavedItem {
  id: string
  productName: string
  platform: string
  contentGoal: string
  tone: string
  output: GeneratedOutput
  savedAt: string
}

const platformLabels: Record<string, string> = {
  tiktok: 'TikTok',
  instagram: 'Instagram',
  youtube_shorts: 'YouTube Shorts',
  twitter_x: 'Twitter/X',
  linkedin: 'LinkedIn',
}

export default function SavedPage() {
  const [items, setItems] = useState<SavedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/save')
      .then(r => r.json())
      .then(data => setItems(data.content || []))
      .catch(() => toast.error('Failed to load saved content'))
      .finally(() => setLoading(false))
  }, [])

  const handleDelete = async (id: string) => {
    try {
      await fetch('/api/save', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      setItems(items.filter(i => i.id !== id))
      toast.success('Deleted')
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
    <div className="p-8">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">Saved Content</h1>
          <p className="text-gray-400">{items.length} saved generation{items.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-20">
          <BookMarked className="w-12 h-12 text-gray-700 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-400 mb-2">No saved content yet</h3>
          <p className="text-gray-500 text-sm">Generate content and save it to see it here</p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map(item => (
            <div key={item.id} className="bg-gray-900/60 border border-gray-800 rounded-xl overflow-hidden">
              <div className="p-5 flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-white mb-1">{item.productName}</h3>
                  <div className="flex gap-2 flex-wrap">
                    <span className="text-xs bg-gray-800 text-gray-300 px-2 py-1 rounded border border-gray-700">
                      {platformLabels[item.platform] || item.platform}
                    </span>
                    <span className="text-xs bg-gray-800 text-gray-300 px-2 py-1 rounded border border-gray-700">
                      {item.contentGoal?.replace(/_/g, ' ')}
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
      )}
    </div>
  )
}
