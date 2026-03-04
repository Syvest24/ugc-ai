'use client'
import { useState, useRef } from 'react'
import { Loader2, Upload, Download, Wand2, ImageIcon, Eraser, ZoomIn, Palette, Expand } from 'lucide-react'

const OPERATIONS = [
  { id: 'enhance', name: 'AI Enhance', desc: 'Improve quality', icon: Wand2, color: 'violet' },
  { id: 'remove-bg', name: 'Remove BG', desc: 'Remove background', icon: Eraser, color: 'pink' },
  { id: 'upscale', name: 'Upscale', desc: 'Increase resolution', icon: ZoomIn, color: 'blue' },
  { id: 'restyle', name: 'Restyle', desc: 'Change art style', icon: Palette, color: 'emerald' },
  { id: 'extend', name: 'Extend', desc: 'AI outpainting', icon: Expand, color: 'amber' },
]

const RESTYLE_OPTIONS = [
  { id: 'anime', name: 'Anime' },
  { id: 'oil-painting', name: 'Oil Painting' },
  { id: 'watercolor', name: 'Watercolor' },
  { id: 'sketch', name: 'Pencil Sketch' },
  { id: 'pop-art', name: 'Pop Art' },
  { id: '3d-render', name: '3D Render' },
  { id: 'pixel-art', name: 'Pixel Art' },
  { id: 'cyberpunk', name: 'Cyberpunk' },
]

