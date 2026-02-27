'use client'
import { useState, useCallback } from 'react'
import toast from 'react-hot-toast'
import {
  Sparkles, Download, Heart, Trash2, Loader2, ImageIcon,
  ChevronDown, ChevronUp, Copy, RotateCcw, Layers, BookOpen, Clock, Star,
} from 'lucide-react'
import { IMAGE_STYLES, IMAGE_ASPECT_RATIOS, type ImageStyle } from '@/lib/image-constants'
import { usePromptStore, PRESET_TEMPLATES, TEMPLATE_CATEGORIES, type PromptTemplate } from '@/stores/prompt-store'

interface GeneratedImage {
  id: string
  prompt: string
  negativePrompt?: string | null
  provider: string
  model: string
  imageUrl: string
  width: number
  height: number
  style?: string | null
  seed?: number | null
  isFavorite: boolean
  createdAt: string
}

interface ImageGeneratorProps {
  onImageGenerated?: (image: GeneratedImage) => void
}

const inputClass = "w-full rounded-lg border border-gray-700 bg-gray-800/50 px-3 py-2.5 text-sm text-gray-100 placeholder:text-gray-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 transition-colors"

export default function ImageGenerator({ onImageGenerated }: ImageGeneratorProps) {
  const [prompt, setPrompt] = useState('')
  const [negativePrompt, setNegativePrompt] = useState('')
  const [style, setStyle] = useState<ImageStyle | ''>('')
  const [aspectRatio, setAspectRatio] = useState<string>('1:1')
  const [seed, setSeed] = useState<string>('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [loading, setLoading] = useState(false)
  const [enhancing, setEnhancing] = useState(false)
  const [batchMode, setBatchMode] = useState(false)
  const [batchCount, setBatchCount] = useState(3)
  const [batchLoading, setBatchLoading] = useState(false)
  const [batchResults, setBatchResults] = useState<GeneratedImage[]>([])
  const [showTemplates, setShowTemplates] = useState(false)
  const [templateCategory, setTemplateCategory] = useState<string>('product')
  const [result, setResult] = useState<GeneratedImage | null>(null)

  const { history, addToHistory, customTemplates } = usePromptStore()

  const selectedSize = IMAGE_ASPECT_RATIOS.find(ar => ar.id === aspectRatio) || IMAGE_ASPECT_RATIOS[0]

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt')
      return
    }

    setLoading(true)
    setResult(null)

    try {
      const res = await fetch('/api/image/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim(),
          negativePrompt: negativePrompt.trim() || undefined,
          style: style || undefined,
          width: selectedSize.width,
          height: selectedSize.height,
          seed: seed ? parseInt(seed) : undefined,
        }),
      })

      const data = await res.json()
      if (!data.success) {
        toast.error(data.error || 'Generation failed')
        return
      }

      const image: GeneratedImage = {
        id: data.data.id,
        prompt: prompt.trim(),
        negativePrompt: negativePrompt.trim() || null,
        provider: data.data.provider,
        model: data.data.model,
        imageUrl: data.data.imageUrl,
        width: data.data.width,
        height: data.data.height,
        style: data.data.style,
        seed: data.data.seed,
        isFavorite: false,
        createdAt: new Date().toISOString(),
      }

      setResult(image)
      addToHistory({ prompt: prompt.trim(), style: style || undefined, aspectRatio })
      toast.success('Image generated!')
      onImageGenerated?.(image)
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [prompt, negativePrompt, style, selectedSize, seed, onImageGenerated])

  const handleDownload = useCallback(async () => {
    if (!result) return
    try {
      const response = await fetch(result.imageUrl)
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `ugcforge-${result.id}.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success('Image downloaded!')
    } catch {
      toast.error('Download failed')
    }
  }, [result])

  const handleCopyPrompt = useCallback(() => {
    navigator.clipboard.writeText(prompt)
    toast.success('Prompt copied!')
  }, [prompt])

  const handleReuse = useCallback(() => {
    if (result?.seed) {
      setSeed(String(result.seed))
      toast.success('Seed applied — hit generate to create a variation')
    }
  }, [result])

  const handleEnhance = useCallback(async () => {
    if (!prompt.trim() || prompt.length < 3) {
      toast.error('Enter at least 3 characters to enhance')
      return
    }
    setEnhancing(true)
    try {
      const res = await fetch('/api/image/enhance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim(), style: style || undefined }),
      })
      const data = await res.json()
      if (data.success && data.data?.enhanced) {
        setPrompt(data.data.enhanced)
        toast.success('Prompt enhanced!')
      } else {
        toast.error(data.error || 'Enhancement failed')
      }
    } catch {
      toast.error('Could not enhance prompt')
    } finally {
      setEnhancing(false)
    }
  }, [prompt, style])

  const handleBatchGenerate = useCallback(async () => {
    if (!prompt.trim() || prompt.length < 3) {
      toast.error('Enter at least 3 characters')
      return
    }
    setBatchLoading(true)
    setBatchResults([])
    try {
      const res = await fetch('/api/image/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim(),
          negativePrompt: negativePrompt.trim() || undefined,
          width: selectedSize.width,
          height: selectedSize.height,
          mode: 'variations',
          count: batchCount,
        }),
      })
      const data = await res.json()
      if (!data.success) {
        toast.error(data.error || 'Batch generation failed')
        return
      }
      const images: GeneratedImage[] = data.data.images.map((img: Record<string, unknown>) => ({
        id: img.id as string,
        prompt: prompt.trim(),
        negativePrompt: negativePrompt.trim() || null,
        provider: img.provider as string,
        model: img.model as string,
        imageUrl: img.imageUrl as string,
        width: img.width as number,
        height: img.height as number,
        style: img.style as string | null,
        seed: img.seed as number | null,
        isFavorite: false,
        createdAt: new Date().toISOString(),
      }))
      setBatchResults(images)
      toast.success(`Generated ${data.data.succeeded}/${data.data.total} images`)
      images.forEach(img => onImageGenerated?.(img))
    } catch {
      toast.error('Batch generation failed')
    } finally {
      setBatchLoading(false)
    }
  }, [prompt, negativePrompt, selectedSize, batchCount, onImageGenerated])

  return (
    <div className="space-y-6">
      {/* Prompt Input */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Describe your image
        </label>
        <textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder="A sleek smartphone floating in space with colorful aurora lights in the background..."
          className={`${inputClass} resize-vertical min-h-[100px]`}
          rows={3}
          maxLength={1000}
        />
        <div className="mt-1 flex items-center justify-between text-xs text-gray-500">
          <button
            type="button"
            onClick={handleEnhance}
            disabled={enhancing || prompt.length < 3}
            className="flex items-center gap-1 text-violet-400 hover:text-violet-300 disabled:text-gray-600 disabled:cursor-not-allowed transition-colors"
          >
            {enhancing ? (
              <><Loader2 className="w-3 h-3 animate-spin" /> Enhancing...</>
            ) : (
              <><Sparkles className="w-3 h-3" /> Enhance with AI</>
            )}
          </button>
          <span>{prompt.length}/1000</span>
        </div>
      </div>

      {/* Templates & History */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <button
            type="button"
            onClick={() => setShowTemplates(!showTemplates)}
            className={`flex items-center gap-1 text-sm transition-colors ${
              showTemplates ? 'text-violet-400' : 'text-gray-500 hover:text-gray-400'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Templates
          </button>
          {history.length > 0 && (
            <span className="text-xs text-gray-600">
              <Clock className="w-3 h-3 inline mr-0.5" />
              {history.length} recent
            </span>
          )}
        </div>
        {showTemplates && (
          <div className="border border-gray-800 rounded-lg p-3 bg-gray-900/50 space-y-3">
            <div className="flex flex-wrap gap-1.5">
              {TEMPLATE_CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setTemplateCategory(cat.id)}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                    templateCategory === cat.id
                      ? 'bg-violet-600/20 text-violet-300 border border-violet-500/50'
                      : 'bg-gray-800 text-gray-400 border border-transparent hover:border-gray-700'
                  }`}
                >
                  {cat.emoji} {cat.name}
                </button>
              ))}
            </div>
            <div className="grid gap-2 max-h-48 overflow-y-auto">
              {(templateCategory === 'custom'
                ? customTemplates
                : PRESET_TEMPLATES.filter(t => t.category === templateCategory)
              ).map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setPrompt(t.prompt)
                    if (t.style) setStyle(t.style as ImageStyle)
                    setShowTemplates(false)
                    toast.success(`Template "${t.name}" applied`)
                  }}
                  className="text-left p-2.5 rounded-lg border border-gray-800 hover:border-violet-500/40 hover:bg-violet-600/5 transition-all"
                >
                  <div className="text-sm font-medium text-gray-300">{t.name}</div>
                  <div className="text-xs text-gray-500 line-clamp-1 mt-0.5">{t.prompt}</div>
                </button>
              ))}
              {templateCategory === 'custom' && customTemplates.length === 0 && (
                <p className="text-xs text-gray-600 py-2 text-center">
                  No custom templates yet. Generate an image and save its prompt as a template.
                </p>
              )}
            </div>
            {/* Recent history */}
            {history.length > 0 && (
              <div className="border-t border-gray-800 pt-2">
                <div className="text-xs text-gray-500 mb-1.5 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Recent Prompts
                </div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {history.slice(0, 8).map(h => (
                    <button
                      key={h.id}
                      type="button"
                      onClick={() => {
                        setPrompt(h.prompt)
                        if (h.style) setStyle(h.style as ImageStyle)
                        if (h.aspectRatio) setAspectRatio(h.aspectRatio)
                        setShowTemplates(false)
                      }}
                      className="w-full text-left p-1.5 rounded text-xs text-gray-400 hover:text-gray-300 hover:bg-gray-800/50 truncate transition-colors"
                    >
                      {h.prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Style Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Style</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
          <button
            type="button"
            onClick={() => setStyle('')}
            className={`px-3 py-2 rounded-lg text-xs font-medium transition-all border ${
              style === ''
                ? 'border-violet-500 bg-violet-600/20 text-violet-300'
                : 'border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-600'
            }`}
          >
            Auto
          </button>
          {IMAGE_STYLES.map(s => (
            <button
              key={s.id}
              type="button"
              onClick={() => setStyle(s.id)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-all border ${
                style === s.id
                  ? 'border-violet-500 bg-violet-600/20 text-violet-300'
                  : 'border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-600'
              }`}
            >
              {s.emoji} {s.name}
            </button>
          ))}
        </div>
      </div>

      {/* Aspect Ratio */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Aspect Ratio</label>
        <div className="flex flex-wrap gap-2">
          {IMAGE_ASPECT_RATIOS.map(ar => (
            <button
              key={ar.id}
              type="button"
              onClick={() => setAspectRatio(ar.id)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-all border ${
                aspectRatio === ar.id
                  ? 'border-violet-500 bg-violet-600/20 text-violet-300'
                  : 'border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-600'
              }`}
            >
              <span className="block">{ar.label}</span>
              <span className="block text-[10px] opacity-70">{ar.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Advanced options toggle */}
      <button
        type="button"
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-300 transition-colors"
      >
        {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        Advanced Options
      </button>

      {showAdvanced && (
        <div className="space-y-4 border border-gray-800 rounded-lg p-4 bg-gray-900/50">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Negative Prompt <span className="text-gray-500">(optional)</span>
            </label>
            <input
              type="text"
              value={negativePrompt}
              onChange={e => setNegativePrompt(e.target.value)}
              placeholder="blurry, low quality, text, watermark..."
              className={inputClass}
              maxLength={500}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Seed <span className="text-gray-500">(optional — same seed + prompt = same image)</span>
            </label>
            <input
              type="number"
              value={seed}
              onChange={e => setSeed(e.target.value)}
              placeholder="Random"
              className={inputClass}
            />
          </div>
        </div>
      )}

      {/* Generate Button */}
      <div className="space-y-3">
        {/* Batch toggle */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setBatchMode(!batchMode)}
            className={`flex items-center gap-1.5 text-sm transition-colors ${
              batchMode ? 'text-violet-400' : 'text-gray-500 hover:text-gray-400'
            }`}
          >
            <Layers className="w-4 h-4" />
            Batch Generate
          </button>
          {batchMode && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Variations:</span>
              {[2, 3, 4, 6].map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setBatchCount(n)}
                  className={`w-7 h-7 rounded text-xs font-medium transition-all ${
                    batchCount === n
                      ? 'bg-violet-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          )}
        </div>

        {batchMode ? (
          <button
            onClick={handleBatchGenerate}
            disabled={batchLoading || !prompt.trim()}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-gradient-to-r from-violet-600 to-purple-600 text-white font-semibold hover:from-violet-500 hover:to-purple-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-violet-900/30"
          >
            {batchLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generating {batchCount} variations...
              </>
            ) : (
              <>
                <Layers className="w-5 h-5" />
                Generate {batchCount} Variations
              </>
            )}
          </button>
        ) : (
          <button
            onClick={handleGenerate}
            disabled={loading || !prompt.trim()}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-gradient-to-r from-violet-600 to-purple-600 text-white font-semibold hover:from-violet-500 hover:to-purple-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-violet-900/30"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Generate Image
              </>
            )}
          </button>
        )}
      </div>

      {/* Loading state */}
      {(loading || batchLoading) && (
        <div className="flex flex-col items-center justify-center py-16 space-y-4">
          <div className="relative">
            <div className="w-20 h-20 rounded-full border-4 border-gray-700 border-t-violet-500 animate-spin" />
            <ImageIcon className="w-8 h-8 text-violet-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="text-gray-400 text-sm animate-pulse">
            {batchLoading
              ? `Generating ${batchCount} variations... This may take a while`
              : 'Creating your image... This may take 10-30 seconds'}
          </p>
        </div>
      )}

      {/* Result */}
      {result && !loading && (
        <div className="border border-gray-800 rounded-xl overflow-hidden bg-gray-900/50">
          <div className="relative group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={result.imageUrl}
              alt={result.prompt}
              width={result.width}
              height={result.height}
              className="w-full h-auto"
            />
            {/* Overlay actions */}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
              <button
                onClick={handleDownload}
                className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                title="Download"
              >
                <Download className="w-5 h-5" />
              </button>
              <button
                onClick={handleCopyPrompt}
                className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                title="Copy prompt"
              >
                <Copy className="w-5 h-5" />
              </button>
              {result.seed && (
                <button
                  onClick={handleReuse}
                  className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                  title="Reuse seed"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
          {/* Image info */}
          <div className="p-4 space-y-2">
            <p className="text-sm text-gray-300 line-clamp-2">{result.prompt}</p>
            <div className="flex flex-wrap gap-2 text-xs text-gray-500">
              <span className="px-2 py-0.5 rounded bg-gray-800">{result.provider}</span>
              <span className="px-2 py-0.5 rounded bg-gray-800">{result.model}</span>
              <span className="px-2 py-0.5 rounded bg-gray-800">{result.width}×{result.height}</span>
              {result.style && <span className="px-2 py-0.5 rounded bg-gray-800">{result.style}</span>}
              {result.seed && <span className="px-2 py-0.5 rounded bg-gray-800">seed: {result.seed}</span>}
            </div>
          </div>
        </div>
      )}

      {/* Batch Results */}
      {batchResults.length > 0 && !batchLoading && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-300">
            Generated {batchResults.length} variations
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {batchResults.map(img => (
              <div key={img.id} className="border border-gray-800 rounded-lg overflow-hidden bg-gray-900/50 group relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.imageUrl}
                  alt={img.prompt}
                  width={img.width}
                  height={img.height}
                  className="w-full h-auto"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <a
                    href={img.imageUrl}
                    download={`ugcforge-${img.id}.png`}
                    className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                    title="Download"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                </div>
                <div className="p-2 text-xs text-gray-500">
                  {img.seed && <span>seed: {img.seed}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
