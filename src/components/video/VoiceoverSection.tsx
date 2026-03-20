'use client'

import { useState, useEffect } from 'react'
import { Mic, Loader2, Volume2, RefreshCw, Sparkles } from 'lucide-react'
import { VOICES, type TTSResult } from '@/lib/video-constants'
import type { TTSEngine } from '@/lib/constants'

interface VoiceoverSectionProps {
  selectedVoice: string
  setSelectedVoice: (v: string) => void
  voiceRate: string
  setVoiceRate: (v: string) => void
  ttsResult: TTSResult | null
  ttsLoading: boolean
  scriptText: string
  onGenerateTTS: () => void
  sectionHeader: (title: string, step: number, icon: React.ReactNode) => React.ReactNode
  ttsEngine: TTSEngine
  setTtsEngine: (e: TTSEngine) => void
  googleAvailable: boolean
}

export default function VoiceoverSection({
  selectedVoice, setSelectedVoice,
  voiceRate, setVoiceRate,
  ttsResult, ttsLoading, scriptText,
  onGenerateTTS, sectionHeader,
  ttsEngine, setTtsEngine, googleAvailable,
}: VoiceoverSectionProps) {
  const [audioError, setAudioError] = useState(false)

  useEffect(() => {
    setAudioError(false)
  }, [ttsResult?.audioUrl])

  const filteredVoices = VOICES.filter(v => v.engine === ttsEngine)

  return (
    <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-6">
      {sectionHeader('AI Voiceover', 2, <Mic className="w-4 h-4 text-violet-400" />)}

      <div className="space-y-4">
        {/* Engine Toggle */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Voice Engine
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setTtsEngine('edge')
                // Reset to a valid edge voice
                if (selectedVoice.startsWith('g-')) setSelectedVoice('jenny')
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg border text-sm font-medium transition-all ${
                ttsEngine === 'edge'
                  ? 'border-violet-500 bg-violet-600/10 text-violet-300'
                  : 'border-gray-700 bg-gray-800/30 text-gray-400 hover:border-gray-600'
              }`}
            >
              <Volume2 className="w-4 h-4" />
              Edge TTS
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-900/40 text-green-400">Free</span>
            </button>
            <button
              onClick={() => {
                if (!googleAvailable) return
                setTtsEngine('google')
                // Reset to a valid google voice
                if (!selectedVoice.startsWith('g-')) setSelectedVoice('g-aria')
              }}
              disabled={!googleAvailable}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg border text-sm font-medium transition-all ${
                ttsEngine === 'google'
                  ? 'border-blue-500 bg-blue-600/10 text-blue-300'
                  : googleAvailable
                    ? 'border-gray-700 bg-gray-800/30 text-gray-400 hover:border-gray-600'
                    : 'border-gray-800 bg-gray-900/30 text-gray-600 cursor-not-allowed'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              Google WaveNet
              {googleAvailable ? (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-900/40 text-blue-400">HD</span>
              ) : (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-500">Setup needed</span>
              )}
            </button>
          </div>
          {!googleAvailable && ttsEngine === 'edge' && (
            <p className="text-xs text-gray-500 mt-1.5">
              Set GOOGLE_TTS_API_KEY to unlock Google WaveNet voices (1M chars/month free)
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Select Voice {ttsEngine === 'google' && <span className="text-blue-400">(WaveNet)</span>}
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {filteredVoices.map(voice => (
              <button
                key={voice.id}
                onClick={() => setSelectedVoice(voice.id)}
                className={`p-3 rounded-lg border text-left transition-all ${
                  selectedVoice === voice.id
                    ? 'border-violet-500 bg-violet-600/10'
                    : 'border-gray-700 bg-gray-800/30 hover:border-gray-600'
                }`}
              >
                <div className="text-sm font-medium text-white">{voice.name}</div>
                <div className="text-xs text-gray-400">{voice.gender}</div>
                <div className="text-xs text-gray-500">{voice.style}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Speed
            </label>
            <select
              value={voiceRate}
              onChange={e => setVoiceRate(e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-800/50 px-3 py-2.5 text-sm text-gray-100 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 transition-colors"
            >
              <option value="-20%">Slower (-20%)</option>
              <option value="-10%">Slightly Slower (-10%)</option>
              <option value="+0%">Normal</option>
              <option value="+10%">Slightly Faster (+10%)</option>
              <option value="+20%">Faster (+20%)</option>
              <option value="+30%">UGC Fast (+30%)</option>
            </select>
          </div>
          <button
            onClick={onGenerateTTS}
            disabled={ttsLoading || !scriptText.trim()}
            className="mt-6 flex items-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors"
          >
            {ttsLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
            {ttsLoading ? 'Generating...' : 'Generate Voiceover'}
          </button>
        </div>

        {ttsResult && (
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              {audioError ? (
                <span className="text-sm font-medium text-red-400">Audio failed to load</span>
              ) : (
                <span className="text-sm font-medium text-green-400">✓ Voiceover Ready</span>
              )}
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400">
                  {(ttsResult.duration / 1000).toFixed(1)}s · {ttsResult.wordBoundaries.length} words
                </span>
                <button
                  onClick={onGenerateTTS}
                  disabled={ttsLoading}
                  className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 disabled:opacity-50 transition-colors"
                  title="Regenerate voiceover"
                >
                  <RefreshCw className="w-3 h-3" />
                  {audioError ? 'Retry' : 'Redo'}
                </button>
              </div>
            </div>
            {!audioError && (
              <audio
                controls
                preload="auto"
                className="w-full h-10"
                src={ttsResult.audioUrl}
                onError={() => setAudioError(true)}
              >
                <track kind="captions" />
              </audio>
            )}
            {audioError && (
              <p className="text-xs text-gray-500">
                The audio couldn&apos;t be played. Click Retry to regenerate.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
