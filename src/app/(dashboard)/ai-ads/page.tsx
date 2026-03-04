'use client'
import { useState } from 'react'
import { Loader2, Megaphone, Copy, Check, Video, ImageIcon, FileText, Sparkles } from 'lucide-react'

const AD_TYPES = [
  { id: 'product-demo', name: 'Product Demo', desc: 'Showcase your product features and benefits' },
  { id: 'testimonial', name: 'Testimonial', desc: 'Customer success story and social proof' },
  { id: 'before-after', name: 'Before & After', desc: 'Dramatic transformation results' },
  { id: 'how-to', name: 'How-To', desc: 'Step-by-step tutorial with CTA' },
  { id: 'ugc-style', name: 'UGC Style', desc: 'Authentic creator-style content' },
  { id: 'story', name: 'Story Ad', desc: 'Narrative-driven emotional ad' },
]

const PLATFORMS = [
  { id: 'tiktok', name: 'TikTok' },
  { id: 'instagram', name: 'Instagram Reels' },
  { id: 'youtube', name: 'YouTube Shorts' },
  { id: 'facebook', name: 'Facebook' },
  { id: 'linkedin', name: 'LinkedIn' },
]

const TONES = [
  { id: 'professional', name: 'Professional' },
  { id: 'casual', name: 'Casual & Fun' },
  { id: 'urgent', name: 'Urgent' },
  { id: 'luxury', name: 'Luxury' },
  { id: 'friendly', name: 'Friendly' },
  { id: 'bold', name: 'Bold & Direct' },
]

type AdResult = {
  hook: string
  script: string
  cta: string
  caption: string
  hashtags: string
  headlines: string[]
  imagePrompt: string
  previewImageUrl: string
}

