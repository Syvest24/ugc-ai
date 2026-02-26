'use client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { Wand2, Save, Download, RefreshCw } from 'lucide-react'
import type { GeneratedOutput } from '@/types'
import OutputSection from '@/components/OutputSection'

const formSchema = z.object({
  productName: z.string().min(1, 'Required').max(100),
  productDescription: z.string().min(10, 'Min 10 characters').max(500),
  targetAudience: z.string().min(1, 'Required').max(200),
  platform: z.enum(['tiktok', 'instagram', 'youtube_shorts', 'twitter_x', 'linkedin']),
  contentGoal: z.enum(['sales', 'engagement', 'follower_growth', 'authority_building']),
  tone: z.enum(['casual', 'bold', 'emotional', 'educational', 'storytelling']),
  ctaType: z.string().min(1, 'Required').max(100),
  competitorLinks: z.string().optional(),
  customerReviews: z.string().optional(),
  websiteUrl: z.string().optional(),
  pricePoint: z.string().optional(),
  objections: z.string().optional(),
})

type FormData = z.infer<typeof formSchema>

const selectClass = "w-full rounded-lg border border-gray-700 bg-gray-800/50 px-3 py-2.5 text-sm text-gray-100 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 transition-colors"
const inputClass = "w-full rounded-lg border border-gray-700 bg-gray-800/50 px-3 py-2.5 text-sm text-gray-100 placeholder:text-gray-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 transition-colors"
const textareaClass = `${inputClass} resize-vertical min-h-[80px]`

