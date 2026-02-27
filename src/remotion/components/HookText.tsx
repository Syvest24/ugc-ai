import React from 'react'
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  spring,
} from 'remotion'

interface HookTextProps {
  text: string
  startFrame: number
  durationFrames: number
  style?: 'pop' | 'typewriter' | 'slide'
  fontSize?: number
  color?: string
}

export const HookText: React.FC<HookTextProps> = ({
  text,
  startFrame,
  durationFrames,
  style = 'pop',
  fontSize = 56,
  color = '#FFFFFF',
}) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const relativeFrame = frame - startFrame

  if (relativeFrame < 0 || relativeFrame > durationFrames) return null

  if (style === 'pop') {
    const scale = spring({
      frame: relativeFrame,
      fps,
      config: { damping: 8, stiffness: 150, mass: 0.5 },
    })

    const exitOpacity = interpolate(
      relativeFrame,
      [durationFrames - 10, durationFrames],
      [1, 0],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    )

    return (
      <AbsoluteFill
        style={{
          justifyContent: 'center',
          alignItems: 'center',
          padding: '0 60px',
        }}
      >
        <div
          style={{
            fontSize,
            fontWeight: 900,
            fontFamily: 'Inter, system-ui, sans-serif',
            color,
            textAlign: 'center',
            transform: `scale(${scale})`,
            opacity: exitOpacity,
            textShadow: '0 4px 20px rgba(0,0,0,0.8), 0 2px 4px rgba(0,0,0,0.5)',
            lineHeight: 1.2,
            textTransform: 'uppercase',
          }}
        >
          {text}
        </div>
      </AbsoluteFill>
    )
  }

  if (style === 'typewriter') {
    const charsToShow = Math.floor(
      interpolate(relativeFrame, [0, durationFrames * 0.6], [0, text.length], {
        extrapolateRight: 'clamp',
      })
    )
    const visibleText = text.slice(0, charsToShow)

    const exitOpacity = interpolate(
      relativeFrame,
      [durationFrames - 10, durationFrames],
      [1, 0],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    )

    return (
      <AbsoluteFill
        style={{
          justifyContent: 'center',
          alignItems: 'center',
          padding: '0 60px',
        }}
      >
        <div
          style={{
            fontSize,
            fontWeight: 800,
            fontFamily: 'monospace',
            color,
            textAlign: 'center',
            opacity: exitOpacity,
            textShadow: '0 4px 20px rgba(0,0,0,0.8)',
          }}
        >
          {visibleText}
          <span style={{ opacity: relativeFrame % 20 > 10 ? 1 : 0 }}>|</span>
        </div>
      </AbsoluteFill>
    )
  }

  // slide style
  const slideIn = spring({
    frame: relativeFrame,
    fps,
    config: { damping: 15, stiffness: 100 },
  })

  const translateX = interpolate(slideIn, [0, 1], [100, 0])
  const exitOpacity = interpolate(
    relativeFrame,
    [durationFrames - 10, durationFrames],
    [1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  )

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'center',
        alignItems: 'center',
        padding: '0 60px',
      }}
    >
      <div
        style={{
          fontSize,
          fontWeight: 800,
          fontFamily: 'Inter, system-ui, sans-serif',
          color,
          textAlign: 'center',
          transform: `translateX(${translateX}%)`,
          opacity: exitOpacity,
          textShadow: '0 4px 20px rgba(0,0,0,0.8)',
          textTransform: 'uppercase',
        }}
      >
        {text}
      </div>
    </AbsoluteFill>
  )
}
