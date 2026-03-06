'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { X, Zap, Palette, Video, ChevronRight, CheckCircle } from 'lucide-react'

const STORAGE_KEY = 'ugcforge_onboarded_v1'

const STEPS = [
  {
    icon: Palette,
    color: 'text-pink-400',
    bg: 'bg-pink-600/10 border-pink-600/20',
    title: 'Set up your Brand Kit',
    description: 'Add your brand name, colors, and defaults — pre-fills every generation.',
    href: '/settings',
    cta: 'Open Brand Kit',
  },
  {
    icon: Zap,
    color: 'text-violet-400',
    bg: 'bg-violet-600/10 border-violet-600/20',
    title: 'Generate your first UGC script',
    description: 'Describe your product and get a complete script, hooks, captions, and CTAs.',
    href: '/generate',
    cta: 'Generate Content',
  },
  {
    icon: Video,
    color: 'text-blue-400',
    bg: 'bg-blue-600/10 border-blue-600/20',
    title: 'Create a short-form video',
    description: 'Turn your script into a Remotion-rendered video with captions and AI visuals.',
    href: '/video',
    cta: 'Create Video',
  },
]

export default function OnboardingModal() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      const done = localStorage.getItem(STORAGE_KEY)
      if (!done) setVisible(true)
    } catch {
      // localStorage may be unavailable (SSR, private mode, etc.)
    }
  }, [])

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, '1')
    } catch { /* ignore */ }
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-lg bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-600 flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Welcome to UGCForge</h2>
              <p className="text-xs text-gray-400">3 steps to your first AI-generated content</p>
            </div>
          </div>
          <button
            onClick={dismiss}
            className="text-gray-500 hover:text-gray-300 transition-colors p-1 rounded-lg hover:bg-gray-800"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Steps */}
        <div className="px-6 py-5 space-y-3">
          {STEPS.map((step, i) => {
            const Icon = step.icon
            return (
              <Link
                key={i}
                href={step.href}
                onClick={dismiss}
                className={`flex items-center gap-4 p-4 rounded-xl border ${step.bg} hover:scale-[1.01] transition-all group`}
              >
                <div className={`w-10 h-10 rounded-lg border flex items-center justify-center flex-shrink-0 ${step.bg}`}>
                  <Icon className={`w-5 h-5 ${step.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 font-medium">Step {i + 1}</span>
                  </div>
                  <p className="text-sm font-semibold text-white">{step.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{step.description}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-gray-300 flex-shrink-0 transition-colors" />
              </Link>
            )
          })}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex items-center justify-between">
          <p className="text-xs text-gray-500">You can always return to this guide from the dashboard.</p>
          <button
            onClick={dismiss}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-200 transition-colors"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            Got it, skip
          </button>
        </div>
      </div>
    </div>
  )
}