export default function GeneratePage() {
  const [output, setOutput] = useState<GeneratedOutput | null>(null)
  const [loading, setLoading] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)

  const { register, handleSubmit, getValues, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      platform: 'tiktok',
      contentGoal: 'sales',
      tone: 'casual',
    },
  })

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error || 'Generation failed')
        return
      }
      setOutput(json.output)
      toast.success('Content generated successfully!')
      const outputEl = document.getElementById('output')
      if (outputEl) {
        window.scrollTo({ top: outputEl.offsetTop, behavior: 'smooth' })
      }
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!output) return
    try {
      const data = getValues()
      const res = await fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, output }),
      })
      if (res.ok) {
        toast.success('Content saved!')
      } else {
        toast.error('Failed to save content')
      }
    } catch {
      toast.error('Failed to save')
    }
  }

  const handleDownload = () => {
    if (!output) return
    const data = getValues()
    const text = `UGCForge – Generated Content
Product: ${data.productName}
Platform: ${data.platform}
Generated: ${new Date().toLocaleDateString()}

=== HOOK OPTIONS ===
${output.hookBank.map((h, i) => `${i + 1}. ${h}`).join('\n')}

=== SCRIPT ===
${output.script}

=== ALT ANGLE (Problem-Based) ===
${output.altAngles.problemBased}

=== ALT ANGLE (Story-Based) ===
${output.altAngles.storyBased}

=== ALT ANGLE (Social Proof-Based) ===
${output.altAngles.socialProofBased}

=== CAPTION ===
${output.caption}

=== HASHTAGS ===
${output.hashtags.join('\n')}

=== CTA VARIATIONS ===
${output.ctaVariations.map((c, i) => `${i + 1}. ${c}`).join('\n')}

=== THUMBNAIL TEXT ===
${output.thumbnailTexts.map((t, i) => `${i + 1}. ${t}`).join('\n')}

=== ENGAGEMENT BAIT COMMENTS ===
${output.engagementBaits.map((e, i) => `${i + 1}. ${e}`).join('\n')}

=== REPURPOSED FOR ANOTHER PLATFORM ===
${output.repurposedContent}

=== A/B TEST VARIANTS ===
${output.abVariants.join('\n\n')}
`
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ugcforge-${data.productName.replace(/\s+/g, '-').toLowerCase()}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const label = (text: string, required?: boolean) => (
    <label className="block text-sm font-medium text-gray-300 mb-1">
      {text} {required && <span className="text-red-400">*</span>}
    </label>
  )

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-1">Generate UGC Content</h1>
        <p className="text-gray-400">Fill in your product details and let AI create high-converting content</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Core Inputs */}
        <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-white mb-4">Product Details</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              {label('Product Name', true)}
              <input {...register('productName')} placeholder="e.g. AirPods Pro 3" className={inputClass} />
              {errors.productName && <p className="text-xs text-red-400 mt-1">{errors.productName.message}</p>}
            </div>
            <div>
              {label('Target Audience', true)}
              <input {...register('targetAudience')} placeholder="e.g. Fitness enthusiasts 18-35" className={inputClass} />
              {errors.targetAudience && <p className="text-xs text-red-400 mt-1">{errors.targetAudience.message}</p>}
            </div>
          </div>

          <div>
            {label('Product Description', true)}
            <textarea {...register('productDescription')} placeholder="Describe your product, its key benefits and unique value proposition..." className={textareaClass} rows={3} />
            {errors.productDescription && <p className="text-xs text-red-400 mt-1">{errors.productDescription.message}</p>}
          </div>

          <div>
            {label('Call-to-Action Type', true)}
            <input {...register('ctaType')} placeholder="e.g. Shop now, Link in bio, Comment PROMO for discount" className={inputClass} />
            {errors.ctaType && <p className="text-xs text-red-400 mt-1">{errors.ctaType.message}</p>}
          </div>
        </div>

        {/* Settings */}
        <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-6">
          <h2 className="font-semibold text-white mb-4">Content Settings</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              {label('Platform', true)}
              <select {...register('platform')} className={selectClass}>
                <option value="tiktok">TikTok</option>
                <option value="instagram">Instagram</option>
                <option value="youtube_shorts">YouTube Shorts</option>
                <option value="twitter_x">Twitter/X</option>
                <option value="linkedin">LinkedIn</option>
              </select>
            </div>
            <div>
              {label('Content Goal', true)}
              <select {...register('contentGoal')} className={selectClass}>
                <option value="sales">Sales</option>
                <option value="engagement">Engagement</option>
                <option value="follower_growth">Follower Growth</option>
                <option value="authority_building">Authority Building</option>
              </select>
            </div>
            <div>
              {label('Tone', true)}
              <select {...register('tone')} className={selectClass}>
                <option value="casual">Casual</option>
                <option value="bold">Bold</option>
                <option value="emotional">Emotional</option>
                <option value="educational">Educational</option>
                <option value="storytelling">Storytelling</option>
              </select>
            </div>
          </div>
        </div>

        {/* Advanced */}
        <div className="bg-gray-900/60 border border-gray-800 rounded-xl overflow-hidden">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-800/40 transition-colors"
          >
            <span className="font-semibold text-white text-sm">Advanced Options (Optional)</span>
            <span className="text-xs text-gray-400">{showAdvanced ? 'Hide' : 'Show'}</span>
          </button>
          {showAdvanced && (
            <div className="px-6 pb-6 space-y-4 border-t border-gray-800">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  {label('Price Point')}
                  <input {...register('pricePoint')} placeholder="e.g. $29.99, $199" className={inputClass} />
                </div>
                <div>
                  {label('Website URL')}
                  <input {...register('websiteUrl')} placeholder="https://yourstore.com" className={inputClass} />
                </div>
              </div>
              <div>
                {label('Customer Reviews / Testimonials')}
                <textarea {...register('customerReviews')} placeholder="Paste 2-3 real customer reviews for social proof..." className={textareaClass} rows={3} />
              </div>
              <div>
                {label('Common Objections')}
                <textarea {...register('objections')} placeholder="What objections do customers have? e.g. Too expensive, doesn't work for my skin type..." className={textareaClass} rows={2} />
              </div>
              <div>
                {label('Competitor Links')}
                <input {...register('competitorLinks')} placeholder="https://competitor.com" className={inputClass} />
              </div>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-4 rounded-xl text-base font-semibold transition-all shadow-lg shadow-violet-500/20"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Generating content...
            </>
          ) : (
            <>
              <Wand2 className="w-5 h-5" />
              Generate UGC Content
            </>
          )}
        </button>
      </form>

      {/* Output */}
      {output && (
        <div id="output" className="mt-10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Generated Content</h2>
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-200 px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-gray-700"
              >
                <Save className="w-4 h-4" />
                Save
              </button>
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-200 px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-gray-700"
              >
                <Download className="w-4 h-4" />
                Download
              </button>
              <button
                onClick={() => handleSubmit(onSubmit)()}
                className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Regenerate
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <OutputSection title="🎯 Hook Options (10 Variations)" content={output.hookBank} defaultOpen={true} />
            <OutputSection title="🎬 Video Script (30-60 sec)" content={output.script} />
            <OutputSection title="😤 Alt Angle – Problem-Based" content={output.altAngles.problemBased} />
            <OutputSection title="📖 Alt Angle – Story-Based" content={output.altAngles.storyBased} />
            <OutputSection title="⭐ Alt Angle – Social Proof-Based" content={output.altAngles.socialProofBased} />
            <OutputSection title="📝 Caption" content={output.caption} />
            <OutputSection title="#️⃣ Hashtags" content={output.hashtags} />
            <OutputSection title="📣 CTA Variations" content={output.ctaVariations} />
            <OutputSection title="🖼️ Thumbnail Text Suggestions" content={output.thumbnailTexts} />
            <OutputSection title="💬 Engagement Bait Comments" content={output.engagementBaits} />
            <OutputSection title="🔄 Repurposed for Another Platform" content={output.repurposedContent} />
            <OutputSection title="🧪 A/B Test Variants" content={output.abVariants} />
          </div>
        </div>
      )}
    </div>
  )
}
