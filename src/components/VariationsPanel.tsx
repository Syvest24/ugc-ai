'use client'
import { useState } from 'react'
import { Check, Copy, ChevronDown, ChevronUp, Zap, Trophy, Video } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface VariationOutput {
  hookBank: string[]
  script: string
  caption: string
  hashtags: string[]
  ctaVariations: string[]
  thumbnailTexts: string[]
}

interface Variation {
  id: string | null
  strategy: string
  output: VariationOutput | null
  success: boolean
  error?: string
}

interface VariationsPanelProps {
  variations: Variation[]
  onSelectWinner?: (variation: Variation) => void
}

const STRATEGY_COLORS: Record<string, { bg: string; border: string; accent: string; icon: string }> = {
  'Curiosity-Driven': {
    bg: 'bg-purple-900/10',
    border: 'border-purple-600/30',
    accent: 'text-purple-400',
    icon: '🔮',
  },
  'Emotion-First': {
    bg: 'bg-rose-900/10',
    border: 'border-rose-600/30',
    accent: 'text-rose-400',
    icon: '❤️',
  },
  'Authority & Proof': {
    bg: 'bg-emerald-900/10',
    border: 'border-emerald-600/30',
    accent: 'text-emerald-400',
    icon: '📊',
  },
}

export default function VariationsPanel({ variations, onSelectWinner }: VariationsPanelProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, Record<string, boolean>>>({})
  const [selectedWinner, setSelectedWinner] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const toggleSection = (varIdx: string, section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [varIdx]: {
        ...prev[varIdx],
        [section]: !prev[varIdx]?.[section],
      }
    }))
  }

  const handleCopy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleSelectWinner = (variation: Variation) => {
    setSelectedWinner(variation.strategy)
    onSelectWinner?.(variation)
  }

  const successfulVariations = variations.filter(v => v.success && v.output)

  if (successfulVariations.length === 0) {
    return (
      <div className="text-center py-10 text-gray-400">
        <p>No variations were generated successfully. Try again.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400" />
            Content Variations ({successfulVariations.length})
          </h3>
          <p className="text-sm text-gray-400 mt-1">
            Compare different strategies side-by-side. Pick your winner!
          </p>
        </div>
        {selectedWinner && (
          <div className="flex items-center gap-2 bg-amber-600/10 border border-amber-600/30 rounded-lg px-3 py-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span className="text-sm text-amber-300">Winner: {selectedWinner}</span>
          </div>
        )}
      </div>

      {/* Strategy Cards - Side by Side */}
      <div className={cn(
        'grid gap-4',
        successfulVariations.length === 1 ? 'grid-cols-1' :
        successfulVariations.length === 2 ? 'grid-cols-1 lg:grid-cols-2' :
        'grid-cols-1 lg:grid-cols-3'
      )}>
        {successfulVariations.map((variation, idx) => {
          const colors = STRATEGY_COLORS[variation.strategy] || STRATEGY_COLORS['Curiosity-Driven']
          const output = variation.output!
          const varKey = `var-${idx}`
          const isWinner = selectedWinner === variation.strategy

          return (
            <div
              key={idx}
              className={cn(
                'rounded-xl border overflow-hidden transition-all',
                isWinner ? 'border-amber-500 ring-2 ring-amber-500/20' : colors.border,
                colors.bg
              )}
            >
              {/* Header */}
              <div className="p-4 border-b border-gray-800/50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{colors.icon}</span>
                    <h4 className={cn('font-semibold text-sm', colors.accent)}>
                      {variation.strategy}
                    </h4>
                  </div>
                  {isWinner && (
                    <span className="text-xs bg-amber-600/20 text-amber-400 px-2 py-1 rounded-full border border-amber-600/30">
                      ★ Winner
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSelectWinner(variation)}
                    className={cn(
                      'flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg transition-colors',
                      isWinner
                        ? 'bg-amber-600 text-white'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700'
                    )}
                  >
                    <Trophy className="w-3 h-3" />
                    {isWinner ? 'Selected' : 'Pick Winner'}
                  </button>
                  {variation.id && (
                    <Link
                      href={`/video?contentId=${variation.id}`}
                      className="flex items-center gap-1 text-xs bg-pink-600/20 text-pink-400 hover:bg-pink-600/30 px-3 py-1.5 rounded-lg transition-colors border border-pink-600/30"
                    >
                      <Video className="w-3 h-3" />
                      Video
                    </Link>
                  )}
                </div>
              </div>

              {/* Content Sections */}
              <div className="divide-y divide-gray-800/30">
                {/* Hooks */}
                <CollapsibleSection
                  title={`Hooks (${output.hookBank.length})`}
                  varKey={varKey}
                  section="hooks"
                  expanded={expandedSections[varKey]?.hooks ?? true}
                  onToggle={() => toggleSection(varKey, 'hooks')}
                  onCopy={() => handleCopy(output.hookBank.join('\n'), `${varKey}-hooks`)}
                  copied={copiedId === `${varKey}-hooks`}
                >
                  <ol className="space-y-1.5">
                    {output.hookBank.map((hook, i) => (
                      <li key={i} className="flex gap-2 text-xs text-gray-300">
                        <span className={cn('font-mono mt-0.5 shrink-0', colors.accent)}>{i + 1}.</span>
                        <span>{hook}</span>
                      </li>
                    ))}
                  </ol>
                </CollapsibleSection>

                {/* Script */}
                <CollapsibleSection
                  title="Script"
                  varKey={varKey}
                  section="script"
                  expanded={expandedSections[varKey]?.script ?? false}
                  onToggle={() => toggleSection(varKey, 'script')}
                  onCopy={() => handleCopy(output.script, `${varKey}-script`)}
                  copied={copiedId === `${varKey}-script`}
                >
                  <pre className="text-xs text-gray-300 whitespace-pre-wrap font-sans leading-relaxed max-h-60 overflow-y-auto">
                    {output.script}
                  </pre>
                </CollapsibleSection>

                {/* Caption */}
                <CollapsibleSection
                  title="Caption"
                  varKey={varKey}
                  section="caption"
                  expanded={expandedSections[varKey]?.caption ?? false}
                  onToggle={() => toggleSection(varKey, 'caption')}
                  onCopy={() => handleCopy(output.caption, `${varKey}-caption`)}
                  copied={copiedId === `${varKey}-caption`}
                >
                  <p className="text-xs text-gray-300 whitespace-pre-wrap leading-relaxed">
                    {output.caption}
                  </p>
                </CollapsibleSection>

                {/* CTAs */}
                <CollapsibleSection
                  title={`CTAs (${output.ctaVariations.length})`}
                  varKey={varKey}
                  section="ctas"
                  expanded={expandedSections[varKey]?.ctas ?? false}
                  onToggle={() => toggleSection(varKey, 'ctas')}
                  onCopy={() => handleCopy(output.ctaVariations.join('\n'), `${varKey}-ctas`)}
                  copied={copiedId === `${varKey}-ctas`}
                >
                  <ol className="space-y-1">
                    {output.ctaVariations.map((cta, i) => (
                      <li key={i} className="text-xs text-gray-300 flex gap-2">
                        <span className={cn('font-mono shrink-0', colors.accent)}>{i + 1}.</span>
                        <span>{cta}</span>
                      </li>
                    ))}
                  </ol>
                </CollapsibleSection>

                {/* Hashtags */}
                <CollapsibleSection
                  title={`Hashtags (${output.hashtags.length})`}
                  varKey={varKey}
                  section="hashtags"
                  expanded={expandedSections[varKey]?.hashtags ?? false}
                  onToggle={() => toggleSection(varKey, 'hashtags')}
                  onCopy={() => handleCopy(output.hashtags.join(' '), `${varKey}-hashtags`)}
                  copied={copiedId === `${varKey}-hashtags`}
                >
                  <div className="flex flex-wrap gap-1">
                    {output.hashtags.map((tag, i) => (
                      <span key={i} className={cn('text-xs px-1.5 py-0.5 rounded', colors.bg, colors.accent)}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </CollapsibleSection>
              </div>
            </div>
          )
        })}
      </div>

      {/* Failed variations */}
      {variations.filter(v => !v.success).length > 0 && (
        <div className="text-sm text-gray-500">
          {variations.filter(v => !v.success).map((v, i) => (
            <p key={i}>⚠️ {v.strategy} variation failed: {v.error}</p>
          ))}
        </div>
      )}
    </div>
  )
}

// Collapsible section sub-component
function CollapsibleSection({
  title,
  varKey: _varKey,
  section: _section,
  expanded,
  onToggle,
  onCopy,
  copied,
  children,
}: {
  title: string
  varKey: string
  section: string
  expanded: boolean
  onToggle: () => void
  onCopy: () => void
  copied: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle() } }}
        className="flex items-center justify-between px-4 py-2 hover:bg-gray-800/30 transition-colors cursor-pointer"
      >
        <span className="text-xs font-medium text-gray-400">{title}</span>
        <div className="flex items-center gap-1">
          {expanded && (
            <button
              onClick={(e) => { e.stopPropagation(); onCopy() }}
              className="text-gray-500 hover:text-gray-300 p-0.5 transition-colors"
              aria-label="Copy to clipboard"
            >
              {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
            </button>
          )}
          {expanded ? <ChevronUp className="w-3 h-3 text-gray-500" /> : <ChevronDown className="w-3 h-3 text-gray-500" />}
        </div>
      </div>
      {expanded && (
        <div className="px-4 pb-3">
          {children}
        </div>
      )}
    </div>
  )
}
