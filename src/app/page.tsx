import Link from 'next/link'
import { Zap, ArrowRight, Check, TrendingUp, Sparkles, Target } from 'lucide-react'

const features = [
  { icon: Zap, title: '10 Hook Variations', desc: 'AI-generated hooks using proven psychological triggers' },
  { icon: Target, title: 'Platform-Optimized', desc: 'Content formatted for TikTok, Instagram, YouTube, LinkedIn & X' },
  { icon: TrendingUp, title: 'A/B Test Variants', desc: 'Multiple variations to test what converts best' },
  { icon: Sparkles, title: 'Full Script + Captions', desc: 'Complete video scripts, captions, hashtags, and CTAs' },
]

const platforms = ['TikTok', 'Instagram', 'YouTube Shorts', 'Twitter/X', 'LinkedIn']

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg">UGCForge</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm text-gray-400 hover:text-gray-200 transition-colors">
              Sign in
            </Link>
            <Link
              href="/login"
              className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="px-6 py-24 text-center">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-violet-950/50 border border-violet-800/50 rounded-full px-4 py-1.5 text-sm text-violet-300 mb-8">
            <Sparkles className="w-3.5 h-3.5" />
            AI-Powered UGC for Ecommerce &amp; Creators
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
            Generate{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-pink-400">
              High-Converting
            </span>
            {' '}UGC Content in Seconds
          </h1>
          <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
            Create viral hooks, scripts, captions, and ad copy for TikTok, Instagram, YouTube Shorts, and more. Built for creators, ecommerce brands, and affiliate marketers.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-8 py-4 rounded-xl text-base font-semibold transition-all shadow-lg shadow-violet-500/25"
            >
              Start Generating Free
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 border border-gray-700 hover:border-gray-600 text-gray-300 px-8 py-4 rounded-xl text-base font-semibold transition-all"
            >
              View Demo
            </Link>
          </div>
        </div>
      </section>

      {/* Platforms */}
      <section className="px-6 py-8 border-y border-gray-800/50">
        <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-center gap-6">
          <span className="text-sm text-gray-500">Optimized for:</span>
          {platforms.map(p => (
            <span key={p} className="text-sm font-medium text-gray-300 bg-gray-800/60 px-3 py-1.5 rounded-lg">
              {p}
            </span>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-20">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">Everything you need to go viral</h2>
          <p className="text-gray-400 text-center mb-12 max-w-xl mx-auto">
            Stop spending hours writing content. Generate complete, platform-optimized UGC packages in one click.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {features.map(f => {
              const Icon = f.icon
              return (
                <div key={f.title} className="bg-gray-900/60 border border-gray-800 rounded-xl p-6">
                  <div className="w-10 h-10 rounded-lg bg-violet-600/20 border border-violet-600/30 flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5 text-violet-400" />
                  </div>
                  <h3 className="font-semibold text-gray-100 mb-2">{f.title}</h3>
                  <p className="text-sm text-gray-400">{f.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* What you get */}
      <section className="px-6 py-20 bg-gray-900/30">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Every generation includes</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              '10 Hook Variations',
              '30-60 sec Video Script',
              'Problem, Story & Social Proof Angles',
              'Platform-Optimized Caption',
              '15-20 Targeted Hashtags',
              '5 CTA Variations',
              'Thumbnail Text Suggestions',
              'Engagement Bait Comments',
              'Cross-Platform Repurposed Content',
              'A/B Test Variants',
            ].map(item => (
              <div key={item} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-violet-600/20 border border-violet-600/40 flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3 text-violet-400" />
                </div>
                <span className="text-sm text-gray-300">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-24 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-4xl font-bold mb-4">Ready to forge your UGC?</h2>
          <p className="text-gray-400 mb-8">Join creators and brands using UGCForge to generate content that converts.</p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-8 py-4 rounded-xl text-base font-semibold transition-all shadow-lg shadow-violet-500/25"
          >
            Get Started Free
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 px-6 py-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-violet-600 flex items-center justify-center">
              <Zap className="w-3 h-3 text-white" />
            </div>
            <span>UGCForge</span>
          </div>
          <p>© 2024 UGCForge. AI-powered content for the creator economy.</p>
        </div>
      </footer>
    </div>
  )
}
