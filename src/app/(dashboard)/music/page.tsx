'use client'
import { useState } from 'react'
import { Loader2, Music, Download, Play, Pause } from 'lucide-react'
import { useRef } from 'react'

const MOODS = [
  { id: 'upbeat', name: 'Upbeat', icon: '🎵' },
  { id: 'chill', name: 'Chill', icon: '😌' },
  { id: 'dramatic', name: 'Dramatic', icon: '🎬' },
  { id: 'corporate', name: 'Corporate', icon: '💼' },
  { id: 'electronic', name: 'Electronic', icon: '🎧' },
  { id: 'acoustic', name: 'Acoustic', icon: '🎸' },
  { id: 'ambient', name: 'Ambient', icon: '🌊' },
  { id: 'hip-hop', name: 'Hip Hop', icon: '🎤' },
  { id: 'rock', name: 'Rock', icon: '🎸' },
  { id: 'jazz', name: 'Jazz', icon: '🎷' },
  { id: 'classical', name: 'Classical', icon: '🎹' },
  { id: 'fun', name: 'Fun & Quirky', icon: '🎪' },
]

export default function MusicPage() {
  const [prompt, setPrompt] = useState('')
  const [mood, setMood] = useState('')
  const [duration, setDuration] = useState(10)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ audioUrl: string; model: string; duration: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)
  const [history, setHistory] = useState<{ audioUrl: string; prompt: string; mood: string; model: string }[]>([])

  const handleGenerate = async () => {
    if (!prompt.trim()) return
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const res = await fetch('/api/music', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, mood, duration }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error || 'Music generation failed')
      setResult(json.data)
      setHistory(prev => [{ audioUrl: json.data.audioUrl, prompt, mood, model: json.data.model }, ...prev].slice(0, 10))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const togglePlay = () => {
    if (!audioRef.current) return
    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
    setIsPlaying(!isPlaying)
  }

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-600/30 flex items-center justify-center">
            <Music className="w-5 h-5 text-emerald-400" />
          </div>
          AI Music Generator
        </h1>
        <p className="text-gray-400 mt-2">Create original background music from text descriptions.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Controls */}
        <div className="lg:col-span-2 space-y-6">
          {/* Prompt */}
          <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">Describe your music</label>
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="Upbeat electronic track with synth arpeggios, punchy drums, and a catchy melody perfect for a product ad..."
              rows={3}
              className="w-full rounded-lg border border-gray-700 bg-gray-800/50 px-4 py-3 text-sm text-gray-100 placeholder-gray-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
            />
          </div>

          {/* Mood Grid */}
          <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-6">
            <label className="block text-sm font-medium text-gray-300 mb-3">Mood / Genre</label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {MOODS.map(m => (
                <button
                  key={m.id}
                  onClick={() => setMood(mood === m.id ? '' : m.id)}
                  className={`flex items-center gap-2 p-3 rounded-lg border text-sm transition-all ${
                    mood === m.id
                      ? 'border-emerald-500 bg-emerald-600/10 text-emerald-300'
                      : 'border-gray-700 bg-gray-800/30 text-gray-400 hover:border-gray-600'
                  }`}
                >
                  <span>{m.icon}</span>
                  <span className="font-medium">{m.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Duration + Generate */}
          <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">Duration: {duration}s</label>
            <input
              type="range"
              min={5}
              max={30}
              step={5}
              value={duration}
              onChange={e => setDuration(Number(e.target.value))}
              className="w-full accent-emerald-500"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>5s</span><span>15s</span><span>30s</span>
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading || !prompt.trim()}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white px-6 py-4 rounded-xl font-semibold transition-all text-lg"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Music className="w-5 h-5" />}
            {loading ? 'Generating Music...' : 'Generate Music'}
          </button>

          {error && (
            <div className="bg-red-900/30 border border-red-800 rounded-lg p-4 text-sm text-red-300">{error}</div>
          )}
        </div>

        {/* Right: Player + History */}
        <div className="space-y-6">
          {/* Current Track */}
          <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-6 sticky top-6 space-y-4">
            <h3 className="text-sm font-medium text-gray-300 flex items-center gap-2">
              <Music className="w-4 h-4 text-emerald-400" />
              Now Playing
            </h3>

            {result ? (
              <div className="space-y-4">
                {/* Visualization placeholder */}
                <div className="bg-gradient-to-br from-emerald-900/30 to-teal-900/30 rounded-lg p-6 flex flex-col items-center justify-center gap-3 border border-emerald-800/30">
                  <div className="flex items-center gap-1">
                    {[...Array(20)].map((_, i) => (
                      <div
                        key={i}
                        className={`w-1 bg-emerald-400 rounded-full transition-all ${isPlaying ? 'animate-pulse' : ''}`}
                        style={{
                          height: `${Math.random() * 32 + 8}px`,
                          animationDelay: `${i * 0.05}s`,
                        }}
                      />
                    ))}
                  </div>
                  <button
                    onClick={togglePlay}
                    className="w-14 h-14 rounded-full bg-emerald-600 hover:bg-emerald-500 flex items-center justify-center transition-colors"
                  >
                    {isPlaying ? <Pause className="w-6 h-6 text-white" /> : <Play className="w-6 h-6 text-white ml-1" />}
                  </button>
                </div>

                <audio
                  ref={audioRef}
                  src={result.audioUrl}
                  onEnded={() => setIsPlaying(false)}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  controls
                  className="w-full"
                />

                <div className="text-xs text-gray-500">
                  Model: {result.model} | Duration: {result.duration}s
                </div>

                <a
                  href={result.audioUrl}
                  download
                  className="flex items-center justify-center gap-2 w-full bg-gray-800 hover:bg-gray-700 text-white px-4 py-2.5 rounded-lg text-sm transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download Audio
                </a>
              </div>
            ) : loading ? (
              <div className="bg-gray-800/50 rounded-lg p-8 flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
                <p className="text-sm text-gray-400">Composing music...</p>
              </div>
            ) : (
              <div className="bg-gray-800/50 rounded-lg p-8 flex flex-col items-center gap-2">
                <Music className="w-8 h-8 text-gray-600" />
                <p className="text-sm text-gray-500">Your track will appear here</p>
              </div>
            )}
          </div>

          {/* History */}
          {history.length > 0 && (
            <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4">
              <h3 className="text-sm font-medium text-gray-300 mb-3">Recent</h3>
              <div className="space-y-2">
                {history.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => { setResult({ audioUrl: item.audioUrl, model: item.model, duration }); setIsPlaying(false) }}
                    className="w-full flex items-center gap-2 p-2 rounded-lg bg-gray-800/30 hover:bg-gray-800/50 transition-colors text-left"
                  >
                    <Play className="w-3 h-3 text-emerald-400 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs text-gray-300 truncate">{item.prompt}</div>
                      <div className="text-[10px] text-gray-500">{item.mood || 'custom'}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
