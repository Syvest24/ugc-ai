import React from 'react'
import {
  AbsoluteFill,
  Img,
  OffthreadVideo,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion'

const VIDEO_EXTENSIONS = /\.(mp4|webm|mov|avi|mkv)(\?.*)?$/i
const VIDEO_URL_PATTERNS = /videos\.pexels\.com\/video-files|video-files\//i

function isVideoUrl(url: string): boolean {
  return VIDEO_EXTENSIONS.test(url) || VIDEO_URL_PATTERNS.test(url)
}

interface BackgroundProps {
  type: 'gradient' | 'image' | 'video-placeholder'
  src?: string
  gradient?: string
  overlay?: number // 0-1 darkness overlay
  zoom?: boolean
}

export const Background: React.FC<BackgroundProps> = ({
  type,
  src,
  gradient,
  overlay = 0.4,
  zoom = true,
}) => {
  const frame = useCurrentFrame()
  const { durationInFrames } = useVideoConfig()

  const scale = zoom
    ? interpolate(frame, [0, durationInFrames], [1, 1.15], {
        extrapolateRight: 'clamp',
      })
    : 1

  if (type === 'gradient') {
    return (
      <AbsoluteFill
        style={{
          background: gradient || 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
        }}
      />
    )
  }

  if ((type === 'image' || type === 'video-placeholder') && src) {
    const useVideo = isVideoUrl(src)
    return (
      <AbsoluteFill>
        {useVideo ? (
          <OffthreadVideo
            src={src}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transform: `scale(${scale})`,
            }}
            muted
          />
        ) : (
          <Img
            src={src}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transform: `scale(${scale})`,
            }}
          />
        )}
        <AbsoluteFill
          style={{
            backgroundColor: `rgba(0, 0, 0, ${overlay})`,
          }}
        />
      </AbsoluteFill>
    )
  }

  // Default gradient background
  return (
    <AbsoluteFill
      style={{
        background: 'linear-gradient(135deg, #0c0015 0%, #1a0533 30%, #0d1b3e 60%, #061220 100%)',
      }}
    >
      {/* Animated subtle grain/noise effect */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(ellipse at ${30 + Math.sin(frame * 0.02) * 20}% ${40 + Math.cos(frame * 0.015) * 15}%, rgba(168, 85, 247, 0.15) 0%, transparent 60%)`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(ellipse at ${70 + Math.cos(frame * 0.018) * 15}% ${60 + Math.sin(frame * 0.012) * 20}%, rgba(236, 72, 153, 0.1) 0%, transparent 50%)`,
        }}
      />
    </AbsoluteFill>
  )
}
