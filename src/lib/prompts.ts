import type { GeneratorFormData, GeneratedOutput } from '@/types'
import { PLATFORM_LABELS, GOAL_PROMPT_LABELS } from '@/lib/constants'

const platformLabels = PLATFORM_LABELS
const goalLabels = GOAL_PROMPT_LABELS

export const systemPrompt = `You are an elite UGC (User Generated Content) strategist and copywriter.
You create high-converting, native-feeling content for social media platforms.
You understand retention psychology, hook mechanics, and platform algorithms.
Your content is persuasive, authentic, and drives action.
Always write in a native, non-corporate voice.
Apply open loop hooks, curiosity triggers, pattern interrupts, and micro-story formatting.
Output ONLY the formatted content requested - no explanations or meta-commentary.`

function getPlatformRules(platform: string): string {
  switch (platform) {
    case 'tiktok':
      return 'Use short punchy lines. Add line breaks after every 1-2 sentences. Write in a conversational, spoken tone. Keep energy high.'
    case 'instagram':
      return 'Use a scroll-stopping opening line. Balance emojis strategically. End with a CTA that prompts comments. Use line breaks for readability.'
    case 'youtube_shorts':
      return 'Hook in the first 3 seconds. Use pattern interrupt early. Keep pacing fast. Build curiosity throughout.'
    case 'twitter_x':
      return 'Format as a thread with numbered tweets. Each tweet should end with curiosity. Use "1/" style numbering. Max 280 chars per tweet.'
    case 'linkedin':
      return 'Use authority positioning. Write in structured paragraphs. Share insight or transformation. Professional but human tone.'
    default:
      return 'Write engaging, platform-appropriate content.'
  }
}

function getToneInstructions(tone: string): string {
  switch (tone) {
    case 'casual': return 'Use casual, conversational language. Like talking to a friend. Contractions, simple words, relatable.'
    case 'bold': return 'Be direct, confident, and assertive. Make bold claims backed by value. No fluff.'
    case 'emotional': return 'Appeal to emotions. Use empathy, transformation stories, and emotional triggers. Make them feel something.'
    case 'educational': return 'Teach while selling. Use data, insights, and "did you know" angles. Position as an expert.'
    case 'storytelling': return 'Lead with a story. Use narrative arc: problem → struggle → discovery → transformation.'
    default: return 'Write in an engaging, authentic voice.'
  }
}

export function buildMasterPrompt(data: GeneratorFormData): string {
  const platform = platformLabels[data.platform] || data.platform
  const goal = goalLabels[data.contentGoal] || data.contentGoal
  const platformRules = getPlatformRules(data.platform)
  const toneInstructions = getToneInstructions(data.tone)

  const optionalContext = [
    data.customerReviews ? `Customer Reviews/Testimonials:\n${data.customerReviews}` : '',
    data.pricePoint ? `Price Point: ${data.pricePoint}` : '',
    data.objections ? `Common Objections to Address: ${data.objections}` : '',
    data.competitorLinks ? `Competitor Context: ${data.competitorLinks}` : '',
  ].filter(Boolean).join('\n\n')

  return `Generate complete UGC content for the following product and requirements.

PRODUCT DETAILS:
- Product Name: ${data.productName}
- Description: ${data.productDescription}
- Target Audience: ${data.targetAudience}
- Platform: ${platform}
- Content Goal: ${goal}
- Tone: ${data.tone}
- CTA Type: ${data.ctaType}
${optionalContext ? `\nADDITIONAL CONTEXT:\n${optionalContext}` : ''}

PLATFORM RULES: ${platformRules}
TONE INSTRUCTIONS: ${toneInstructions}

Generate ALL of the following sections. Use EXACTLY these section headers:

=== HOOK OPTIONS ===
Generate 10 different hook variations. Number each one 1-10. Each hook should use a different psychological trigger (curiosity, fear of missing out, social proof, pattern interrupt, open loop, controversy, transformation, question, bold claim, relatable problem).

=== SCRIPT ===
Write a 30-60 second video script formatted for video pacing. Include [PAUSE], [HOLD UP PRODUCT], [POINT TO TEXT] stage directions where appropriate. Each line should be on its own line.

=== ALT ANGLE (Problem-Based) ===
Alternative script focusing on the problem/pain point the product solves.

=== ALT ANGLE (Story-Based) ===
Alternative script using a personal story/narrative arc format.

=== ALT ANGLE (Social Proof-Based) ===
Alternative script leading with social proof, testimonials, and results.

=== CAPTION ===
Write an optimized caption for ${platform}. Include emojis where appropriate. Follow platform best practices.

=== HASHTAGS ===
List 15-20 relevant hashtags, one per line, starting with #. Mix popular and niche tags.

=== CTA VARIATIONS ===
Write 5 different call-to-action variations. Number each 1-5. Vary the urgency, style, and approach.

=== THUMBNAIL TEXT ===
Write 5 thumbnail text suggestions (short, bold, attention-grabbing). Number each 1-5.

=== ENGAGEMENT BAIT COMMENTS ===
Write 5 comments designed to spark engagement and conversation. Number each 1-5.

=== REPURPOSED FOR ANOTHER PLATFORM ===
Repurpose the main script for a different platform than ${platform}. Specify which platform and reformat accordingly.

=== A/B TEST VARIANTS ===
Write 3 complete A/B test variants of the hook + first 10 seconds. Label as VARIANT A, VARIANT B, VARIANT C.`
}

