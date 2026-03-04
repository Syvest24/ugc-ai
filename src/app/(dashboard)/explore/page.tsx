'use client'
import { useState, useEffect } from 'react'
import { Loader2, Video, ImageIcon, Music, FileText, Search, Compass } from 'lucide-react'

type ContentItem = {
  id: string
  type: string
  title: string
  content: string
  createdAt: string
  user?: { name?: string; image?: string }
}

const TABS = [
  { id: 'all', name: 'All', icon: Compass },
  { id: 'video', name: 'Videos', icon: Video },
  { id: 'image', name: 'Images', icon: ImageIcon },
  { id: 'script', name: 'Scripts', icon: FileText },
]

// Demo content for gallery when no items exist yet
const DEMO_ITEMS: ContentItem[] = [
  {
    id: 'demo-1',
    type: 'image',
    title: 'Sunset Mountain Landscape',
    content: 'https://image.pollinations.ai/prompt/breathtaking%20sunset%20over%20mountain%20range%20photorealistic?width=512&height=512&model=flux&nologo=true&seed=1001',
    createdAt: new Date().toISOString(),
    user: { name: 'AI Gallery' },
  },
  {
    id: 'demo-2',
    type: 'image',
    title: 'Cyberpunk City',
    content: 'https://image.pollinations.ai/prompt/cyberpunk%20city%20at%20night%20neon%20lights%20rain?width=512&height=512&model=flux&nologo=true&seed=1002',
    createdAt: new Date().toISOString(),
    user: { name: 'AI Gallery' },
  },
  {
    id: 'demo-3',
    type: 'image',
    title: 'Fantasy Forest',
    content: 'https://image.pollinations.ai/prompt/magical%20enchanted%20forest%20with%20glowing%20mushrooms%20and%20fairy%20lights?width=512&height=512&model=flux&nologo=true&seed=1003',
    createdAt: new Date().toISOString(),
    user: { name: 'AI Gallery' },
  },
  {
    id: 'demo-4',
    type: 'image',
    title: 'Abstract Art',
    content: 'https://image.pollinations.ai/prompt/abstract%20digital%20art%20colorful%20fluid%20shapes%20modern?width=512&height=512&model=flux&nologo=true&seed=1004',
    createdAt: new Date().toISOString(),
    user: { name: 'AI Gallery' },
  },
  {
    id: 'demo-5',
    type: 'image',
    title: 'Underwater World',
    content: 'https://image.pollinations.ai/prompt/beautiful%20underwater%20coral%20reef%20tropical%20fish%20sunlight?width=512&height=512&model=flux&nologo=true&seed=1005',
    createdAt: new Date().toISOString(),
    user: { name: 'AI Gallery' },
  },
  {
    id: 'demo-6',
    type: 'image',
    title: 'Space Nebula',
    content: 'https://image.pollinations.ai/prompt/vast%20space%20nebula%20colorful%20gas%20clouds%20stars%20cosmic?width=512&height=512&model=flux&nologo=true&seed=1006',
    createdAt: new Date().toISOString(),
    user: { name: 'AI Gallery' },
  },
  {
    id: 'demo-7',
    type: 'image',
    title: 'Japanese Garden',
    content: 'https://image.pollinations.ai/prompt/peaceful%20Japanese%20garden%20cherry%20blossom%20koi%20pond?width=512&height=512&model=flux&nologo=true&seed=1007',
    createdAt: new Date().toISOString(),
    user: { name: 'AI Gallery' },
  },
  {
    id: 'demo-8',
    type: 'image',
    title: 'Steampunk Machine',
    content: 'https://image.pollinations.ai/prompt/intricate%20steampunk%20machine%20brass%20gears%20copper%20pipes?width=512&height=512&model=flux&nologo=true&seed=1008',
    createdAt: new Date().toISOString(),
    user: { name: 'AI Gallery' },
  },
]

