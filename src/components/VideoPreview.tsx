'use client'

import { useState, useEffect } from 'react'
import { Eye, Smartphone, Monitor } from 'lucide-react'
import { TEMPLATE_LABELS } from '@/lib/constants'

interface VideoPreviewProps {
  template: string
  hook: string
  scriptLines: string[]
  cta: string
  colorAccent: string
  captionStyle: string
  hookStyle: string
  backgroundImage?: string | null
  platform: string
}

export default function VideoPreview({
  template,
  hook,
  scriptLines,
  cta,
  colorAccent,
  captionStyle,
  hookStyle,
  backgroundImage,
  platform,
}: VideoPreviewProps) {
  const [currentStep, setCurrentStep] = useState<'hook' | 'content' | 'cta'>('hook')
  const [currentLine, setCurrentLine] = useState(0)
  const [isPlaying, setIsPlaying] = useState(true)
  const [deviceMode, setDeviceMode] = useState<'phone' | 'desktop'>('phone')

  // Auto-cycle through content
  useEffect(() => {
    if (!isPlaying) return

    const timer = setInterval(() => {
      setCurrentStep(prev => {
        if (prev === 'hook') return 'content'
        if (prev === 'content') {
          if (currentLine < scriptLines.length - 1) {
            setCurrentLine(l => l + 1)
            return 'content'
          }
          return 'cta'
        }
        // Reset cycle
        setCurrentLine(0)
        return 'hook'
      })
    }, 2000)

    return () => clearInterval(timer)
  }, [isPlaying, currentLine, scriptLines.length])

  const isSquare = platform === 'twitter_x' || platform === 'linkedin'
  const aspectRatio = isSquare ? '1/1' : '9/16'
  const maxWidth = deviceMode === 'phone' ? (isSquare ? 280 : 200) : (isSquare ? 400 : 280)
  const maxHeight = deviceMode === 'phone' ? (isSquare ? 280 : 356) : (isSquare ? 400 : 500)

  const renderTemplateContent = () => {
    switch (template) {
      case 'CaptionStyle':
        return (
          <>
            {/* Gradient BG */}
            <div className="absolute inset-0"
              style={{
                background: backgroundImage
                  ? `url(${backgroundImage}) center/cover`
                  : `linear-gradient(135deg, #0c0015, #1a0533 50%, #0d1b3e)`,
              }}
            />
            <div className="absolute inset-0 bg-black/40" />

            {/* Progress bar */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-white/10 z-10">
              <div
                className="h-full transition-all duration-500"
                style={{
                  backgroundColor: colorAccent,
                  width: currentStep === 'hook' ? '15%' : currentStep === 'cta' ? '95%' : `${20 + (currentLine / Math.max(scriptLines.length, 1)) * 70}%`,
                }}
              />
            </div>

            {/* Hook */}
            {currentStep === 'hook' && (
              <div className="absolute inset-0 flex items-center justify-center px-4 z-5 animate-fade-in">
                <p className="text-white font-black text-center text-xs uppercase tracking-wide leading-relaxed"
                  style={{ textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>
                  {hook || 'Your hook text here...'}
                </p>
              </div>
            )}

            {/* Caption (bottom) */}
            {currentStep === 'content' && (
              <div className="absolute bottom-12 left-3 right-3 z-5 animate-fade-in">
                <p className="text-white text-[10px] font-semibold text-center px-2 py-1 rounded-lg"
                  style={{
                    backgroundColor: captionStyle === 'karaoke' ? 'rgba(0,0,0,0.6)' : 'transparent',
                    textShadow: '0 1px 4px rgba(0,0,0,0.8)',
                  }}>
                  {scriptLines[currentLine] || 'Script line...'}
                </p>
              </div>
            )}

            {/* CTA */}
            {currentStep === 'cta' && (
              <div className="absolute bottom-8 left-0 right-0 flex justify-center z-5 animate-bounce-in">
                <div className="px-4 py-1.5 rounded-full text-white text-[9px] font-bold uppercase tracking-wider"
                  style={{ backgroundColor: colorAccent, boxShadow: `0 4px 12px ${colorAccent}60` }}>
                  {cta || 'Link in Bio'}
                </div>
              </div>
            )}
          </>
        )

      case 'TextOnScreen':
        return (
          <>
            <div className="absolute inset-0"
              style={{ background: 'linear-gradient(180deg, #0a0a0a, #1a1a2e 50%, #0a0a0a)' }}
            />
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-white/10 z-10">
              <div className="h-full transition-all duration-500" style={{
                backgroundColor: colorAccent,
                width: currentStep === 'hook' ? '15%' : currentStep === 'cta' ? '95%' : `${20 + (currentLine / Math.max(scriptLines.length, 1)) * 70}%`,
              }} />
            </div>

            {currentStep === 'hook' && (
              <div className="absolute inset-0 flex items-center justify-center px-4 z-5 animate-typewriter">
                <p className="font-black text-center text-xs" style={{ color: colorAccent }}>
                  {hook || 'Hook...'}
                </p>
              </div>
            )}

            {currentStep === 'content' && (
              <div className="absolute inset-0 flex items-center justify-center px-4 z-5 animate-slide-in">
                <p className="text-white text-[11px] font-bold text-center uppercase">
                  {scriptLines[currentLine] || '...'}
                </p>
              </div>
            )}

            {currentStep === 'cta' && (
              <div className="absolute bottom-0 left-0 right-0 z-5 animate-fade-in"
                style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.9) 40%)' }}>
                <p className="text-white text-[10px] font-bold text-center pb-4 pt-8">
                  {cta}
                </p>
              </div>
            )}
          </>
        )

      case 'SplitScreen':
        return (
          <>
            <div className="absolute top-0 left-0 right-0" style={{
              height: '35%',
              background: `linear-gradient(135deg, ${colorAccent}20, ${colorAccent}40)`,
              borderBottom: `1px solid ${colorAccent}60`,
            }}>
              <div className="flex items-center justify-center h-full px-3">
                <p className="text-white text-[10px] font-bold text-center uppercase">
                  {hook || 'Hook...'}
                </p>
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0" style={{ height: '65%' }}>
              <div className="h-full"
                style={{ background: 'linear-gradient(135deg, #1a1a2e, #0f3460)' }} />
              <div className="absolute inset-0 flex items-center justify-center px-4">
                {currentStep === 'cta' ? (
                  <p className="text-[9px] font-bold uppercase tracking-wider animate-fade-in"
                    style={{ color: colorAccent }}>▶ {cta}</p>
                ) : (
                  <p className="text-white text-[10px] font-semibold text-center animate-fade-in">
                    {currentStep === 'hook' ? '...' : scriptLines[currentLine] || '...'}
                  </p>
                )}
              </div>
            </div>
          </>
        )

      case 'Countdown':
        return (
          <>
            <div className="absolute inset-0"
              style={{ background: `linear-gradient(180deg, #0f0f0f, ${colorAccent}15 50%, #0f0f0f)` }} />

            {currentStep === 'hook' && (
              <div className="absolute inset-0 flex items-center justify-center px-4 animate-fade-in">
                <p className="font-black text-center text-xs" style={{ color: colorAccent }}>
                  {hook}
                </p>
              </div>
            )}

            {currentStep === 'content' && (
              <>
                <div className="absolute top-6 left-0 right-0 flex justify-center z-10">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ background: `linear-gradient(135deg, ${colorAccent}, ${colorAccent}CC)` }}>
                    <span className="text-lg font-black text-black">{scriptLines.length - currentLine}</span>
                  </div>
                </div>
                <div className="absolute inset-0 flex items-center justify-center px-4 pt-8 animate-slide-in">
                  <div className="bg-black/70 rounded-lg px-3 py-2" style={{ borderLeft: `2px solid ${colorAccent}` }}>
                    <p className="text-white text-[10px] font-medium">{scriptLines[currentLine]}</p>
                  </div>
                </div>
              </>
            )}

            {currentStep === 'cta' && (
              <div className="absolute bottom-8 left-0 right-0 flex justify-center animate-bounce-in">
                <div className="px-4 py-1.5 rounded-full text-white text-[9px] font-bold uppercase"
                  style={{ backgroundColor: colorAccent }}>
                  {cta}
                </div>
              </div>
            )}
          </>
        )

      case 'Testimonial':
        return (
          <>
            <div className="absolute inset-0"
              style={{ background: `linear-gradient(180deg, #0a0a0a, ${colorAccent}10 40%, #0a0a0a)` }} />

            {currentStep === 'hook' && (
              <div className="absolute inset-0 flex items-center justify-center px-4 animate-fade-in">
                <p className="text-white font-bold text-center text-xs">{hook}</p>
              </div>
            )}

            {currentStep === 'content' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center px-4 animate-fade-in">
                <div className="w-8 h-8 rounded-full flex items-center justify-center mb-2"
                  style={{ background: `linear-gradient(135deg, ${colorAccent}, ${colorAccent}80)` }}>
                  <span className="text-sm text-white">★</span>
                </div>
                <div className="text-xl mb-1" style={{ color: `${colorAccent}60` }}>&ldquo;</div>
                <div className="bg-white/5 border rounded-lg px-3 py-2 max-w-full"
                  style={{ borderColor: `${colorAccent}30` }}>
                  <p className="text-[10px] text-gray-200 text-center italic font-serif">
                    {scriptLines[currentLine]}
                  </p>
                </div>
                <div className="flex gap-0.5 mt-2">
                  {[1,2,3,4,5].map(s => (
                    <span key={s} className="text-[8px]" style={{ color: colorAccent }}>★</span>
                  ))}
                </div>
              </div>
            )}

            {currentStep === 'cta' && (
              <div className="absolute bottom-0 left-0 right-0 animate-fade-in"
                style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.9) 40%)' }}>
                <p className="text-white text-[10px] font-bold text-center pb-4 pt-6">{cta}</p>
              </div>
            )}
          </>
        )

      case 'BeforeAfter':
        return (
          <>
            <div className="absolute inset-0"
              style={{ background: 'linear-gradient(180deg, #1a0000, #0a0a0a 50%, #001a00)' }} />

            {currentStep === 'hook' && (
              <div className="absolute inset-0 flex items-center justify-center px-4 animate-fade-in">
                <p className="text-white font-bold text-center text-xs">{hook}</p>
              </div>
            )}

            {currentStep === 'content' && (
              <>
                <div className="absolute top-4 left-0 right-0 flex justify-center z-10">
                  <div className={`px-3 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest text-white ${
                    currentLine < Math.ceil(scriptLines.length / 2)
                      ? 'bg-red-500'
                      : 'bg-green-500'
                  }`}>
                    {currentLine < Math.ceil(scriptLines.length / 2) ? 'BEFORE' : 'AFTER'}
                  </div>
                </div>
                <div className="absolute inset-0 flex items-center justify-center px-4 animate-fade-in">
                  <p className={`text-[11px] font-bold text-center ${
                    currentLine < Math.ceil(scriptLines.length / 2)
                      ? 'text-red-300'
                      : 'text-green-300'
                  }`}>
                    {scriptLines[currentLine]}
                  </p>
                </div>
              </>
            )}

            {currentStep === 'cta' && (
              <div className="absolute bottom-8 left-0 right-0 flex justify-center animate-bounce-in">
                <div className="px-4 py-1.5 rounded-full text-white text-[9px] font-bold uppercase"
                  style={{ backgroundColor: colorAccent }}>
                  {cta}
                </div>
              </div>
            )}
          </>
        )

      case 'ProductShowcase':
        return (
          <>
            <div className="absolute inset-0"
              style={{ background: `radial-gradient(ellipse at center, ${colorAccent}15, #0a0a0a 70%)` }} />

            {currentStep === 'hook' && (
              <div className="absolute inset-0 flex items-center justify-center px-4 animate-typewriter">
                <p className="font-bold text-center text-xs" style={{ color: colorAccent }}>{hook}</p>
              </div>
            )}

            {currentStep === 'content' && (
              <div className={`absolute top-1/4 px-3 animate-slide-in ${currentLine % 2 === 0 ? 'left-2' : 'right-2'}`}
                style={{ maxWidth: '90%' }}>
                <div className="bg-black/75 rounded-lg p-2.5 flex items-start gap-2"
                  style={{ border: `1px solid ${colorAccent}40` }}>
                  <div className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0"
                    style={{ background: `${colorAccent}20`, border: `1px solid ${colorAccent}50` }}>
                    <span className="text-[10px]" style={{ color: colorAccent }}>✦</span>
                  </div>
                  <div>
                    <div className="text-[7px] font-bold uppercase tracking-wider mb-0.5" style={{ color: colorAccent }}>
                      Feature {currentLine + 1}
                    </div>
                    <p className="text-[9px] text-gray-200 font-medium">{scriptLines[currentLine]}</p>
                  </div>
                </div>
                {/* Progress dots */}
                <div className="flex justify-center gap-1 mt-2">
                  {scriptLines.map((_, i) => (
                    <div key={i} className="rounded-full transition-all"
                      style={{
                        width: i === currentLine ? 12 : 4,
                        height: 4,
                        backgroundColor: i === currentLine ? colorAccent : `${colorAccent}40`,
                      }} />
                  ))}
                </div>
              </div>
            )}

            {currentStep === 'cta' && (
              <div className="absolute bottom-0 left-0 right-0 animate-fade-in"
                style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.9) 40%)' }}>
                <p className="text-white text-[10px] font-bold text-center pb-4 pt-6">{cta}</p>
              </div>
            )}
          </>
        )

      default:
        return (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
            <p className="text-gray-500 text-xs">Select a template</p>
          </div>
        )
    }
  }

  return (
    <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Eye className="w-4 h-4 text-violet-400" />
          Live Preview
        </h3>
        <div className="flex items-center gap-2">
          {/* Play/Pause */}
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`px-2.5 py-1 text-[10px] font-medium rounded-full border transition-colors ${
              isPlaying
                ? 'bg-green-600/20 border-green-500/30 text-green-400'
                : 'bg-gray-700/40 border-gray-600 text-gray-400'
            }`}
          >
            {isPlaying ? '▶ Playing' : '⏸ Paused'}
          </button>

          {/* Device toggle */}
          <div className="flex border border-gray-700 rounded-lg overflow-hidden">
            <button
              onClick={() => setDeviceMode('phone')}
              className={`p-1.5 ${deviceMode === 'phone' ? 'bg-violet-600/20 text-violet-400' : 'text-gray-500 hover:text-gray-300'}`}
              aria-label="Phone preview"
            >
              <Smartphone className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setDeviceMode('desktop')}
              className={`p-1.5 ${deviceMode === 'desktop' ? 'bg-violet-600/20 text-violet-400' : 'text-gray-500 hover:text-gray-300'}`}
              aria-label="Desktop preview"
            >
              <Monitor className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex justify-center">
        {/* Phone frame */}
        <div
          className="relative rounded-[20px] border-2 border-gray-700 overflow-hidden shadow-2xl bg-black"
          style={{
            width: maxWidth,
            aspectRatio,
          }}
        >
          {/* Notch */}
          {deviceMode === 'phone' && !isSquare && (
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-3 bg-black rounded-b-lg z-20" />
          )}

          {/* Watermark */}
          <div className="absolute top-2 right-2 z-20 text-[7px] text-white/30 font-semibold">
            @UGCForge
          </div>

          {/* Template content */}
          {renderTemplateContent()}
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2 mt-4">
        {(['hook', 'content', 'cta'] as const).map(step => (
          <button
            key={step}
            onClick={() => {
              setCurrentStep(step)
              if (step === 'content') setCurrentLine(0)
            }}
            className={`px-3 py-1 text-[10px] font-medium rounded-full border capitalize transition-colors ${
              currentStep === step
                ? 'border-violet-500 bg-violet-600/20 text-violet-400'
                : 'border-gray-700 text-gray-500 hover:border-gray-600'
            }`}
          >
            {step}
          </button>
        ))}
      </div>

      <p className="text-center text-[10px] text-gray-600 mt-2">
        {TEMPLATE_LABELS[template] || template} • {isSquare ? '1:1' : '9:16'} • Live preview (approximate)
      </p>

      {/* Animations CSS */}
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideIn { from { opacity: 0; transform: translateX(30px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes bounceIn { 0% { opacity: 0; transform: scale(0.6); } 60% { transform: scale(1.1); } 100% { opacity: 1; transform: scale(1); } }
        .animate-fade-in { animation: fadeIn 0.4s ease-out; }
        .animate-slide-in { animation: slideIn 0.5s ease-out; }
        .animate-bounce-in { animation: bounceIn 0.5s ease-out; }
        .animate-typewriter { animation: fadeIn 0.3s ease-out; }
      `}</style>
    </div>
  )
}
