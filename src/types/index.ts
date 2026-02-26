export type Platform = 'tiktok' | 'instagram' | 'youtube_shorts' | 'twitter_x' | 'linkedin'
export type ContentGoal = 'sales' | 'engagement' | 'follower_growth' | 'authority_building'
export type Tone = 'casual' | 'bold' | 'emotional' | 'educational' | 'storytelling'

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
