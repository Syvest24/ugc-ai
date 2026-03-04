'use client'
import { useState } from 'react'
import { Loader2, Video, Download, Sparkles, Wand2 } from 'lucide-react'

const STYLES = [
  { id: 'cinematic', name: 'Cinematic', prompt: 'cinematic, film grain, dramatic lighting, 4K' },
  { id: 'anime', name: 'Anime', prompt: 'anime style, vibrant colors, detailed animation' },
  { id: 'realistic', name: 'Realistic', prompt: 'photorealistic, hyperrealistic, natural lighting' },
  { id: 'dreamy', name: 'Dreamy', prompt: 'dreamy, ethereal, soft focus, pastel colors' },
  { id: '3d-render', name: '3D Render', prompt: '3D render, Pixar style, vibrant lighting' },
  { id: 'vintage', name: 'Vintage', prompt: 'vintage film, retro colors, VHS aesthetic' },
]

const ASPECT_RATIOS = [
  { id: '16:9', name: 'Landscape (16:9)' },
  { id: '9:16', name: 'Portrait (9:16)' },
  { id: '1:1', name: 'Square (1:1)' },
]

export default function TextToVideoPage() {
  const [prompt, setPrompt] = useState('')
  const [negativePrompt, setNegativePrompt] = useState('')
  const [style, setStyle] = useState('')
  const [aspectRatio, setAspectRatio] = useState('16:9')
  const [duration, setDuration] = useState(5)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ videoUrl: string; model: string; provider: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleGenerate = async () => {
    if (!prompt.trim()) return
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const res = await fetch('/api/text-to-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, negativePrompt, style, aspectRatio, duration }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error || 'Generation failed')
      setResult(json.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-600/20 border border-violet-600/30 flex items-center justify-center">
            <Video className="w-5 h-5 text-violet-400" />
          </div>
          Text to Video
        </h1>
        <p className="text-gray-400 mt-2">Transform your text prompts into stunning AI-generated videos.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: Controls */}
        <div className="lg:col-span-3 space-y-6">
          {/* Prompt */}
          <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Describe your video</label>
              <textarea
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                placeholder="A dreamlike beachside scene at dawn, with crashing waves and soft pink sky reflecting on wet sand..."
                rows={4}
                maxLength={2000}
                className="w-full rounded-lg border border-gray-700 bg-gray-800/50 px-4 py-3 text-sm text-gray-100 placeholder-gray-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 resize-none"
              />
              <div className="flex justify-between mt-1">
                <span className="text-xs text-gray-500">{prompt.length}/2000</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Negative prompt <span className="text-gray-500">(optional)</span></label>
              <input
                type="text"
                value={negativePrompt}
                onChange={e => setNegativePrompt(e.target.value)}
                placeholder="blurry, low quality, distorted..."
                className="w-full rounded-lg border border-gray-700 bg-gray-800/50 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
              />
            </div>
          </div>

          {/* Style Selection */}
          <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-6">
            <label className="block text-sm font-medium text-gray-300 mb-3">Style</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {STYLES.map(s => (
                <button
                  key={s.id}
                  onClick={() => setStyle(style === s.id ? '' : s.id)}
                  className={`p-3 rounded-lg border text-left text-sm transition-all ${
                    style === s.id
                      ? 'border-violet-500 bg-violet-600/10 text-violet-300'
                      : 'border-gray-700 bg-gray-800/30 text-gray-400 hover:border-gray-600'
                  }`}
                >
                  <span className="font-medium">{s.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Settings */}
          <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Aspect Ratio</label>
                <select
                  value={aspectRatio}
                  onChange={e => setAspectRatio(e.target.value)}
                  className="w-full rounded-lg border border-gray-700 bg-gray-800/50 px-3 py-2 text-sm text-gray-200 focus:border-violet-500 focus:outline-none"
                >
                  {ASPECT_RATIOS.map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Duration: {duration}s</label>
                <input
                  type="range"
                  min={2}
                  max={10}
                  value={duration}
                  onChange={e => setDuration(Number(e.target.value))}
                  className="w-full accent-violet-500"
                />
              </div>
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={loading || !prompt.trim()}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 disabled:opacity-50 text-white px-6 py-4 rounded-xl font-semibold transition-all text-lg"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wand2 className="w-5 h-5" />}
            {loading ? 'Generating Video...' : 'Generate Video'}
          </button>

          {error && (
            <div className="bg-red-900/30 border border-red-800 rounded-lg p-4 text-sm text-red-300">
              {error}
            </div>
          )}
        </div>

        {/* Right: Preview */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-6 sticky top-6">
            <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-violet-400" />
              Preview
            </h3>
            {result ? (
              <div className="space-y-4">
                <div className="rounded-lg overflow-hidden bg-black aspect-video">
                  <video
                    src={result.videoUrl}
                    controls
                    autoPlay
                    loop
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="text-xs text-gray-500">
                  Generated with {result.model} ({result.provider})
                </div>
                <a
                  href={result.videoUrl}
                  download
                  className="flex items-center justify-center gap-2 w-full bg-gray-800 hover:bg-gray-700 text-white px-4 py-2.5 rounded-lg text-sm transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download Video
                </a>
              </div>
            ) : loading ? (
              <div className="aspect-video bg-gray-800/50 rounded-lg flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
                <p className="text-sm text-gray-400">Creating your video...</p>
                <p className="text-xs text-gray-500">This may take a few minutes</p>
              </div>
            ) : (
              <div className="aspect-video bg-gray-800/50 rounded-lg flex flex-col items-center justify-center gap-2">
                <Video className="w-8 h-8 text-gray-600" />
                <p className="text-sm text-gray-500">Your video will appear here</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
