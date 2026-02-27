'use client'

import { Video, Play, Download, Loader2 } from 'lucide-react'
import { TEMPLATES, VOICES, type TTSResult, type StockClip } from '@/lib/video-constants'

interface ExportRenderSectionProps {
  exportFormat: 'mp4' | 'gif'
  setExportFormat: (v: 'mp4' | 'gif') => void
  exportAspectRatio: '' | '9:16' | '1:1' | '16:9' | '4:5'
  setExportAspectRatio: (v: '' | '9:16' | '1:1' | '16:9' | '4:5') => void
  exportQuality: 'draft' | 'standard' | 'high'
  setExportQuality: (v: 'draft' | 'standard' | 'high') => void
  extractAudioOption: boolean
  setExtractAudioOption: (v: boolean) => void
  selectedTemplate: string
  selectedVoice: string
  ttsResult: TTSResult | null
  selectedClip: StockClip | null
  platform: string
  scriptText: string
  hookText: string
  rendering: boolean
  videoUrl: string | null
  audioUrl: string | null
  onRender: () => void
  sectionHeader: (title: string, step: number, icon: React.ReactNode) => React.ReactNode
}

export default function ExportRenderSection({
  exportFormat, setExportFormat,
  exportAspectRatio, setExportAspectRatio,
  exportQuality, setExportQuality,
  extractAudioOption, setExtractAudioOption,
  selectedTemplate, selectedVoice,
  ttsResult, selectedClip, platform,
  scriptText, hookText,
  rendering, videoUrl, audioUrl,
  onRender, sectionHeader,
}: ExportRenderSectionProps) {
  return (
    <>
      <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-6">
        {sectionHeader('Export & Render', 5, <Video className="w-4 h-4 text-violet-400" />)}

        <div className="space-y-4">
          {/* Export Format */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Format</label>
            <div className="flex gap-2">
              {[
                { id: 'mp4' as const, label: 'MP4 Video', icon: '🎬', desc: 'Standard video file' },
                { id: 'gif' as const, label: 'GIF', icon: '🖼️', desc: 'Animated preview (10s max)' },
              ].map(fmt => (
                <button
                  key={fmt.id}
                  onClick={() => setExportFormat(fmt.id)}
                  className={`flex-1 p-3 rounded-lg border text-left transition-all ${
                    exportFormat === fmt.id
                      ? 'border-violet-500 bg-violet-600/10 text-white'
                      : 'border-gray-700 bg-gray-800/40 text-gray-400 hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <span>{fmt.icon}</span>
                    {fmt.label}
                  </div>
                  <p className="text-xs mt-0.5 opacity-70">{fmt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Aspect Ratio Override */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Aspect Ratio
              <span className="text-xs text-gray-500 ml-1">(override platform default)</span>
            </label>
            <div className="flex gap-2">
              {[
                { id: '' as const, label: 'Auto', desc: 'Use platform default' },
                { id: '9:16' as const, label: '9:16', desc: 'Vertical/Stories' },
                { id: '1:1' as const, label: '1:1', desc: 'Square/Feed' },
                { id: '16:9' as const, label: '16:9', desc: 'Landscape/YT' },
                { id: '4:5' as const, label: '4:5', desc: 'Portrait/IG' },
              ].map(ar => (
                <button
                  key={ar.id || 'auto'}
                  onClick={() => setExportAspectRatio(ar.id)}
                  className={`flex-1 py-2 px-3 rounded-lg border text-center transition-all ${
                    exportAspectRatio === ar.id
                      ? 'border-violet-500 bg-violet-600/10 text-white'
                      : 'border-gray-700 bg-gray-800/40 text-gray-400 hover:border-gray-600'
                  }`}
                >
                  <div className="text-sm font-medium">{ar.label}</div>
                  <p className="text-[10px] mt-0.5 opacity-70">{ar.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Quality Preset */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Quality</label>
            <div className="flex gap-2">
              {[
                { id: 'draft' as const, label: '⚡ Draft', desc: 'Fast render, half-res' },
                { id: 'standard' as const, label: '✨ Standard', desc: 'Balanced quality' },
                { id: 'high' as const, label: '💎 High', desc: 'Best quality, slower' },
              ].map(q => (
                <button
                  key={q.id}
                  onClick={() => setExportQuality(q.id)}
                  className={`flex-1 py-2 px-3 rounded-lg border text-center transition-all ${
                    exportQuality === q.id
                      ? 'border-violet-500 bg-violet-600/10 text-white'
                      : 'border-gray-700 bg-gray-800/40 text-gray-400 hover:border-gray-600'
                  }`}
                >
                  <div className="text-sm font-medium">{q.label}</div>
                  <p className="text-[10px] mt-0.5 opacity-70">{q.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Audio extraction option */}
          {exportFormat === 'mp4' && (
            <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={extractAudioOption}
                onChange={e => setExtractAudioOption(e.target.checked)}
                className="rounded border-gray-600 bg-gray-800 text-violet-600 focus:ring-violet-500"
              />
              Also extract audio as MP3 download
            </label>
          )}

          {/* Render Summary */}
          <div className="bg-gray-800/40 border border-gray-700 rounded-lg p-4">
            <h3 className="text-sm font-medium text-white mb-2">Render Summary</h3>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
              <div className="text-gray-400">Template:</div>
              <div className="text-gray-200">{TEMPLATES.find(t => t.id === selectedTemplate)?.name}</div>
              <div className="text-gray-400">Voice:</div>
              <div className="text-gray-200">
                {VOICES.find(v => v.id === selectedVoice)?.name}
                {ttsResult ? ' ✓' : ' (not generated)'}
              </div>
              <div className="text-gray-400">Background:</div>
              <div className="text-gray-200">{selectedClip ? 'Stock Image' : 'Gradient'}</div>
              <div className="text-gray-400">Duration:</div>
              <div className="text-gray-200">
                {exportFormat === 'gif'
                  ? `~${Math.min(ttsResult ? Math.ceil((ttsResult.duration + 3000) / 1000) : 10, 10)}s (GIF cap)`
                  : ttsResult ? `~${Math.ceil((ttsResult.duration + 3000) / 1000)}s` : '~30s'}
              </div>
              <div className="text-gray-400">Output:</div>
              <div className="text-gray-200">
                {exportFormat.toUpperCase()} •{' '}
                {exportAspectRatio || (platform === 'twitter_x' || platform === 'linkedin' ? '1:1' : '9:16')} •{' '}
                {exportQuality.charAt(0).toUpperCase() + exportQuality.slice(1)}
              </div>
              <div className="text-gray-400">Platform:</div>
              <div className="text-gray-200">
                {platform === 'tiktok' ? 'TikTok' :
                 platform === 'instagram' ? 'Instagram' :
                 platform === 'youtube_shorts' ? 'YouTube Shorts' :
                 platform === 'twitter_x' ? 'Twitter/X' :
                 'LinkedIn'}
              </div>
            </div>
          </div>

          <button
            onClick={onRender}
            disabled={rendering || !scriptText.trim() || !hookText.trim()}
            className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-4 rounded-xl text-base font-semibold transition-all shadow-lg shadow-violet-500/20"
          >
            {rendering ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Rendering {exportFormat === 'gif' ? 'GIF' : 'Video'}...
              </>
            ) : (
              <>
                <Play className="w-5 h-5" />
                Render {exportFormat === 'gif' ? 'GIF' : 'Video'} ({exportQuality})
              </>
            )}
          </button>

          {exportFormat === 'gif' && (
            <p className="text-xs text-amber-400/80 text-center">
              ⚡ GIF renders are capped at 10 seconds and 15fps for reasonable file size.
            </p>
          )}

          {!ttsResult && exportFormat === 'mp4' && (
            <p className="text-xs text-amber-400/80 text-center">
              💡 Tip: Generate voiceover first for animated captions. Without it, static text slides will be used.
            </p>
          )}
        </div>
      </div>

      {/* Video Output */}
      {videoUrl && (
        <div className="bg-gray-900/60 border border-violet-600/40 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Video className="w-5 h-5 text-violet-400" />
              Your {videoUrl.endsWith('.gif') ? 'GIF' : 'Video'} is Ready!
            </h2>
            <div className="flex items-center gap-2">
              {audioUrl && (
                <a
                  href={audioUrl}
                  download
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors"
                >
                  <Download className="w-4 h-4" />
                  MP3 Audio
                </a>
              )}
              <a
                href={videoUrl}
                download
                className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors"
              >
                <Download className="w-4 h-4" />
                Download {videoUrl.endsWith('.gif') ? 'GIF' : 'MP4'}
              </a>
            </div>
          </div>
          <div className="flex justify-center">
            {videoUrl.endsWith('.gif') ? (
              <img
                src={videoUrl}
                alt="Generated GIF"
                className="max-h-[600px] rounded-xl shadow-xl shadow-violet-500/10 border border-gray-700"
              />
            ) : (
              <video
                src={videoUrl}
                controls
                className="max-h-[600px] rounded-xl shadow-xl shadow-violet-500/10 border border-gray-700"
              >
                <track kind="captions" />
              </video>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-3 text-center">
            Right-click → Save As to download. File is available for 2 hours.
          </p>
        </div>
      )}
    </>
  )
}
