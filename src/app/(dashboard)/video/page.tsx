'use client'
import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import toast from 'react-hot-toast'
import {
  Video,
  Image,
  Loader2,
  Palette,
  Sparkles,
  Zap,
  ArrowLeft,
} from 'lucide-react'
import Link from 'next/link'
import dynamic from 'next/dynamic'

const VideoPreview = dynamic(() => import('@/components/VideoPreview'), { ssr: false })
import {
  TEMPLATES, CAPTION_STYLES, HOOK_STYLES, VOICES,
  type TTSResult, type StockClip,
} from '@/lib/video-constants'
import ScriptHookForm from '@/components/video/ScriptHookForm'
import VoiceoverSection from '@/components/video/VoiceoverSection'
import ExportRenderSection from '@/components/video/ExportRenderSection'

export default function VideoPage() {
  const searchParams = useSearchParams()
  const contentId = searchParams.get('contentId')
  const preloadedVideoUrl = searchParams.get('videoUrl')
  const preloadedVideoId = searchParams.get('videoId')

  // State
  const [step, setStep] = useState(1)
  const [scriptText, setScriptText] = useState('')
  const [hookText, setHookText] = useState('')
  const [ctaText, setCtaText] = useState('Link in Bio')
  const [productName, setProductName] = useState('')
  const [productDescription, setProductDescription] = useState('')
  const [platform, setPlatform] = useState('tiktok')
  const [autoFillLoading, setAutoFillLoading] = useState(false)
  const [autoFlowLoading, setAutoFlowLoading] = useState(false)

  // Voice settings
  const [selectedVoice, setSelectedVoice] = useState('jenny')
  const [voiceRate, setVoiceRate] = useState('+0%')
  const [ttsResult, setTtsResult] = useState<TTSResult | null>(null)
  const [ttsLoading, setTtsLoading] = useState(false)

  // Stock footage
  const [stockClips, setStockClips] = useState<StockClip[]>([])
  const [selectedClip, setSelectedClip] = useState<StockClip | null>(null)
  const [footageLoading, setFootageLoading] = useState(false)

  // AI generated images as backgrounds
  const [aiImages, setAiImages] = useState<Array<{ id: string; imageUrl: string; prompt: string }>>([])
  const [aiImageUrl, setAiImageUrl] = useState<string | null>(null)
  const [aiImagesLoading, setAiImagesLoading] = useState(false)

  // Video settings
  const [selectedTemplate, setSelectedTemplate] = useState('CaptionStyle')
  const [captionStyle, setCaptionStyle] = useState('karaoke')
  const [hookStyle, setHookStyle] = useState('pop')
  const [colorAccent, setColorAccent] = useState('#A855F7')

  // Render
  const [rendering, setRendering] = useState(false)
  const [videoUrl, setVideoUrl] = useState<string | null>(preloadedVideoUrl || null)

  // Export options
  const [exportFormat, setExportFormat] = useState<'mp4' | 'gif'>('mp4')
  const [exportQuality, setExportQuality] = useState<'draft' | 'standard' | 'high'>('standard')
  const [exportAspectRatio, setExportAspectRatio] = useState<'' | '9:16' | '1:1' | '16:9' | '4:5'>('')
  const [extractAudioOption, setExtractAudioOption] = useState(false)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)

  // Auto-fill from contentId
  useEffect(() => {
    if (contentId) {
      setAutoFillLoading(true)
      fetch(`/api/content/${contentId}`)
        .then(res => res.json())
        .then(data => {
          if (data.error) {
            toast.error('Could not load content: ' + data.error)
            return
          }
          const d = data.data
          // Fill in all fields from saved content
          setProductName(d.productName || '')
          setProductDescription(d.productDescription || '')
          setPlatform(d.platform || 'tiktok')

          // Use first hook
          const hooks = d.output?.hookBank || []
          if (hooks.length > 0) {
            setHookText(hooks[0])
          }

          // Set script
          if (d.output?.script) {
            setScriptText(d.output.script)
          }

          // Set CTA from variations or ctaType
          const ctas = d.output?.ctaVariations || []
          if (ctas.length > 0) {
            setCtaText(ctas[0])
          } else if (d.ctaType) {
            setCtaText(d.ctaType)
          }

          toast.success('Content loaded! Fields pre-filled from your generated content.')
        })
        .catch(() => {
          toast.error('Failed to load content')
        })
        .finally(() => {
          setAutoFillLoading(false)
        })
    }
  }, [contentId])

  // Load brand kit defaults (voice, color)
  useEffect(() => {
    fetch('/api/brand-kit')
      .then(res => res.json())
      .then(data => {
        if (data.data?.exists && data.data?.brandKit) {
          const kit = data.data.brandKit
          if (kit.defaultVoice) setSelectedVoice(kit.defaultVoice)
          if (kit.primaryColor) setColorAccent(kit.primaryColor)
          if (kit.defaultPlatform && !contentId) setPlatform(kit.defaultPlatform)
        }
      })
      .catch(() => {})
  }, [contentId])

  // Handle one-click auto-flow
  const handleAutoFlow = async () => {
    if (!contentId && (!scriptText.trim() || !hookText.trim())) {
      toast.error('Script and hook are required')
      return
    }

    setAutoFlowLoading(true)
    toast.loading('Auto-creating video with AI voiceover... This may take 1-2 minutes', { id: 'auto-flow' })

    try {
      const payload = contentId
        ? { contentId, template: selectedTemplate, voice: selectedVoice, voiceRate, captionStyle, hookStyle, colorAccent }
        : {
            hook: hookText,
            script: scriptText,
            cta: ctaText,
            platform,
            template: selectedTemplate,
            voice: selectedVoice,
            voiceRate,
            captionStyle,
            hookStyle,
            colorAccent,
          }

      const res = await fetch('/api/video/auto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Auto-flow failed', { id: 'auto-flow' })
        return
      }
      setVideoUrl(data.data.videoPath)
      toast.success('Video created automatically!', { id: 'auto-flow' })
    } catch {
      toast.error('Auto video creation failed', { id: 'auto-flow' })
    } finally {
      setAutoFlowLoading(false)
    }
  }

  // Step 1: Input content
  const handleGenerateTTS = async () => {
    if (!scriptText.trim()) {
      toast.error('Enter script text first')
      return
    }
    setTtsLoading(true)
    try {
      const res = await fetch('/api/video/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: scriptText,
          voice: selectedVoice,
          rate: voiceRate,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'TTS failed')
        return
      }
      setTtsResult({
        audioUrl: data.data.audioUrl,
        duration: data.data.duration,
        wordBoundaries: data.data.wordBoundaries,
      })
      toast.success('Voiceover generated!')
    } catch {
      toast.error('Failed to generate voiceover')
    } finally {
      setTtsLoading(false)
    }
  }

  const handleSearchFootage = async () => {
    if (!productName.trim()) {
      toast.error('Enter product name first')
      return
    }
    setFootageLoading(true)
    try {
      const res = await fetch('/api/video/footage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName,
          productDescription,
          platform,
          type: 'image',
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Footage search failed')
        return
      }
      setStockClips(data.data?.clips || [])
      if (data.data?.clips?.length) {
        toast.success(`Found ${data.data.clips.length} stock images!`)
      } else {
        toast.error('No footage found. Try different product details.')
      }
    } catch {
      toast.error('Failed to search footage')
    } finally {
      setFootageLoading(false)
    }
  }

  const handleLoadAiImages = async () => {
    setAiImagesLoading(true)
    try {
      const res = await fetch('/api/image?limit=20')
      const data = await res.json()
      if (data.success && data.data?.length) {
        setAiImages(data.data)
        toast.success(`Found ${data.data.length} AI-generated images`)
      } else {
        toast.error('No AI images found. Generate some in the Images page first.')
      }
    } catch {
      toast.error('Failed to load AI images')
    } finally {
      setAiImagesLoading(false)
    }
  }

  const handleRenderVideo = async () => {
    if (!scriptText.trim() || !hookText.trim()) {
      toast.error('Script text and hook are required')
      return
    }

    setRendering(true)
    setVideoUrl(null)
    setAudioUrl(null)
    toast.loading(`Rendering ${exportFormat.toUpperCase()}... This may take 1-2 minutes`, { id: 'render' })

    try {
      const scriptLines = scriptText
        .split('\n')
        .map(l => l.replace(/^\[.*?\]\s*/, '').trim())
        .filter(l => l.length > 0)
        .slice(0, 8) // Max 8 lines

      const res = await fetch('/api/video/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template: selectedTemplate,
          hook: hookText,
          scriptLines,
          cta: ctaText,
          audioSrc: ttsResult?.audioUrl,
          backgroundImage: aiImageUrl || selectedClip?.url,
          wordBoundaries: ttsResult?.wordBoundaries,
          platform,
          durationMs: ttsResult?.duration ? ttsResult.duration + 3000 : 30000,
          captionStyle,
          hookStyle,
          colorAccent,
          contentId: contentId || undefined,
          // Export options
          format: exportFormat,
          quality: exportQuality,
          ...(exportAspectRatio ? { aspectRatio: exportAspectRatio } : {}),
          extractAudio: extractAudioOption,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Render failed', { id: 'render' })
        return
      }
      setVideoUrl(data.data.videoPath)
      if (data.data.audioPath) setAudioUrl(data.data.audioPath)
      toast.success(`${exportFormat === 'gif' ? 'GIF' : 'Video'} rendered successfully!`, { id: 'render' })
    } catch {
      toast.error('Video rendering failed', { id: 'render' })
    } finally {
      setRendering(false)
    }
  }

  const sectionHeader = (title: string, step: number, icon: React.ReactNode) => (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-8 h-8 rounded-lg bg-violet-600/20 border border-violet-600/30 flex items-center justify-center text-sm font-bold text-violet-400">
        {step}
      </div>
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="font-semibold text-white">{title}</h2>
      </div>
    </div>
  )

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          {contentId && (
            <Link
              href="/generate"
              className="flex items-center gap-1 text-gray-400 hover:text-gray-200 transition-colors text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Link>
          )}
          <h1 className="text-3xl font-bold text-white">Create Video</h1>
        </div>
        <p className="text-gray-400">
          {contentId
            ? 'Your generated content has been pre-filled. Customize settings and render your video.'
            : 'Turn your generated scripts into downloadable UGC videos with AI voiceover'}
        </p>

        {/* Auto-Fill Loading Banner */}
        {autoFillLoading && (
          <div className="mt-4 flex items-center gap-2 bg-violet-600/10 border border-violet-600/30 rounded-lg px-4 py-3">
            <Loader2 className="w-4 h-4 text-violet-400 animate-spin" />
            <span className="text-sm text-violet-300">Loading content from your generation...</span>
          </div>
        )}

        {/* One-Click Auto-Flow Banner */}
        {(contentId || (scriptText.trim() && hookText.trim())) && !videoUrl && (
          <div className="mt-4 bg-gradient-to-r from-amber-600/10 to-orange-600/10 border border-amber-600/30 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-amber-300 flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Quick Auto-Flow
                </h3>
                <p className="text-xs text-amber-400/70 mt-1">
                  One-click: auto-generate voiceover + render video with current settings
                </p>
              </div>
              <button
                onClick={handleAutoFlow}
                disabled={autoFlowLoading || rendering}
                className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors"
              >
                {autoFlowLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    Auto-Create Video
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-6">
        {/* Step 1: Script & Hook */}
        <ScriptHookForm
          productName={productName} setProductName={setProductName}
          platform={platform} setPlatform={setPlatform}
          productDescription={productDescription} setProductDescription={setProductDescription}
          hookText={hookText} setHookText={setHookText}
          scriptText={scriptText} setScriptText={setScriptText}
          ctaText={ctaText} setCtaText={setCtaText}
          sectionHeader={sectionHeader}
        />

        {/* Step 2: Voice */}
        <VoiceoverSection
          selectedVoice={selectedVoice} setSelectedVoice={setSelectedVoice}
          voiceRate={voiceRate} setVoiceRate={setVoiceRate}
          ttsResult={ttsResult} ttsLoading={ttsLoading}
          scriptText={scriptText}
          onGenerateTTS={handleGenerateTTS}
          sectionHeader={sectionHeader}
        />

        {/* Step 3: Background */}
        <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-6">
          {sectionHeader('Background', 3, <Image className="w-4 h-4 text-violet-400" />)}

          <div className="space-y-4">
          <div className="flex items-center gap-3">
            <button
              onClick={handleSearchFootage}
              disabled={footageLoading || !productName.trim()}
              className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors border border-gray-700"
            >
              {footageLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Image className="w-4 h-4" />
              )}
              {footageLoading ? 'Searching...' : 'Search Stock Images'}
            </button>

            <button
              onClick={handleLoadAiImages}
              disabled={aiImagesLoading}
              className="flex items-center gap-2 bg-violet-700/30 hover:bg-violet-700/50 disabled:opacity-50 text-violet-300 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors border border-violet-600/40"
            >
              {aiImagesLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              {aiImagesLoading ? 'Loading...' : 'Use AI Images'}
            </button>
          </div>

            {/* AI Generated Images section */}
            {aiImages.length > 0 && (
              <div>
                <p className="text-sm text-gray-300 mb-2">Your AI-generated images:</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                  <button
                    onClick={() => { setAiImageUrl(null); setSelectedClip(null) }}
                    className={`aspect-[9/16] rounded-lg border-2 flex items-center justify-center transition-all ${
                      !aiImageUrl && !selectedClip
                        ? 'border-violet-500 bg-violet-600/20'
                        : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                    }`}
                  >
                    <div className="text-center p-2">
                      <Palette className="w-6 h-6 text-gray-400 mx-auto mb-1" />
                      <span className="text-xs text-gray-400">Gradient</span>
                    </div>
                  </button>
                  {aiImages.map(img => (
                    <button
                      key={img.id}
                      onClick={() => { setAiImageUrl(img.imageUrl); setSelectedClip(null) }}
                      className={`aspect-[9/16] rounded-lg border-2 overflow-hidden transition-all ${
                        aiImageUrl === img.imageUrl
                          ? 'border-violet-500 ring-2 ring-violet-500/30'
                          : 'border-gray-700 hover:border-gray-600'
                      }`}
                      title={img.prompt}
                    >
                      <img src={img.imageUrl} alt={img.prompt} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {stockClips.length > 0 && (
              <div>
                <p className="text-sm text-gray-300 mb-2">Select a background image:</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                  <button
                    onClick={() => { setSelectedClip(null); setAiImageUrl(null) }}
                    className={`aspect-[9/16] rounded-lg border-2 flex items-center justify-center transition-all ${
                      !selectedClip && !aiImageUrl
                        ? 'border-violet-500 bg-violet-600/20'
                        : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                    }`}
                  >
                    <div className="text-center p-2">
                      <Palette className="w-6 h-6 text-gray-400 mx-auto mb-1" />
                      <span className="text-xs text-gray-400">Gradient</span>
                    </div>
                  </button>
                  {stockClips.map(clip => (
                    <button
                      key={clip.id}
                      onClick={() => { setSelectedClip(clip); setAiImageUrl(null) }}
                      className={`aspect-[9/16] rounded-lg border-2 overflow-hidden transition-all ${
                        selectedClip?.id === clip.id
                          ? 'border-violet-500 ring-2 ring-violet-500/30'
                          : 'border-gray-700 hover:border-gray-600'
                      }`}
                    >
                      <img
                        src={clip.previewUrl}
                        alt="Stock"
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
                {selectedClip?.photographer && (
                  <p className="text-xs text-gray-500 mt-2">
                    Photo by {selectedClip.photographer} on Pexels
                  </p>
                )}
              </div>
            )}

            {stockClips.length === 0 && !footageLoading && (
              <p className="text-sm text-gray-500">
                No background selected — will use an animated gradient background.
              </p>
            )}
          </div>
        </div>

        {/* Step 4: Video Style */}
        <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-6">
          {sectionHeader('Video Style', 4, <Sparkles className="w-4 h-4 text-violet-400" />)}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Template</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {TEMPLATES.map(t => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setSelectedTemplate(t.id)
                      setColorAccent(t.color)
                    }}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      selectedTemplate === t.id
                        ? 'border-violet-500 bg-violet-600/10'
                        : 'border-gray-700 bg-gray-800/30 hover:border-gray-600'
                    }`}
                  >
                    <div className="text-2xl mb-2">{t.icon}</div>
                    <div className="text-sm font-semibold text-white">{t.name}</div>
                    <div className="text-xs text-gray-400 mt-1">{t.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Caption Animation</label>
                <select
                  value={captionStyle}
                  onChange={e => setCaptionStyle(e.target.value)}
                  className="w-full rounded-lg border border-gray-700 bg-gray-800/50 px-3 py-2.5 text-sm text-gray-100 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 transition-colors"
                >
                  {CAPTION_STYLES.map(s => (
                    <option key={s.id} value={s.id}>{s.name} — {s.desc}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Hook Animation</label>
                <select
                  value={hookStyle}
                  onChange={e => setHookStyle(e.target.value)}
                  className="w-full rounded-lg border border-gray-700 bg-gray-800/50 px-3 py-2.5 text-sm text-gray-100 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 transition-colors"
                >
                  {HOOK_STYLES.map(s => (
                    <option key={s.id} value={s.id}>{s.name} — {s.desc}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Accent Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={colorAccent}
                  onChange={e => setColorAccent(e.target.value)}
                  className="w-10 h-10 rounded-lg border border-gray-700 bg-transparent cursor-pointer"
                />
                <div className="flex gap-2">
                  {['#A855F7', '#EC4899', '#3B82F6', '#10B981', '#F59E0B', '#EF4444'].map(c => (
                    <button
                      key={c}
                      onClick={() => setColorAccent(c)}
                      className={`w-8 h-8 rounded-full transition-all ${
                        colorAccent === c ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-900' : ''
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Live Preview */}
        {(hookText || scriptText) && (
          <VideoPreview
            template={selectedTemplate}
            hook={hookText}
            scriptLines={scriptText.split('\n').filter((l: string) => l.trim())}
            cta={ctaText}
            colorAccent={colorAccent}
            captionStyle={captionStyle}
            hookStyle={hookStyle}
            backgroundImage={aiImageUrl || selectedClip?.previewUrl}
            platform={platform}
          />
        )}

        {/* Step 5: Export & Render + Output */}
        <ExportRenderSection
          exportFormat={exportFormat} setExportFormat={setExportFormat}
          exportAspectRatio={exportAspectRatio} setExportAspectRatio={setExportAspectRatio}
          exportQuality={exportQuality} setExportQuality={setExportQuality}
          extractAudioOption={extractAudioOption} setExtractAudioOption={setExtractAudioOption}
          selectedTemplate={selectedTemplate} selectedVoice={selectedVoice}
          ttsResult={ttsResult} selectedClip={selectedClip}
          platform={platform} scriptText={scriptText} hookText={hookText}
          rendering={rendering} videoUrl={videoUrl} audioUrl={audioUrl}
          onRender={handleRenderVideo}
          sectionHeader={sectionHeader}
        />
      </div>
    </div>
  )
}