export function parseGeneratedOutput(raw: string): GeneratedOutput {
  const extract = (start: string, end?: string): string => {
    const startIdx = raw.indexOf(start)
    if (startIdx === -1) return ''
    const contentStart = startIdx + start.length
    const endIdx = end ? raw.indexOf(end, contentStart) : raw.length
    return raw.slice(contentStart, endIdx === -1 ? raw.length : endIdx).trim()
  }

  const hookSection = extract('=== HOOK OPTIONS ===', '=== SCRIPT ===')
  const hookLines = hookSection.split('\n').filter(l => /^\d+\./.test(l.trim()))
  const hookBank = hookLines.map(l => l.replace(/^\d+\.\s*/, '').trim()).filter(Boolean)
  if (hookBank.length === 0) {
    hookSection.split('\n').filter(l => l.trim()).slice(0, 10).forEach(l => hookBank.push(l.trim()))
  }

  const script = extract('=== SCRIPT ===', '=== ALT ANGLE (Problem-Based) ===')
  const altProblem = extract('=== ALT ANGLE (Problem-Based) ===', '=== ALT ANGLE (Story-Based) ===')
  const altStory = extract('=== ALT ANGLE (Story-Based) ===', '=== ALT ANGLE (Social Proof-Based) ===')
  const altSocial = extract('=== ALT ANGLE (Social Proof-Based) ===', '=== CAPTION ===')
  const caption = extract('=== CAPTION ===', '=== HASHTAGS ===')

  const hashtagSection = extract('=== HASHTAGS ===', '=== CTA VARIATIONS ===')
  const hashtags = hashtagSection.split('\n').map(l => l.trim()).filter(l => l.startsWith('#'))

  const ctaSection = extract('=== CTA VARIATIONS ===', '=== THUMBNAIL TEXT ===')
  const ctaLines = ctaSection.split('\n').filter(l => /^\d+\./.test(l.trim()))
  const ctaVariations = ctaLines.map(l => l.replace(/^\d+\.\s*/, '').trim()).filter(Boolean)

  const thumbSection = extract('=== THUMBNAIL TEXT ===', '=== ENGAGEMENT BAIT COMMENTS ===')
  const thumbLines = thumbSection.split('\n').filter(l => /^\d+\./.test(l.trim()))
  const thumbnailTexts = thumbLines.map(l => l.replace(/^\d+\.\s*/, '').trim()).filter(Boolean)

  const engageSection = extract('=== ENGAGEMENT BAIT COMMENTS ===', '=== REPURPOSED FOR ANOTHER PLATFORM ===')
  const engageLines = engageSection.split('\n').filter(l => /^\d+\./.test(l.trim()))
  const engagementBaits = engageLines.map(l => l.replace(/^\d+\.\s*/, '').trim()).filter(Boolean)

  const repurposedContent = extract('=== REPURPOSED FOR ANOTHER PLATFORM ===', '=== A/B TEST VARIANTS ===')

  const abSection = extract('=== A/B TEST VARIANTS ===')
  const abVariants: string[] = []
  const variantA = abSection.match(/VARIANT A[\s\S]*?(?=VARIANT B|$)/)?.[0]?.replace('VARIANT A', '').trim()
  const variantB = abSection.match(/VARIANT B[\s\S]*?(?=VARIANT C|$)/)?.[0]?.replace('VARIANT B', '').trim()
  const variantC = abSection.match(/VARIANT C[\s\S]*/)?.[0]?.replace('VARIANT C', '').trim()
  if (variantA) abVariants.push(`VARIANT A: ${variantA}`)
  if (variantB) abVariants.push(`VARIANT B: ${variantB}`)
  if (variantC) abVariants.push(`VARIANT C: ${variantC}`)

  return {
    hookBank: hookBank.length > 0 ? hookBank : ['Hook generation in progress...'],
    script: script || 'Script generation in progress...',
    altAngles: {
      problemBased: altProblem || 'Alternative angle coming soon...',
      storyBased: altStory || 'Story angle coming soon...',
      socialProofBased: altSocial || 'Social proof angle coming soon...',
    },
    caption: caption || 'Caption coming soon...',
    hashtags: hashtags.length > 0 ? hashtags : ['#ugc', '#contentcreator'],
    ctaVariations: ctaVariations.length > 0 ? ctaVariations : ['Check link in bio!'],
    thumbnailTexts: thumbnailTexts.length > 0 ? thumbnailTexts : ['Watch This!'],
    engagementBaits: engagementBaits.length > 0 ? engagementBaits : ['What do you think?'],
    repurposedContent: repurposedContent || 'Repurposed content coming soon...',
    abVariants: abVariants.length > 0 ? abVariants : ['A/B variants coming soon...'],
  }
}
