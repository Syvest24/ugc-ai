import Link from 'next/link'
import { Zap, ArrowRight, Check, TrendingUp, Sparkles, Target, Video, ImageIcon } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'UGCForge – AI-Powered UGC Content Generator | Free Scripts, Videos & Captions',
  description: 'Generate high-converting UGC scripts, viral hooks, AI videos, captions and ad copy for TikTok, Instagram, YouTube Shorts and LinkedIn. Free for creators and ecommerce brands.',
  alternates: {
    canonical: '/',
  },
}

const features = [
  { icon: Zap, title: '10 Hook Variations', desc: 'AI-generated hooks using proven psychological triggers' },
  { icon: Target, title: 'Platform-Optimized', desc: 'Content formatted for TikTok, Instagram, YouTube, LinkedIn & X' },
  { icon: TrendingUp, title: 'A/B Test Variants', desc: 'Multiple variations to test what converts best' },
  { icon: Sparkles, title: 'Full Script + Captions', desc: 'Complete video scripts, captions, hashtags, and CTAs' },
]

const platforms = ['TikTok', 'Instagram', 'YouTube Shorts', 'Twitter/X', 'LinkedIn']

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'How does UGCForge work?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Simply enter your product name, target audience, and platform. UGCForge AI generates 10 hook variations, a complete video script, captions, hashtags, CTAs, and A/B test variants instantly.',
      },
    },
    {
      '@type': 'Question',
      name: 'What platforms does UGCForge support?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'UGCForge generates content optimized for TikTok, Instagram Reels, YouTube Shorts, Twitter/X, and LinkedIn.',
      },
    },
    {
      '@type': 'Question',
      name: 'Is UGCForge free to use?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes, you can get started with UGCForge for free. Generate UGC scripts, AI videos, images, and captions without any upfront cost.',
      },
    },
  ],
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 overflow-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      {/* Header */}
      <header className="sticky top-0 z-50 glass-card border-b border-gray-800/50 px-6 py-4" role="banner">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <Zap className="w-4 h-4 text-white" aria-hidden="true" />
            </div>
            <span className="font-bold text-lg">UGCForge</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm text-gray-400 hover:text-gray-200 transition-colors focus-ring rounded-lg px-2 py-1">
              Sign in
            </Link>
            <Link
              href="/login"
              className="bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 text-white px-5 py-2 rounded-lg text-sm font-medium transition-all shadow-lg shadow-violet-500/25 btn-press focus-ring"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative px-6 py-28 text-center">
        {/* Background gradient orbs */}
        <div className="absolute top-10 left-1/4 w-96 h-96 bg-violet-600/20 rounded-full blur-[128px] pointer-events-none" />
        <div className="absolute top-20 right-1/4 w-80 h-80 bg-pink-600/15 rounded-full blur-[128px] pointer-events-none" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-64 bg-violet-800/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative max-w-4xl mx-auto">
          <div className="animate-fade-in-up inline-flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 rounded-full px-4 py-1.5 text-sm text-violet-300 mb-8 backdrop-blur-sm">
            <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
            AI-Powered UGC for Ecommerce &amp; Creators
          </div>
          <h1 className="animate-fade-in-up stagger-2 text-5xl md:text-7xl font-extrabold mb-6 leading-tight tracking-tight">
            Generate{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-pink-400 to-orange-400">
              High-Converting
            </span>
            <br />
            UGC Content in Seconds
          </h1>
          <p className="animate-fade-in-up stagger-3 text-lg md:text-xl text-gray-400 mb-12 max-w-2xl mx-auto leading-relaxed">
            Create viral hooks, scripts, captions, and ad copy for TikTok, Instagram, YouTube Shorts, and more. Built for creators, ecommerce brands, and affiliate marketers.
          </p>
          <div className="animate-fade-in-up stagger-4 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 text-white px-8 py-4 rounded-xl text-base font-semibold transition-all shadow-xl shadow-violet-500/30 btn-press focus-ring"
            >
              Start Generating Free
              <ArrowRight className="w-5 h-5" aria-hidden="true" />
            </Link>
            <a
              href="#demo"
              className="inline-flex items-center gap-2 border border-gray-700 hover:border-violet-500/50 hover:bg-violet-500/5 text-gray-300 px-8 py-4 rounded-xl text-base font-semibold transition-all btn-press focus-ring"
            >
              See How It Works
            </a>
          </div>
        </div>
      </section>

      {/* Platforms */}
      <section className="px-6 py-8 border-y border-gray-800/50">
        <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-center gap-4">
          <span className="text-sm text-gray-500">Optimized for:</span>
          {platforms.map(p => (
            <span key={p} className="text-sm font-medium text-gray-200 bg-gray-800/80 border border-gray-700/50 px-4 py-2 rounded-full">
              {p}
            </span>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="demo" className="relative px-6 py-24 scroll-mt-20">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-violet-950/10 to-transparent pointer-events-none" />
        <div className="relative max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-sm font-semibold tracking-wider uppercase text-violet-400 mb-3 block">How it works</span>
            <h2 className="text-4xl font-bold">Three steps to viral content</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: '1', icon: Target, title: 'Describe your product', desc: 'Enter your product name, audience, and platform. Our AI handles the rest.', color: 'from-violet-500 to-violet-600' },
              { step: '2', icon: Sparkles, title: 'AI generates everything', desc: 'Get 10 hooks, a full script, captions, hashtags, CTAs, and A/B variants instantly.', color: 'from-pink-500 to-pink-600' },
              { step: '3', icon: Video, title: 'Create & export video', desc: 'Turn your script into a polished video with AI voices, stock footage, and captions.', color: 'from-orange-500 to-orange-600' },
            ].map((s, i) => (
              <div key={s.step} className={`text-center animate-fade-in-up stagger-${i + 1}`}>
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${s.color} flex items-center justify-center mx-auto mb-5 text-lg font-bold text-white shadow-lg`}>
                  {s.step}
                </div>
                <h3 className="font-semibold text-lg text-gray-100 mb-2">{s.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Capabilities */}
      <section className="px-6 py-24">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-sm font-semibold tracking-wider uppercase text-pink-400 mb-3 block">Capabilities</span>
            <h2 className="text-4xl font-bold">One platform, every content type</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { icon: Sparkles, label: 'UGC Scripts', gradient: 'from-violet-500/20 to-violet-600/5', border: 'border-violet-500/30', iconColor: 'text-violet-400' },
              { icon: Video, label: 'AI Videos', gradient: 'from-pink-500/20 to-pink-600/5', border: 'border-pink-500/30', iconColor: 'text-pink-400' },
              { icon: ImageIcon, label: 'AI Images', gradient: 'from-emerald-500/20 to-emerald-600/5', border: 'border-emerald-500/30', iconColor: 'text-emerald-400' },
              { icon: Target, label: 'Ad Campaigns', gradient: 'from-blue-500/20 to-blue-600/5', border: 'border-blue-500/30', iconColor: 'text-blue-400' },
              { icon: TrendingUp, label: 'Analytics', gradient: 'from-cyan-500/20 to-cyan-600/5', border: 'border-cyan-500/30', iconColor: 'text-cyan-400' },
              { icon: Zap, label: 'Text to Video', gradient: 'from-orange-500/20 to-orange-600/5', border: 'border-orange-500/30', iconColor: 'text-orange-400' },
            ].map(cap => (
              <div key={cap.label} className={`bg-gradient-to-br ${cap.gradient} border ${cap.border} rounded-2xl p-5 text-center card-interactive`}>
                <cap.icon className={`w-7 h-7 mx-auto mb-3 ${cap.iconColor}`} aria-hidden="true" />
                <span className="text-sm font-semibold text-gray-100">{cap.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-24 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-violet-950/20 via-gray-950 to-gray-950 pointer-events-none" />
        <div className="relative max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-sm font-semibold tracking-wider uppercase text-violet-400 mb-3 block">Features</span>
            <h2 className="text-4xl font-bold">Everything you need to go viral</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {features.map(f => {
              const Icon = f.icon
              return (
                <div key={f.title} className="group bg-gray-900/80 border border-gray-800 hover:border-violet-500/40 rounded-2xl p-6 transition-all duration-300 hover:bg-gray-900/90 hover:shadow-lg hover:shadow-violet-500/5">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/20 to-pink-500/10 border border-violet-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                    <Icon className="w-5 h-5 text-violet-400" aria-hidden="true" />
                  </div>
                  <h3 className="font-semibold text-lg text-gray-100 mb-2">{f.title}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">{f.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* What you get */}
      <section className="px-6 py-24">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-sm font-semibold tracking-wider uppercase text-emerald-400 mb-3 block">What&apos;s included</span>
            <h2 className="text-4xl font-bold">Every generation includes</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <div key={item} className="flex items-center gap-3 bg-gray-900/40 border border-gray-800/50 rounded-xl px-4 py-3">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shrink-0" aria-hidden="true">
                  <Check className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-sm font-medium text-gray-200">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative px-6 py-28 text-center">
        <div className="absolute inset-0 bg-gradient-to-t from-violet-950/30 via-transparent to-transparent pointer-events-none" />
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-[500px] h-64 bg-violet-600/15 rounded-full blur-[120px] pointer-events-none" />
        <div className="relative max-w-2xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-extrabold mb-6">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-pink-400 to-orange-400">Ready to forge your UGC?</span>
          </h2>
          <p className="text-lg text-gray-400 mb-10">Join creators and brands using UGCForge to generate content that converts.</p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 text-white px-10 py-4 rounded-xl text-lg font-semibold transition-all shadow-xl shadow-violet-500/30 btn-press focus-ring"
          >
            Get Started Free
            <ArrowRight className="w-5 h-5" aria-hidden="true" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 px-6 py-8" role="contentinfo">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-violet-600 flex items-center justify-center" aria-hidden="true">
              <Zap className="w-3 h-3 text-white" />
            </div>
            <span>UGCForge</span>
          </div>
          <p>© {new Date().getFullYear()} UGCForge. AI-powered content for the creator economy.</p>
        </div>
      </footer>
    </div>
  )
}