export default function AiAdsPage() {
  const [productName, setProductName] = useState('')
  const [productDesc, setProductDesc] = useState('')
  const [targetAudience, setTargetAudience] = useState('')
  const [adType, setAdType] = useState('product-demo')
  const [platform, setPlatform] = useState('tiktok')
  const [tone, setTone] = useState('casual')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AdResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copiedField, setCopiedField] = useState<string | null>(null)

  const handleGenerate = async () => {
    if (!productName.trim() || !productDesc.trim()) return
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const res = await fetch('/api/ai-ads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productName, productDesc, targetAudience, adType, platform, tone }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error || 'Ad generation failed')
      setResult(json.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const CopyButton = ({ text, field }: { text: string; field: string }) => (
    <button
      onClick={() => copyToClipboard(text, field)}
      className="p-1.5 rounded-md hover:bg-gray-700 transition-colors"
      title="Copy"
    >
      {copiedField === field ? (
        <Check className="w-3.5 h-3.5 text-green-400" />
      ) : (
        <Copy className="w-3.5 h-3.5 text-gray-500" />
      )}
    </button>
  )

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-600/20 border border-orange-600/30 flex items-center justify-center">
            <Megaphone className="w-5 h-5 text-orange-400" />
          </div>
          AI Ad Generator
        </h1>
        <p className="text-gray-400 mt-2">Create complete ad campaigns with AI — hooks, scripts, visuals, and copy.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Inputs */}
        <div className="space-y-6">
          {/* Product Info */}
          <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-6 space-y-4">
            <h3 className="text-sm font-semibold text-white">Product Details</h3>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Product / Brand Name</label>
              <input
                type="text"
                value={productName}
                onChange={e => setProductName(e.target.value)}
                placeholder="e.g. GlowSkin Serum"
                className="w-full rounded-lg border border-gray-700 bg-gray-800/50 px-3 py-2.5 text-sm text-gray-100 placeholder-gray-500 focus:border-orange-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Product Description</label>
              <textarea
                value={productDesc}
                onChange={e => setProductDesc(e.target.value)}
                placeholder="What does it do? Key features and benefits..."
                rows={3}
                className="w-full rounded-lg border border-gray-700 bg-gray-800/50 px-3 py-2.5 text-sm text-gray-100 placeholder-gray-500 focus:border-orange-500 focus:outline-none resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Target Audience (optional)</label>
              <input
                type="text"
                value={targetAudience}
                onChange={e => setTargetAudience(e.target.value)}
                placeholder="e.g. Women 18-35 interested in skincare"
                className="w-full rounded-lg border border-gray-700 bg-gray-800/50 px-3 py-2.5 text-sm text-gray-100 placeholder-gray-500 focus:border-orange-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Ad Type */}
          <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-6">
            <label className="block text-sm font-semibold text-white mb-3">Ad Format</label>
            <div className="grid grid-cols-2 gap-2">
              {AD_TYPES.map(t => (
                <button
                  key={t.id}
                  onClick={() => setAdType(t.id)}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    adType === t.id
                      ? 'border-orange-500 bg-orange-600/10'
                      : 'border-gray-700 bg-gray-800/30 hover:border-gray-600'
                  }`}
                >
                  <div className="text-sm font-medium text-white">{t.name}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{t.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Platform + Tone */}
          <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-6 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-white mb-2">Platform</label>
              <div className="flex flex-wrap gap-2">
                {PLATFORMS.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setPlatform(p.id)}
                    className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
                      platform === p.id
                        ? 'border-orange-500 bg-orange-600/10 text-orange-300'
                        : 'border-gray-700 text-gray-400 hover:border-gray-600'
                    }`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-white mb-2">Tone</label>
              <div className="flex flex-wrap gap-2">
                {TONES.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setTone(t.id)}
                    className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
                      tone === t.id
                        ? 'border-violet-500 bg-violet-600/10 text-violet-300'
                        : 'border-gray-700 text-gray-400 hover:border-gray-600'
                    }`}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading || !productName.trim() || !productDesc.trim()}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 disabled:opacity-50 text-white px-6 py-4 rounded-xl font-semibold transition-all text-lg"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
            {loading ? 'Creating Ad...' : 'Generate Ad Campaign'}
          </button>

          {error && (
            <div className="bg-red-900/30 border border-red-800 rounded-lg p-4 text-sm text-red-300">{error}</div>
          )}
        </div>

        {/* Right: Results */}
        <div className="space-y-4">
          {result ? (
            <>
              {/* Preview Image */}
              {result.previewImageUrl && (
                <div className="bg-gray-900/60 border border-gray-800 rounded-xl overflow-hidden">
                  <img src={result.previewImageUrl} alt="Ad preview" className="w-full aspect-square object-cover" />
                </div>
              )}

              {/* Hook */}
              <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-orange-400 flex items-center gap-1.5">
                    <Video className="w-3.5 h-3.5" /> Hook
                  </h4>
                  <CopyButton text={result.hook} field="hook" />
                </div>
                <p className="text-sm text-gray-200">{result.hook}</p>
              </div>

              {/* Script */}
              <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-violet-400 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" /> Script
                  </h4>
                  <CopyButton text={result.script} field="script" />
                </div>
                <p className="text-sm text-gray-200 whitespace-pre-wrap">{result.script}</p>
              </div>

              {/* CTA */}
              <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-emerald-400">CTA</h4>
                  <CopyButton text={result.cta} field="cta" />
                </div>
                <p className="text-sm text-gray-200">{result.cta}</p>
              </div>

              {/* Headlines */}
              {result.headlines?.length > 0 && (
                <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4">
                  <h4 className="text-sm font-semibold text-blue-400 mb-2">Ad Headlines</h4>
                  <div className="space-y-1">
                    {result.headlines.map((h, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <p className="text-sm text-gray-200">{h}</p>
                        <CopyButton text={h} field={`headline-${i}`} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Caption + Hashtags */}
              <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-pink-400">Caption</h4>
                  <CopyButton text={`${result.caption}\n\n${result.hashtags}`} field="caption" />
                </div>
                <p className="text-sm text-gray-200">{result.caption}</p>
                <p className="text-sm text-blue-400 mt-2">{result.hashtags}</p>
              </div>

              {/* Image Prompt */}
              <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-amber-400 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5" /> Suggested Image Prompt
                  </h4>
                  <CopyButton text={result.imagePrompt} field="imgPrompt" />
                </div>
                <p className="text-sm text-gray-400">{result.imagePrompt}</p>
              </div>
            </>
          ) : loading ? (
            <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-12 flex flex-col items-center gap-3">
              <Loader2 className="w-10 h-10 animate-spin text-orange-400" />
              <p className="text-sm text-gray-400">Crafting your ad campaign...</p>
              <p className="text-xs text-gray-500">Generating hook, script, visuals & copy</p>
            </div>
          ) : (
            <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-12 flex flex-col items-center gap-3">
              <Megaphone className="w-10 h-10 text-gray-600" />
              <p className="text-sm text-gray-500">Fill in your product details and generate</p>
              <p className="text-xs text-gray-600">You'll get a complete ad package: hook, script, CTA, caption, and image prompt</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
