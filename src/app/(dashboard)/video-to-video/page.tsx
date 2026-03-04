'use client'
import { useState, useRef } from 'react'
import { Loader2, Video, Download, Upload, Palette } from 'lucide-react'

const STYLES = [
  { id: 'anime', name: 'Anime', desc: 'Japanese anime art style' },
  { id: 'oil-painting', name: 'Oil Painting', desc: 'Classic oil painting' },
  { id: 'watercolor', name: 'Watercolor', desc: 'Soft watercolor effect' },
  { id: 'cyberpunk', name: 'Cyberpunk', desc: 'Neon-lit cyberpunk' },
  { id: 'vintage', name: 'Vintage Film', desc: 'Retro film grain' },
  { id: 'comic', name: 'Comic Book', desc: 'Bold comic style' },
  { id: 'sketch', name: 'Pencil Sketch', desc: 'Hand-drawn sketch' },
  { id: 'noir', name: 'Film Noir', desc: 'B&W dramatic' },
  { id: 'pixel', name: 'Pixel Art', desc: '8-bit retro pixel' },
  { id: '3d-cartoon', name: '3D Cartoon', desc: 'Pixar-like 3D' },
]

export default function VideoToVideoPage() {
  const [videoUrl, setVideoUrl] = useState('')
  const [videoPreview, setVideoPreview] = useState<string | null>(null)
  const [style, setStyle] = useState('anime')
  const [prompt, setPrompt] = useState('')
  const [strength, setStrength] = useState(0.7)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ videoUrl: string; model: string; style: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Create a local preview
    const url = URL.createObjectURL(file)
    setVideoPreview(url)

    // Upload to temporary storage (base64 for now)
    const reader = new FileReader()
    reader.onload = () => {
      setVideoUrl(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleTransform = async () => {
    if (!videoUrl) return
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const res = await fetch('/api/video-to-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoUrl, style, prompt, strength }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error || 'Transform failed')
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
          <div className="w-10 h-10 rounded-xl bg-pink-600/20 border border-pink-600/30 flex items-center justify-center">
            <Palette className="w-5 h-5 text-pink-400" />
          </div>
          Video to Video
        </h1>
        <p className="text-gray-400 mt-2">Transform your videos with AI-powered style transfer.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Upload + Controls */}
        <div className="space-y-6">
          {/* Upload */}
          <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-6">
            <label className="block text-sm font-medium text-gray-300 mb-3">Source Video</label>
            {videoPreview ? (
              <div className="space-y-3">
                <div className="rounded-lg overflow-hidden bg-black aspect-video">
                  <video src={videoPreview} controls className="w-full h-full object-contain" />
                </div>
                <button
                  onClick={() => { setVideoPreview(null); setVideoUrl('') }}
                  className="text-sm text-red-400 hover:text-red-300"
                >
                  Remove video
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div
                  onClick={() => fileRef.current?.click()}
                  className="border-2 border-dashed border-gray-700 hover:border-violet-500/50 rounded-lg p-8 text-center cursor-pointer transition-colors"
                >
                  <Upload className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">Click to upload video</p>
                  <p className="text-xs text-gray-500 mt-1">MP4, MOV (max 50MB, 30s)</p>
                </div>
                <input ref={fileRef} type="file" accept="video/*" onChange={handleFileUpload} className="hidden" />

                <div className="text-center text-xs text-gray-500">OR</div>

                <input
                  type="url"
                  value={videoUrl && !videoUrl.startsWith('data:') ? videoUrl : ''}
                  onChange={e => {
                    setVideoUrl(e.target.value)
                    setVideoPreview(e.target.value)
                  }}
                  placeholder="Paste video URL..."
                  className="w-full rounded-lg border border-gray-700 bg-gray-800/50 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:border-violet-500 focus:outline-none"
                />
              </div>
            )}
          </div>

          {/* Style Grid */}
          <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-6">
            <label className="block text-sm font-medium text-gray-300 mb-3">Choose Style</label>
            <div className="grid grid-cols-2 gap-2">
              {STYLES.map(s => (
                <button
                  key={s.id}
                  onClick={() => setStyle(s.id)}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    style === s.id
                      ? 'border-pink-500 bg-pink-600/10'
                      : 'border-gray-700 bg-gray-800/30 hover:border-gray-600'
                  }`}
                >
                  <div className="text-sm font-medium text-white">{s.name}</div>
                  <div className="text-xs text-gray-500">{s.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Extra options */}
          <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Custom Prompt (optional)</label>
              <input
                type="text"
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                placeholder="Additional style guidance..."
                className="w-full rounded-lg border border-gray-700 bg-gray-800/50 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:border-violet-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Style Strength: {Math.round(strength * 100)}%</label>
              <input
                type="range"
                min={0.1}
                max={1.0}
                step={0.05}
                value={strength}
                onChange={e => setStrength(Number(e.target.value))}
                className="w-full accent-pink-500"
              />
            </div>
          </div>

          <button
            onClick={handleTransform}
            disabled={loading || !videoUrl}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-pink-600 to-violet-600 hover:from-pink-500 hover:to-violet-500 disabled:opacity-50 text-white px-6 py-4 rounded-xl font-semibold transition-all text-lg"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Palette className="w-5 h-5" />}
            {loading ? 'Transforming...' : 'Transform Video'}
          </button>
        </div>

        {/* Right: Result */}
        <div className="space-y-4">
          <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-6 sticky top-6">
            <h3 className="text-sm font-medium text-gray-300 mb-3">Result</h3>
            {result ? (
              <div className="space-y-4">
                <div className="rounded-lg overflow-hidden bg-black aspect-video">
                  <video src={result.videoUrl} controls autoPlay loop className="w-full h-full object-contain" />
                </div>
                <div className="text-xs text-gray-500">
                  Style: {result.style} | Model: {result.model}
                </div>
                <a
                  href={result.videoUrl}
                  download
                  className="flex items-center justify-center gap-2 w-full bg-gray-800 hover:bg-gray-700 text-white px-4 py-2.5 rounded-lg text-sm transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download
                </a>
              </div>
            ) : loading ? (
              <div className="aspect-video bg-gray-800/50 rounded-lg flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-pink-400" />
                <p className="text-sm text-gray-400">Applying style transfer...</p>
              </div>
            ) : (
              <div className="aspect-video bg-gray-800/50 rounded-lg flex flex-col items-center justify-center gap-2">
                <Video className="w-8 h-8 text-gray-600" />
                <p className="text-sm text-gray-500">Transformed video will appear here</p>
              </div>
            )}
          </div>

          {error && (
            <div className="bg-red-900/30 border border-red-800 rounded-lg p-4 text-sm text-red-300">{error}</div>
          )}
        </div>
      </div>
    </div>
  )
}
