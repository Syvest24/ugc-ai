'use client'
import { useState } from 'react'
import { Check, Copy, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'

interface OutputSectionProps {
  title: string
  content: string | string[]
  defaultOpen?: boolean
}

export default function OutputSection({ title, content, defaultOpen = false }: OutputSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const [copied, setCopied] = useState(false)

  const textContent = Array.isArray(content) ? content.join('\n') : content

  const handleCopy = async () => {
    await navigator.clipboard.writeText(textContent)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="border border-gray-800 rounded-xl overflow-hidden">
      <div
        role="button"
        tabIndex={0}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setIsOpen(!isOpen) } }}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-900/60 hover:bg-gray-800/60 transition-colors cursor-pointer"
      >
        <span className="font-semibold text-sm text-gray-200">{title}</span>
        <div className="flex items-center gap-2">
          {isOpen && (
            <button
              onClick={(e) => { e.stopPropagation(); handleCopy() }}
              className={cn(
                'flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors',
                copied ? 'text-green-400' : 'text-gray-400 hover:text-gray-200'
              )}
            >
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          )}
          {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </div>
      {isOpen && (
        <div className="px-4 py-3 bg-gray-950/50 border-t border-gray-800">
          {Array.isArray(content) ? (
            <ol className="space-y-2">
              {content.map((item, i) => (
                <li key={i} className="flex gap-2 text-sm text-gray-300">
                  <span className="text-violet-400 font-mono text-xs mt-0.5 shrink-0">{i + 1}.</span>
                  <span>{item}</span>
                </li>
              ))}
            </ol>
          ) : (
            <pre className="text-sm text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">{content}</pre>
          )}
        </div>
      )}
    </div>
  )
}
