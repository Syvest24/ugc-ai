'use client'

import { Film } from 'lucide-react'

interface ScriptHookFormProps {
  productName: string
  setProductName: (v: string) => void
  platform: string
  setPlatform: (v: string) => void
  productDescription: string
  setProductDescription: (v: string) => void
  hookText: string
  setHookText: (v: string) => void
  scriptText: string
  setScriptText: (v: string) => void
  ctaText: string
  setCtaText: (v: string) => void
  sectionHeader: (title: string, step: number, icon: React.ReactNode) => React.ReactNode
}

export default function ScriptHookForm({
  productName, setProductName,
  platform, setPlatform,
  productDescription, setProductDescription,
  hookText, setHookText,
  scriptText, setScriptText,
  ctaText, setCtaText,
  sectionHeader,
}: ScriptHookFormProps) {
  return (
    <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-6">
      {sectionHeader('Script & Hook', 1, <Film className="w-4 h-4 text-violet-400" />)}

      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Product Name <span className="text-red-400">*</span>
            </label>
            <input
              value={productName}
              onChange={e => setProductName(e.target.value)}
              placeholder="e.g. AirPods Pro 3"
              className="w-full rounded-lg border border-gray-700 bg-gray-800/50 px-3 py-2.5 text-sm text-gray-100 placeholder:text-gray-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Platform
            </label>
            <select
              value={platform}
              onChange={e => setPlatform(e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-800/50 px-3 py-2.5 text-sm text-gray-100 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 transition-colors"
            >
              <option value="tiktok">TikTok (9:16)</option>
              <option value="instagram">Instagram Reels (9:16)</option>
              <option value="youtube_shorts">YouTube Shorts (9:16)</option>
              <option value="twitter_x">Twitter/X (1:1)</option>
              <option value="linkedin">LinkedIn (1:1)</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Product Description
          </label>
          <input
            value={productDescription}
            onChange={e => setProductDescription(e.target.value)}
            placeholder="Brief description for stock footage search..."
            className="w-full rounded-lg border border-gray-700 bg-gray-800/50 px-3 py-2.5 text-sm text-gray-100 placeholder:text-gray-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Hook Text <span className="text-red-400">*</span>
          </label>
          <input
            value={hookText}
            onChange={e => setHookText(e.target.value)}
            placeholder="e.g. Stop scrolling! This changed everything..."
            className="w-full rounded-lg border border-gray-700 bg-gray-800/50 px-3 py-2.5 text-sm text-gray-100 placeholder:text-gray-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 transition-colors"
          />
          <p className="text-xs text-gray-500 mt-1">Shown in the first 3 seconds of the video</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Script Text <span className="text-red-400">*</span>
          </label>
          <textarea
            value={scriptText}
            onChange={e => setScriptText(e.target.value)}
            placeholder="Paste your generated script here... Each line will be displayed as a separate caption."
            rows={6}
            className="w-full rounded-lg border border-gray-700 bg-gray-800/50 px-3 py-2.5 text-sm text-gray-100 placeholder:text-gray-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 transition-colors resize-vertical min-h-[120px]"
          />
          <p className="text-xs text-gray-500 mt-1">
            {scriptText.length}/2000 characters · Stage directions like [PAUSE] will be removed
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            CTA Text
          </label>
          <input
            value={ctaText}
            onChange={e => setCtaText(e.target.value)}
            placeholder="e.g. Link in Bio, Shop Now"
            className="w-full rounded-lg border border-gray-700 bg-gray-800/50 px-3 py-2.5 text-sm text-gray-100 placeholder:text-gray-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 transition-colors"
          />
        </div>
      </div>
    </div>
  )
}
