// Re-export canonical types from constants (single source of truth)
import type { Platform, ContentGoal, Tone } from '@/lib/constants'
export type { Platform, ContentGoal, Tone } from '@/lib/constants'

export interface GeneratorFormData {
  productName: string
  productDescription: string
  targetAudience: string
  platform: Platform
  contentGoal: ContentGoal
  tone: Tone
  ctaType: string
  competitorLinks?: string
  customerReviews?: string
  websiteUrl?: string
  pricePoint?: string
  objections?: string
}

export interface GeneratedOutput {
  hookBank: string[]
  script: string
  altAngles: { problemBased: string; storyBased: string; socialProofBased: string }
  caption: string
  hashtags: string[]
  ctaVariations: string[]
  thumbnailTexts: string[]
  engagementBaits: string[]
  repurposedContent: string
  abVariants: string[]
}

export interface SavedContent {
  id: string
  productName: string
  platform: Platform
  createdAt: string
  output: GeneratedOutput
}