export default function ExplorePage() {
  const [activeTab, setActiveTab] = useState('all')
  const [items, setItems] = useState<ContentItem[]>(DEMO_ITEMS)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null)

  useEffect(() => {
    fetchItems()
  }, [activeTab])

  const fetchItems = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/explore?type=${activeTab}&limit=30`)
      const json = await res.json()
      if (json.success && json.data.length > 0) {
        setItems(json.data)
      } else {
        // Keep demo items if no API content
        setItems(DEMO_ITEMS)
      }
    } catch {
      setItems(DEMO_ITEMS)
    } finally {
      setLoading(false)
    }
  }

  const filteredItems = items.filter(item => {
    if (!search) return true
    return item.title?.toLowerCase().includes(search.toLowerCase())
  })

  const getItemPreview = (item: ContentItem) => {
    if (item.type === 'image' && item.content?.startsWith('http')) {
      return item.content
    }
    // Generate a preview image for non-image items
    return `https://image.pollinations.ai/prompt/${encodeURIComponent(item.title || 'creative content')}?width=400&height=400&model=flux&nologo=true&seed=${item.id.charCodeAt(0)}`
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-600/20 border border-amber-600/30 flex items-center justify-center">
              <Compass className="w-5 h-5 text-amber-400" />
            </div>
            Explore
          </h1>
          <p className="text-gray-400 mt-1">Discover AI-generated content created by the community.</p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-700 bg-gray-800/50 text-sm text-gray-100 placeholder-gray-500 focus:border-violet-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {TABS.map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-violet-600/20 text-violet-300 border border-violet-600/30'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.name}
            </button>
          )
        })}
      </div>

      {/* Gallery Grid */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredItems.map(item => (
            <div
              key={item.id}
              onClick={() => setSelectedItem(item)}
              className="group cursor-pointer rounded-xl overflow-hidden bg-gray-900/60 border border-gray-800 hover:border-violet-500/50 transition-all hover:scale-[1.02]"
            >
              <div className="aspect-square relative overflow-hidden">
                <img
                  src={getItemPreview(item)}
                  alt={item.title || ''}
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  loading="lazy"
                  onError={e => {
                    (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect fill="%23111827" width="400" height="400"/><text x="200" y="200" fill="%236B7280" text-anchor="middle" font-size="14">Preview</text></svg>'
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="absolute bottom-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-xs text-white font-medium truncate">{item.title}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    {item.type === 'video' && <Video className="w-3 h-3 text-violet-300" />}
                    {item.type === 'image' && <ImageIcon className="w-3 h-3 text-blue-300" />}
                    {item.type === 'script' && <FileText className="w-3 h-3 text-green-300" />}
                    <span className="text-[10px] text-gray-300">{item.user?.name || 'Creator'}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {filteredItems.length === 0 && !loading && (
        <div className="text-center py-20">
          <Compass className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500">No content found. Be the first to create something!</p>
        </div>
      )}

      {/* Modal */}
      {selectedItem && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedItem(null)}
        >
          <div
            className="bg-gray-900 border border-gray-700 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="aspect-square overflow-hidden rounded-t-2xl">
              <img
                src={getItemPreview(selectedItem)}
                alt={selectedItem.title || ''}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-6 space-y-3">
              <h2 className="text-xl font-bold text-white">{selectedItem.title}</h2>
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <span className="capitalize">{selectedItem.type}</span>
                <span>by {selectedItem.user?.name || 'Creator'}</span>
                <span>{new Date(selectedItem.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex gap-2 pt-2">
                <a
                  href={getItemPreview(selectedItem)}
                  download
                  target="_blank"
                  className="flex-1 flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 text-white px-4 py-2.5 rounded-lg text-sm transition-colors"
                >
                  Download
                </a>
                <button
                  onClick={() => setSelectedItem(null)}
                  className="px-4 py-2.5 rounded-lg border border-gray-700 text-gray-400 hover:text-white text-sm transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