export default function ImageEditorPage() {
  const [imageUrl, setImageUrl] = useState('')
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [operation, setOperation] = useState('enhance')
  const [restyleOption, setRestyleOption] = useState('anime')
  const [prompt, setPrompt] = useState('')
  const [scaleFactor, setScaleFactor] = useState(2)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ imageUrl: string; model: string; operation: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    setImagePreview(url)
    const reader = new FileReader()
    reader.onload = () => setImageUrl(reader.result as string)
    reader.readAsDataURL(file)
  }

  const handleEdit = async () => {
    if (!imageUrl) return
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const body: Record<string, unknown> = { imageUrl, operation }
      if (operation === 'restyle') body.style = restyleOption
      if (operation === 'upscale') body.scaleFactor = scaleFactor
      if (prompt) body.prompt = prompt

      const res = await fetch('/api/image/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error || 'Edit failed')
      setResult(json.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-600/30 flex items-center justify-center">
            <Wand2 className="w-5 h-5 text-blue-400" />
          </div>
          AI Image Editor
        </h1>
        <p className="text-gray-400 mt-2">Enhance, upscale, remove backgrounds, and restyle your images with AI.</p>
      </div>

      {/* Operation Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {OPERATIONS.map(op => {
          const Icon = op.icon
          return (
            <button
              key={op.id}
              onClick={() => setOperation(op.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border whitespace-nowrap text-sm font-medium transition-all ${
                operation === op.id
                  ? 'border-violet-500 bg-violet-600/10 text-violet-300'
                  : 'border-gray-700 bg-gray-800/30 text-gray-400 hover:border-gray-600'
              }`}
            >
              <Icon className="w-4 h-4" />
              {op.name}
            </button>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Source */}
        <div className="space-y-6">
          <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-6">
            <label className="block text-sm font-medium text-gray-300 mb-3">Source Image</label>
            {imagePreview ? (
              <div className="space-y-3">
                <div className="rounded-lg overflow-hidden bg-gray-800/50">
                  <img src={imagePreview} alt="Source" className="max-h-96 w-full object-contain" />
                </div>
                <button
                  onClick={() => { setImagePreview(null); setImageUrl(''); setResult(null) }}
                  className="text-sm text-red-400 hover:text-red-300"
                >
                  Remove image
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div
                  onClick={() => fileRef.current?.click()}
                  className="border-2 border-dashed border-gray-700 hover:border-violet-500/50 rounded-lg p-10 text-center cursor-pointer transition-colors"
                >
                  <ImageIcon className="w-10 h-10 text-gray-500 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">Click to upload image</p>
                  <p className="text-xs text-gray-500 mt-1">JPG, PNG, WebP</p>
                </div>
                <input ref={fileRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />

                <input
                  type="url"
                  value={imageUrl && !imageUrl.startsWith('data:') ? imageUrl : ''}
                  onChange={e => {
                    setImageUrl(e.target.value)
                    setImagePreview(e.target.value)
                  }}
                  placeholder="Or paste image URL..."
                  className="w-full rounded-lg border border-gray-700 bg-gray-800/50 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:border-violet-500 focus:outline-none"
                />
              </div>
            )}
          </div>

          {/* Operation-specific options */}
          {operation === 'restyle' && (
            <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-6">
              <label className="block text-sm font-medium text-gray-300 mb-3">Art Style</label>
              <div className="grid grid-cols-2 gap-2">
                {RESTYLE_OPTIONS.map(s => (
                  <button
                    key={s.id}
                    onClick={() => setRestyleOption(s.id)}
                    className={`p-3 rounded-lg border text-sm text-left transition-all ${
                      restyleOption === s.id
                        ? 'border-emerald-500 bg-emerald-600/10 text-emerald-300'
                        : 'border-gray-700 bg-gray-800/30 text-gray-400 hover:border-gray-600'
                    }`}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {operation === 'upscale' && (
            <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">Scale Factor: {scaleFactor}x</label>
              <input
                type="range"
                min={2}
                max={4}
                value={scaleFactor}
                onChange={e => setScaleFactor(Number(e.target.value))}
                className="w-full accent-blue-500"
              />
            </div>
          )}

          {(operation === 'inpaint' || operation === 'extend') && (
            <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">Prompt</label>
              <input
                type="text"
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                placeholder="Describe what you want..."
                className="w-full rounded-lg border border-gray-700 bg-gray-800/50 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:border-violet-500 focus:outline-none"
              />
            </div>
          )}

          <button
            onClick={handleEdit}
            disabled={loading || !imageUrl}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 disabled:opacity-50 text-white px-6 py-4 rounded-xl font-semibold transition-all text-lg"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wand2 className="w-5 h-5" />}
            {loading ? 'Processing...' : `Apply ${OPERATIONS.find(o => o.id === operation)?.name || 'Edit'}`}
          </button>

          {error && (
            <div className="bg-red-900/30 border border-red-800 rounded-lg p-4 text-sm text-red-300">{error}</div>
          )}
        </div>

        {/* Right: Result */}
        <div>
          <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-6 sticky top-6">
            <h3 className="text-sm font-medium text-gray-300 mb-3">Result</h3>
            {result ? (
              <div className="space-y-4">
                <div className="rounded-lg overflow-hidden bg-gray-800/50">
                  <img src={result.imageUrl} alt="Result" className="max-h-[500px] w-full object-contain" />
                </div>
                <div className="text-xs text-gray-500">
                  Operation: {result.operation} | Model: {result.model}
                </div>
                <div className="flex gap-2">
                  <a
                    href={result.imageUrl}
                    download
                    target="_blank"
                    className="flex-1 flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 text-white px-4 py-2.5 rounded-lg text-sm transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </a>
                  <button
                    onClick={() => {
                      setImageUrl(result.imageUrl)
                      setImagePreview(result.imageUrl)
                      setResult(null)
                    }}
                    className="flex-1 flex items-center justify-center gap-2 bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 px-4 py-2.5 rounded-lg text-sm transition-colors border border-violet-600/30"
                  >
                    <Wand2 className="w-4 h-4" />
                    Edit Again
                  </button>
                </div>
              </div>
            ) : loading ? (
              <div className="aspect-square bg-gray-800/50 rounded-lg flex flex-col items-center justify-center gap-3 max-h-96">
                <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
                <p className="text-sm text-gray-400">Processing image...</p>
              </div>
            ) : (
              <div className="aspect-square bg-gray-800/50 rounded-lg flex flex-col items-center justify-center gap-2 max-h-96">
                <ImageIcon className="w-8 h-8 text-gray-600" />
                <p className="text-sm text-gray-500">Edited image will appear here</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
