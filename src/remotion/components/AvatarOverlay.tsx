/**
 * AvatarOverlay — Remotion component for rendering a talking head avatar
 * overlay in the video corner.
 *
 * Supports:
 *  - Video avatar (D-ID / SadTalker result) via <Video>
 *  - Static face image with animated breathing + lip-sync via <Img>
 *  - Configurable position, shape, size
 *  - Entry/exit animation
 *  - Green circle "live" indicator
 */

import React from 'react'
import {
  AbsoluteFill,
  Img,
  Video,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion'

export interface AvatarOverlayProps {
  /** Face image URL (static overlay) */
  faceImageUrl?: string
  /** Talking head video URL (D-ID / SadTalker) */
  avatarVideoUrl?: string
  /** Whether the avatar is a video */
  isVideo?: boolean
  /** Position on screen */
  position?: 'bottom-left' | 'bottom-right' | 'bottom-center' | 'top-left' | 'top-right'
  /** Shape of the avatar frame */
  shape?: 'circle' | 'rounded' | 'rectangle'
  /** Size multiplier */
  size?: 'small' | 'medium' | 'large'
  /** Word boundaries for lip-sync animation (static mode) */
  wordBoundaries?: { text: string; startMs: number; endMs: number }[]
  /** Frame to start showing avatar */
  startFrame?: number
  /** Frame to stop showing avatar */
  endFrame?: number
  /** Label shown below the avatar frame (defaults to 'UGC Creator') */
  creatorLabel?: string
}

const SIZE_MAP = {
  small: { width: 140, height: 140 },
  medium: { width: 200, height: 200 },
  large: { width: 260, height: 260 },
}

const POSITION_MAP = {
  'bottom-left': { bottom: 180, left: 30, top: 'auto' as const, right: 'auto' as const },
  'bottom-right': { bottom: 180, right: 30, top: 'auto' as const, left: 'auto' as const },
  'bottom-center': { bottom: 180, left: '50%', top: 'auto' as const, right: 'auto' as const },
  'top-left': { top: 80, left: 30, bottom: 'auto' as const, right: 'auto' as const },
  'top-right': { top: 80, right: 30, bottom: 'auto' as const, left: 'auto' as const },
}

const BORDER_RADIUS_MAP = {
  circle: '50%',
  rounded: '20px',
  rectangle: '8px',
}

export const AvatarOverlay: React.FC<AvatarOverlayProps> = ({
  faceImageUrl,
  avatarVideoUrl,
  isVideo = false,
  position = 'bottom-right',
  shape = 'circle',
  size = 'medium',
  wordBoundaries = [],
  startFrame = 0,
  endFrame,
  creatorLabel = 'UGC Creator',
}) => {
  const frame = useCurrentFrame()
  const { fps, durationInFrames } = useVideoConfig()

  const effectiveEndFrame = endFrame ?? durationInFrames
  const src = isVideo ? avatarVideoUrl : faceImageUrl

  if (!src) return null
  if (frame < startFrame || frame > effectiveEndFrame) return null

  const dimensions = SIZE_MAP[size] || SIZE_MAP.medium
  const positionStyle = POSITION_MAP[position] || POSITION_MAP['bottom-right']
  const borderRadius = BORDER_RADIUS_MAP[shape] || BORDER_RADIUS_MAP.circle

  // Entry animation
  const entryProgress = spring({
    frame: Math.max(0, frame - startFrame),
    fps,
    config: { damping: 14, stiffness: 100 },
  })

  // Exit animation (last 0.5s)
  const exitStart = effectiveEndFrame - Math.floor(fps * 0.5)
  const exitProgress = frame >= exitStart
    ? interpolate(frame, [exitStart, effectiveEndFrame], [1, 0], { extrapolateRight: 'clamp' })
    : 1

  const opacity = entryProgress * exitProgress
  const scale = interpolate(entryProgress, [0, 1], [0.5, 1]) * interpolate(exitProgress, [0, 1], [0.8, 1])

  // Breathing animation (subtle scale oscillation)
  const breathe = 1 + Math.sin(frame / (fps * 0.8) * Math.PI) * 0.015

  // Lip-sync animation for static mode: detect if currently speaking
  let isSpeaking = false
  if (!isVideo && wordBoundaries.length > 0) {
    const currentMs = (frame / fps) * 1000
    isSpeaking = wordBoundaries.some(wb => currentMs >= wb.startMs && currentMs <= wb.endMs)
  }

  // Subtle jaw movement for speaking (static mode only)
  const speakScale = isSpeaking ? 1 + Math.sin(frame * 0.8) * 0.02 : 1

  // Glow effect when speaking
  const glowIntensity = isSpeaking ? 0.6 : 0.2
  const glowColor = isSpeaking ? 'rgba(168, 85, 247, 0.6)' : 'rgba(168, 85, 247, 0.2)'

  // Transform for bottom-center
  const isCenter = position === 'bottom-center'
  const translateX = isCenter ? '-50%' : '0'

  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <div
        style={{
          position: 'absolute',
          ...positionStyle,
          width: dimensions.width,
          height: dimensions.height,
          opacity,
          transform: `translate(${translateX}, 0) scale(${scale * breathe * speakScale})`,
          zIndex: 50,
        }}
      >
        {/* Glow ring */}
        <div
          style={{
            position: 'absolute',
            inset: -4,
            borderRadius,
            background: `conic-gradient(from ${frame * 2}deg, ${glowColor}, transparent, ${glowColor})`,
            opacity: glowIntensity + (isSpeaking ? Math.sin(frame * 0.3) * 0.2 : 0),
            filter: 'blur(4px)',
          }}
        />

        {/* Border ring */}
        <div
          style={{
            position: 'absolute',
            inset: -3,
            borderRadius,
            border: '3px solid rgba(255, 255, 255, 0.8)',
            boxShadow: `0 4px 20px rgba(0, 0, 0, 0.4), inset 0 0 0 1px rgba(255, 255, 255, 0.1)`,
          }}
        />

        {/* Avatar content */}
        <div
          style={{
            width: '100%',
            height: '100%',
            borderRadius,
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          {isVideo && avatarVideoUrl ? (
            <Video
              src={avatarVideoUrl}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          ) : faceImageUrl ? (
            <Img
              src={faceImageUrl}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          ) : null}

          {/* Vignette overlay */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'radial-gradient(circle, transparent 60%, rgba(0,0,0,0.3) 100%)',
              borderRadius,
            }}
          />
        </div>

        {/* Live indicator dot */}
        <div
          style={{
            position: 'absolute',
            top: shape === 'circle' ? 8 : 6,
            right: shape === 'circle' ? 8 : 6,
            width: 14,
            height: 14,
            borderRadius: '50%',
            background: isSpeaking ? '#22c55e' : '#6b7280',
            border: '2px solid rgba(0,0,0,0.5)',
            boxShadow: isSpeaking ? '0 0 8px #22c55e' : 'none',
            transition: 'background 0.2s',
          }}
        />

        {/* Name label (optional) */}
        <div
          style={{
            position: 'absolute',
            bottom: -24,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(0,0,0,0.7)',
            color: 'white',
            fontSize: 11,
            fontWeight: 600,
            padding: '2px 10px',
            borderRadius: 8,
            whiteSpace: 'nowrap',
            backdropFilter: 'blur(4px)',
          }}
        >
          {creatorLabel}
        </div>
      </div>
    </AbsoluteFill>
  )
}

export default AvatarOverlay
