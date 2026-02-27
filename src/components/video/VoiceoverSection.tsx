'use client'

import { Mic, Loader2, Volume2 } from 'lucide-react'
import { VOICES, type TTSResult } from '@/lib/video-constants'

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
}

export default function VoiceoverSection({
  selectedVoice, setSelectedVoice,
  voiceRate, setVoiceRate,
  ttsResult, ttsLoading, scriptText,
  onGenerateTTS, sectionHeader,
}: VoiceoverSectionProps) {
  return (
    <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-6">
      {sectionHeader('AI Voiceover', 2, <Mic className="w-4 h-4 text-violet-400" />)}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Select Voice
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {VOICES.map(voice => (
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
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-green-400">✓ Voiceover Ready</span>
              <span className="text-xs text-gray-400">
                {(ttsResult.duration / 1000).toFixed(1)}s · {ttsResult.wordBoundaries.length} words
              </span>
            </div>
            <audio controls className="w-full h-10" src={ttsResult.audioUrl}>
              <track kind="captions" />
            </audio>
          </div>
        )}
      </div>
    </div>
  )
}
