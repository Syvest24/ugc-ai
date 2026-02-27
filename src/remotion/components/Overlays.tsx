import React from 'react'
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  spring,
} from 'remotion'

interface ProgressBarProps {
  color?: string
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  color = '#A855F7',
}) => {
  const frame = useCurrentFrame()
  const { durationInFrames } = useVideoConfig()
  const progress = (frame / durationInFrames) * 100

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        zIndex: 20,
      }}
    >
      <div
        style={{
          height: '100%',
          width: `${progress}%`,
          backgroundColor: color,
          transition: 'width 0.05s linear',
        }}
      />
    </div>
  )
}

interface CTAOverlayProps {
  text: string
  startFrame: number
  durationFrames: number
  style?: 'button' | 'banner' | 'minimal'
}

export const CTAOverlay: React.FC<CTAOverlayProps> = ({
  text,
  startFrame,
  durationFrames,
  style = 'button',
}) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const relativeFrame = frame - startFrame

  if (relativeFrame < 0 || relativeFrame > durationFrames) return null

  const entryProgress = spring({
    frame: relativeFrame,
    fps,
    config: { damping: 12, stiffness: 100 },
  })

  // Pulse effect
  const pulse = Math.sin(relativeFrame * 0.15) * 0.03 + 1

  if (style === 'button') {
    return (
      <div
        style={{
          position: 'absolute',
          bottom: 60,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
          zIndex: 15,
          transform: `translateY(${(1 - entryProgress) * 50}px) scale(${pulse})`,
          opacity: entryProgress,
        }}
      >
        <div
          style={{
            backgroundColor: '#A855F7',
            color: 'white',
            fontSize: 24,
            fontWeight: 800,
            fontFamily: 'Inter, system-ui, sans-serif',
            padding: '16px 40px',
            borderRadius: 16,
            boxShadow: '0 8px 32px rgba(168, 85, 247, 0.4)',
            textTransform: 'uppercase',
            letterSpacing: '1px',
          }}
        >
          {text}
        </div>
      </div>
    )
  }

  if (style === 'banner') {
    return (
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 15,
          transform: `translateY(${(1 - entryProgress) * 100}%)`,
        }}
      >
        <div
          style={{
            background: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.9) 40%)',
            padding: '60px 40px 40px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              color: 'white',
              fontSize: 28,
              fontWeight: 800,
              fontFamily: 'Inter, system-ui, sans-serif',
              textShadow: '0 2px 8px rgba(0,0,0,0.5)',
            }}
          >
            {text}
          </div>
        </div>
      </div>
    )
  }

  // minimal
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 80,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        zIndex: 15,
        opacity: entryProgress,
      }}
    >
      <div
        style={{
          color: '#A855F7',
          fontSize: 20,
          fontWeight: 700,
          fontFamily: 'Inter, system-ui, sans-serif',
          letterSpacing: '2px',
          textTransform: 'uppercase',
          textShadow: '0 2px 10px rgba(168, 85, 247, 0.5)',
        }}
      >
        ▶ {text}
      </div>
    </div>
  )
}

interface WatermarkProps {
  text?: string
}

export const Watermark: React.FC<WatermarkProps> = ({ text = '@UGCForge' }) => {
  return (
    <div
      style={{
        position: 'absolute',
        top: 20,
        right: 20,
        zIndex: 20,
        color: 'rgba(255, 255, 255, 0.4)',
        fontSize: 14,
        fontWeight: 600,
        fontFamily: 'Inter, system-ui, sans-serif',
        letterSpacing: '0.5px',
      }}
    >
      {text}
    </div>
  )
}
