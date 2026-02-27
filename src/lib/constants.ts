/**
 * Centralized constants — single source of truth
 *
 * All platform, voice, tone, and template definitions live here.
 * Import from this file instead of redefining in each page/component.
 */

// ─── Platforms ────────────────────────────────────────────────────────
export const PLATFORMS = ['tiktok', 'instagram', 'youtube_shorts', 'twitter_x', 'linkedin'] as const
export type Platform = (typeof PLATFORMS)[number]

export const PLATFORM_LABELS: Record<Platform | string, string> = {
  tiktok: 'TikTok',
  instagram: 'Instagram',
  youtube_shorts: 'YouTube Shorts',
  twitter_x: 'Twitter/X',
  linkedin: 'LinkedIn',
}

export const PLATFORM_COLORS: Record<Platform | string, string> = {
  tiktok: '#EF4444',
  instagram: '#EC4899',
  youtube_shorts: '#F59E0B',
  twitter_x: '#3B82F6',
  linkedin: '#0EA5E9',
}

// ─── Tones ────────────────────────────────────────────────────────────
export const TONES = ['casual', 'bold', 'emotional', 'educational', 'storytelling'] as const
export type Tone = (typeof TONES)[number]

export const TONE_LABELS: Record<Tone | string, string> = {
  casual: 'Casual',
  bold: 'Bold',
  emotional: 'Emotional',
  educational: 'Educational',
  storytelling: 'Storytelling',
}

// ─── Content Goals ────────────────────────────────────────────────────
export const CONTENT_GOALS = ['sales', 'engagement', 'follower_growth', 'authority_building'] as const
export type ContentGoal = (typeof CONTENT_GOALS)[number]

export const CONTENT_GOAL_LABELS: Record<ContentGoal | string, string> = {
  sales: 'Sales',
  engagement: 'Engagement',
  follower_growth: 'Follower Growth',
  authority_building: 'Authority Building',
}

/** Prompt-specific goal descriptions (used in LLM prompts, not UI labels) */
export const GOAL_PROMPT_LABELS: Record<ContentGoal | string, string> = {
  sales: 'drive sales and conversions',
  engagement: 'maximize engagement and shares',
  follower_growth: 'grow followers and reach',
  authority_building: 'build authority and trust',
}

// ─── Voices (TTS) ─────────────────────────────────────────────────────
export const VOICE_OPTIONS = [
  { id: 'jenny', name: 'Jenny', gender: 'Female', style: 'Warm & Friendly' },
  { id: 'aria', name: 'Aria', gender: 'Female', style: 'Confident & Clear' },
  { id: 'sara', name: 'Sara', gender: 'Female', style: 'Young & Energetic' },
  { id: 'emma', name: 'Emma', gender: 'Female', style: 'British & Polished' },
  { id: 'guy', name: 'Guy', gender: 'Male', style: 'Casual & Natural' },
  { id: 'davis', name: 'Davis', gender: 'Male', style: 'Deep & Confident' },
  { id: 'jason', name: 'Jason', gender: 'Male', style: 'Young & Dynamic' },
  { id: 'ryan', name: 'Ryan', gender: 'Male', style: 'British & Professional' },
] as const

export type VoiceOption = (typeof VOICE_OPTIONS)[number]

// ─── Video Templates ──────────────────────────────────────────────────
export const VIDEO_TEMPLATES = [
  'CaptionStyle',
  'TextOnScreen',
  'SplitScreen',
  'Countdown',
  'Testimonial',
  'BeforeAfter',
  'ProductShowcase',
  'Cinematic',
  'Neon',
  'Minimalist',
  'Magazine',
] as const
export type VideoTemplate = (typeof VIDEO_TEMPLATES)[number]

export const TEMPLATE_LABELS: Record<VideoTemplate | string, string> = {
  CaptionStyle: 'Caption Style',
  TextOnScreen: 'Text on Screen',
  SplitScreen: 'Split Screen',
  Countdown: 'Countdown',
  Testimonial: 'Testimonial',
  BeforeAfter: 'Before/After',
  ProductShowcase: 'Product Showcase',
  Cinematic: 'Cinematic',
  Neon: 'Neon / Cyberpunk',
  Minimalist: 'Minimalist',
  Magazine: 'Magazine Editorial',
}

// ─── LLM Providers ───────────────────────────────────────────────────
export const LLM_PROVIDERS = [
  { value: 'openrouter', label: 'OpenRouter (Free)', models: ['nvidia/nemotron-nano-9b-v2:free', 'mistralai/mistral-7b-instruct:free', 'meta-llama/llama-3-8b-instruct:free'] },
  { value: 'groq', label: 'Groq (Free)', models: ['llama3-8b-8192', 'mixtral-8x7b-32768', 'gemma-7b-it'] },
  { value: 'together', label: 'Together.ai (Free)', models: ['mistralai/Mistral-7B-Instruct-v0.2', 'togethercomputer/llama-2-7b-chat'] },
  { value: 'huggingface', label: 'HuggingFace (Free)', models: ['mistralai/Mistral-7B-Instruct-v0.2', 'HuggingFaceH4/zephyr-7b-beta'] },
  { value: 'mistral', label: 'Mistral AI', models: ['mistral-small-latest', 'mistral-medium-latest'] },
] as const
