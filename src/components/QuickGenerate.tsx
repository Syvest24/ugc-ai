'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Zap } from 'lucide-react'

export default function QuickGenerate() {
  const router = useRouter()
  const [product, setProduct] = useState('')

  const handleGo = () => {
    if (!product.trim()) return
    const params = new URLSearchParams({ q: product.trim() })
    router.push(`/generate?${params}`)
  }

  return (
    <div className="bg-gradient-to-r from-violet-600/10 to-pink-600/10 border border-violet-600/30 rounded-xl p-6 mb-8">
      <div className="flex items-center gap-2 mb-3">
        <Zap className="w-4 h-4 text-violet-400" />
        <h2 className="font-semibold text-white">Quick Generate</h2>
      </div>
      <p className="text-sm text-gray-400 mb-4">Describe what you&apos;re selling and jump straight into generation.</p>
      <div className="flex gap-3">
        <input
          type="text"
          value={product}
          onChange={e => setProduct(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleGo()}
          placeholder='e.g. "Wireless earbuds for gym-goers"'
          className="flex-1 rounded-lg border border-gray-700 bg-gray-800/50 px-4 py-2.5 text-sm text-gray-100 placeholder:text-gray-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 transition-colors"
          maxLength={200}
        />
        <button
          onClick={handleGo}
          disabled={!product.trim()}
          className="bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
        >
          Generate
        </button>
      </div>
    </div>
  )
}
