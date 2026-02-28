import React from 'react'
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  spring,
  Img,
  Sequence,
} from 'remotion'

interface AnimatedCaptionProps {
  words: { text: string; startMs: number; endMs: number }[]
  style?: 'karaoke' | 'word-by-word' | 'fade'
  fontSize?: number
  fontColor?: string
  highlightColor?: string
  strokeColor?: string
  position?: 'bottom' | 'center' | 'top'
}

export const AnimatedCaption: React.FC<AnimatedCaptionProps> = ({
  words,
  style = 'karaoke',
  fontSize = 48,
  fontColor = '#FFFFFF',
  highlightColor = '#A855F7',
  strokeColor = '#000000',
  position = 'bottom',
}) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const currentTimeMs = (frame / fps) * 1000

  // Group words into lines (max 6 words per line for readability)
  const lines: { text: string; startMs: number; endMs: number }[][] = []
  let currentLine: typeof words = []

  for (const word of words) {
    currentLine.push(word)
    if (currentLine.length >= 6 || word.text.endsWith('.') || word.text.endsWith('!') || word.text.endsWith('?') || word.text.endsWith(',')) {
      lines.push([...currentLine])
      currentLine = []
    }
  }
  if (currentLine.length > 0) lines.push(currentLine)

  // Find the active line
  const activeLineIndex = lines.findIndex(
    (line) => currentTimeMs >= line[0].startMs && currentTimeMs <= line[line.length - 1].endMs + 500
  )

  if (activeLineIndex === -1) return null

  const activeLine = lines[activeLineIndex]

  const positionStyle: React.CSSProperties =
    position === 'bottom'
      ? { bottom: 120, left: 0, right: 0 }
      : position === 'top'
      ? { top: 120, left: 0, right: 0 }
      : { top: '50%', left: 0, right: 0, transform: 'translateY(-50%)' }

  return (
    <div
      style={{
        position: 'absolute',
        ...positionStyle,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '0 40px',
        zIndex: 10,
      }}
    >
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: '8px',
        }}
      >
        {activeLine.map((word, i) => {
          const isActive = currentTimeMs >= word.startMs
          const progress = isActive
            ? Math.min(1, (currentTimeMs - word.startMs) / Math.max(100, word.endMs - word.startMs))
            : 0

          const scale = isActive
            ? spring({
                frame: frame - Math.floor((word.startMs / 1000) * fps),
                fps,
                config: { damping: 12, stiffness: 200 },
              })
            : 0.9

          return (
            <span
              key={i}
              style={{
                fontSize,
                fontWeight: 900,
                fontFamily: 'Inter, system-ui, sans-serif',
                color: style === 'karaoke' && isActive ? highlightColor : fontColor,
                textShadow: `
                  -2px -2px 0 ${strokeColor},
                  2px -2px 0 ${strokeColor},
                  -2px 2px 0 ${strokeColor},
                  2px 2px 0 ${strokeColor},
                  0 4px 8px rgba(0,0,0,0.5)
                `,
                transform: `scale(${isActive ? scale : 0.9})`,
                opacity: style === 'fade' ? (isActive ? progress : 0.4) : isActive ? 1 : 0.4,
                transition: style === 'word-by-word' ? 'all 0.1s ease' : undefined,
                textTransform: 'uppercase',
              }}
            >
              {word.text}
            </span>
          )
        })}
      </div>
    </div>
  )
}
