import { VOICE_OPTIONS } from '@/lib/constants'

/* ─── Types ───────────────────────────────────────────────── */

export interface TTSResult {
  audioUrl: string
  duration: number
  wordBoundaries: { text: string; startMs: number; endMs: number }[]
}

export interface StockClip {
  id: number
  url: string
  previewUrl: string
  width: number
  height: number
  duration?: number
  type: 'video' | 'image'
  photographer?: string
}

/* ─── Constants ───────────────────────────────────────────── */

export const VOICES = VOICE_OPTIONS

export const TEMPLATES = [
  {
    id: 'CaptionStyle',
    name: 'Caption Style',
    desc: 'TikTok/Reels style animated captions over background',
    icon: '📱',
    color: '#A855F7',
  },
  {
    id: 'TextOnScreen',
    name: 'Text on Screen',
    desc: 'Bold text overlays with typewriter effects',
    icon: '✍️',
    color: '#EC4899',
  },
  {
    id: 'SplitScreen',
    name: 'Split Screen',
    desc: 'Hook text on top, content on bottom',
    icon: '📐',
    color: '#3B82F6',
  },
  {
    id: 'Countdown',
    name: 'Countdown',
    desc: 'Numbered countdown with animated counter badge',
    icon: '🔢',
    color: '#F59E0B',
  },
  {
    id: 'Testimonial',
    name: 'Testimonial',
    desc: 'Quote card with stars, perfect for reviews',
    icon: '💬',
    color: '#10B981',
  },
  {
    id: 'BeforeAfter',
    name: 'Before / After',
    desc: 'Dramatic reveal transition for transformations',
    icon: '🔄',
    color: '#EF4444',
  },
  {
    id: 'ProductShowcase',
    name: 'Product Showcase',
    desc: 'Feature cards with icons and progress dots',
    icon: '🎁',
    color: '#8B5CF6',
  },
  {
    id: 'Cinematic',
    name: 'Cinematic',
    desc: 'Film-style letterbox with dramatic serif typography',
    icon: '🎬',
    color: '#D4AF37',
  },
  {
    id: 'Neon',
    name: 'Neon / Cyberpunk',
    desc: 'Glowing neon borders on dark background',
    icon: '💜',
    color: '#00F0FF',
  },
  {
    id: 'Minimalist',
    name: 'Minimalist',
    desc: 'Ultra-clean with elegant serif text on white',
    icon: '⬜',
    color: '#111111',
  },
  {
    id: 'Magazine',
    name: 'Magazine Editorial',
    desc: 'Editorial spreads with bold headlines and quotes',
    icon: '📰',
    color: '#C8102E',
  },
] as const

export const CAPTION_STYLES = [
  { id: 'karaoke', name: 'Karaoke', desc: 'Words highlight as spoken (CapCut style)' },
  { id: 'word-by-word', name: 'Word by Word', desc: 'Words appear one at a time' },
  { id: 'fade', name: 'Fade In', desc: 'Words fade in smoothly' },
] as const

export const HOOK_STYLES = [
  { id: 'pop', name: 'Pop', desc: 'Spring animation entrance' },
  { id: 'typewriter', name: 'Typewriter', desc: 'Text types out character by character' },
  { id: 'slide', name: 'Slide', desc: 'Slides in from the side' },
] as const
