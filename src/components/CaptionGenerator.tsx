'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { Hash, Copy, Loader2, ChevronDown, ChevronUp, Sparkles } from 'lucide-react'
import { PLATFORMS as PLATFORM_IDS, PLATFORM_LABELS } from '@/lib/constants'

interface CaptionData {
  captions: string[]
  hashtags: {
    niche: string[]
    trending: string[]
    broad: string[]
  }
  hashtagString: string
  tips: string[]
}

interface Props {
  defaultText?: string
  defaultPlatform?: string
  defaultProductName?: string
  compact?: boolean
}

const PLATFORMS = PLATFORM_IDS.map(id => ({ id, label: PLATFORM_LABELS[id] }))

const LENGTHS = [
  { id: 'short', label: 'Short' },
  { id: 'medium', label: 'Medium' },
  { id: 'long', label: 'Long' },
]

export default function CaptionGenerator({ defaultText = '', defaultPlatform = 'instagram', defaultProductName = '', compact = false }: Props) {
  const [text, setText] = useState(defaultText)
  const [platform, setPlatform] = useState(defaultPlatform)
  const [productName, setProductName] = useState(defaultProductName)
  const [length, setLength] = useState('medium')
  const [includeEmojis, setIncludeEmojis] = useState(true)
  const [hashtagCount, setHashtagCount] = useState(15)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<CaptionData | null>(null)
  const [expanded, setExpanded] = useState(!compact)

  const handleGenerate = async () => {
    if (!text.trim()) {
      toast.error('Enter some text/context first')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/captions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text.trim(),
          platform,
          length,
          includeEmojis,
          hashtagCount,
          productName: productName.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Generation failed')
        return
      }
      setResult(data.data)
      toast.success('Captions & hashtags generated!')
    } catch {
      toast.error('Failed to generate captions')
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (val: string, label: string) => {
    navigator.clipboard.writeText(val)
    toast.success(`${label} copied!`)
  }

  if (compact && !expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="w-full flex items-center justify-between p-4 bg-gray-900/60 border border-gray-800 rounded-xl hover:border-gray-700 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Hash className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-medium text-white">Caption & Hashtag Generator</span>
        </div>
        <ChevronDown className="w-4 h-4 text-gray-400" />
      </button>
    )
  }

  return (
    <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Hash className="w-4 h-4 text-emerald-400" />
          Caption & Hashtag Generator
        </h3>
        {compact && (
          <button onClick={() => setExpanded(false)} className="p-1 hover:bg-gray-800 rounded-lg" aria-label="Collapse caption generator">
            <ChevronUp className="w-4 h-4 text-gray-400" />
          </button>
        )}
      </div>

      <div className="space-y-3">
        {/* Context text */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Context / Description</label>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            rows={3}
            placeholder="Describe your product, content topic, or paste your script..."
            className="w-full rounded-lg border border-gray-700 bg-gray-800/50 px-3 py-2 text-sm text-gray-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
          />
        </div>

        {/* Product name (optional) */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Product Name (optional)</label>
          <input
            type="text"
            value={productName}
            onChange={e => setProductName(e.target.value)}
            placeholder="e.g., GlowSerum Pro"
            className="w-full rounded-lg border border-gray-700 bg-gray-800/50 px-3 py-2 text-sm text-gray-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        {/* Settings row */}
        <div className="flex flex-wrap gap-3">
          {/* Platform */}
          <div className="flex gap-1.5">
            {PLATFORMS.map(p => (
              <button
                key={p.id}
                onClick={() => setPlatform(p.id)}
                className={`px-2.5 py-1 text-[10px] font-semibold rounded-full border transition-colors ${
                  platform === p.id
                    ? 'bg-emerald-600 border-emerald-500 text-white'
                    : 'border-gray-700 text-gray-400 hover:border-gray-600'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {/* Length */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Length:</span>
            <div className="flex gap-1">
              {LENGTHS.map(l => (
                <button
                  key={l.id}
                  onClick={() => setLength(l.id)}
                  className={`px-2 py-0.5 text-[10px] font-medium rounded border transition-colors ${
                    length === l.id
                      ? 'bg-emerald-600/20 border-emerald-500/40 text-emerald-400'
                      : 'border-gray-700 text-gray-500 hover:border-gray-600'
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          {/* Emojis toggle */}
          <label className="flex items-center gap-1.5 text-xs text-gray-400 cursor-pointer">
            <input
              type="checkbox"
              checked={includeEmojis}
              onChange={e => setIncludeEmojis(e.target.checked)}
              className="rounded border-gray-600 bg-gray-800 text-emerald-500 focus:ring-emerald-500"
            />
            Emojis
          </label>

          {/* Hashtag count */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500">Tags:</span>
            <select
              value={hashtagCount}
              onChange={e => setHashtagCount(Number(e.target.value))}
              className="bg-gray-800 border border-gray-700 rounded px-1.5 py-0.5 text-xs text-gray-300 focus:border-emerald-500 focus:outline-none"
            >
              {[5, 10, 15, 20, 25, 30].map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Generate button */}
        <button
          onClick={handleGenerate}
          disabled={loading || !text.trim()}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {loading ? 'Generating...' : 'Generate Captions & Hashtags'}
        </button>
      </div>

      {/* Results */}
      {result && (
        <div className="mt-5 space-y-4 border-t border-gray-800 pt-5">
          {/* Captions */}
          <div>
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Caption Variations</h4>
            <div className="space-y-2">
              {result.captions.map((cap, i) => (
                <div key={i} className="bg-gray-800/40 rounded-lg p-3 border border-gray-700/50 group relative">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold text-emerald-400 uppercase">Option {i + 1}</span>
                      <p className="text-sm text-gray-200 mt-1 whitespace-pre-wrap">{cap}</p>
                    </div>
                    <button
                      onClick={() => copyToClipboard(cap, `Caption ${i + 1}`)}
                      className="p-1.5 text-gray-500 hover:text-emerald-400 hover:bg-emerald-600/10 rounded-lg transition-colors flex-shrink-0"
                      aria-label={`Copy caption ${i + 1}`}
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Hashtags */}
          <div>
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Hashtags</h4>
            
            {/* Quick copy all */}
            {result.hashtagString && (
              <button
                onClick={() => copyToClipboard(result.hashtagString, 'All hashtags')}
                className="mb-3 flex items-center gap-2 px-3 py-2 bg-emerald-600/10 border border-emerald-500/20 rounded-lg text-xs text-emerald-400 hover:bg-emerald-600/20 transition-colors w-full"
              >
                <Copy className="w-3 h-3" />
                <span className="truncate">{result.hashtagString}</span>
              </button>
            )}

            <div className="grid grid-cols-3 gap-2">
              {(['niche', 'trending', 'broad'] as const).map(category => (
                <div key={category} className="bg-gray-800/40 rounded-lg p-3 border border-gray-700/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-gray-400 uppercase">{category}</span>
                    <button
                      onClick={() => copyToClipboard(result.hashtags[category].join(' '), `${category} hashtags`)}
                      className="p-1 text-gray-500 hover:text-emerald-400 rounded transition-colors"
                      aria-label={`Copy ${category} hashtags`}
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {result.hashtags[category].map((tag, i) => (
                      <span key={i} className="text-xs text-emerald-300 bg-emerald-600/10 px-1.5 py-0.5 rounded">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tips */}
          {result.tips.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Pro Tips</h4>
              <div className="space-y-1">
                {result.tips.map((tip, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-gray-400">
                    <span className="text-emerald-400 mt-0.5">💡</span>
                    <span>{tip}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
