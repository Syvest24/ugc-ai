import React from 'react'
import {
  AbsoluteFill,
  Img,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion'

interface SceneBackgroundProps {
  /** Fallback single background image */
  backgroundImage?: string
  /** Per-scene background images (one per scriptLine) */
  sceneImages?: string[]
  /** Scene timing info */
  sceneStarts: number[] // frame numbers where each scene starts
  /** Hook duration in frames */
  hookFrames: number
  /** CTA duration in frames */
  ctaFrames?: number
  /** Overlay darkness (0-1) */
  overlay?: number
  /** Fallback gradient */
  gradient?: string
  /** Whether to apply zoom effect */
  zoom?: boolean
}

/**
 * Handles per-scene background switching with crossfade transitions.
 * Falls back to a single backgroundImage or gradient.
 */
export const SceneBackground: React.FC<SceneBackgroundProps> = ({
  backgroundImage,
  sceneImages = [],
  sceneStarts,
  hookFrames,
  ctaFrames = 0,
  overlay = 0.5,
  gradient,
  zoom = true,
}) => {
  const frame = useCurrentFrame()
  const { durationInFrames, fps } = useVideoConfig()

  const hasSceneImages = sceneImages.length > 0 && sceneImages.some(Boolean)

  // Determine current scene index
  let currentSceneIndex = -1
  if (frame < hookFrames) {
    currentSceneIndex = -1 // hook phase
  } else if (ctaFrames > 0 && frame >= durationInFrames - ctaFrames) {
    currentSceneIndex = sceneStarts.length - 1 // CTA phase — keep last scene
  } else {
    for (let i = sceneStarts.length - 1; i >= 0; i--) {
      if (frame >= sceneStarts[i]) {
        currentSceneIndex = i
        break
      }
    }
  }

  // Get the image for the current phase
  const getCurrentImage = (): string | undefined => {
    if (!hasSceneImages) return backgroundImage
    if (currentSceneIndex >= 0 && sceneImages[currentSceneIndex]) {
      return sceneImages[currentSceneIndex]
    }
    // During hook, use first scene image or fallback
    if (frame < hookFrames) {
      return sceneImages[0] || backgroundImage
    }
    return backgroundImage
  }

  const currentImage = getCurrentImage()

  // Ken Burns zoom effect
  const scale = zoom
    ? interpolate(frame, [0, durationInFrames], [1, 1.15], {
        extrapolateRight: 'clamp',
      })
    : 1

  // Render gradient fallback
  if (!currentImage) {
    return (
      <AbsoluteFill
        style={{
          background: gradient || 'linear-gradient(135deg, #0c0015 0%, #1a0533 30%, #0d1b3e 60%, #061220 100%)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `radial-gradient(ellipse at ${30 + Math.sin(frame * 0.02) * 20}% ${40 + Math.cos(frame * 0.015) * 15}%, rgba(168, 85, 247, 0.15) 0%, transparent 60%)`,
          }}
        />
      </AbsoluteFill>
    )
  }

  // Render with per-scene image switching
  if (hasSceneImages) {
    const transitionFrames = Math.floor(fps * 0.3) // 0.3s crossfade

    return (
      <AbsoluteFill>
        {sceneImages.map((imgSrc, i) => {
          if (!imgSrc) return null
          const sceneStart = i === 0 ? 0 : sceneStarts[i] || 0
          const isActive = i === currentSceneIndex || (currentSceneIndex === -1 && i === 0)
          
          // Calculate opacity for crossfade
          let opacity = 0
          if (isActive) {
            opacity = interpolate(
              frame,
              [Math.max(0, sceneStart - transitionFrames), sceneStart],
              [0, 1],
              { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
            )
          } else if (i < currentSceneIndex) {
            // Previous scene fading out
            const nextStart = sceneStarts[i + 1] || sceneStart
            opacity = interpolate(
              frame,
              [nextStart - transitionFrames, nextStart + transitionFrames],
              [1, 0],
              { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
            )
          }

          // First image is always visible initially
          if (i === 0 && frame < (sceneStarts[1] || durationInFrames)) {
            opacity = Math.max(opacity, currentSceneIndex <= 0 ? 1 : 0)
          }

          if (opacity <= 0) return null

          return (
            <AbsoluteFill key={i} style={{ opacity }}>
              <Img
                src={imgSrc}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  transform: `scale(${scale})`,
                }}
              />
            </AbsoluteFill>
          )
        })}
        {/* Darkness overlay */}
        <AbsoluteFill style={{ backgroundColor: `rgba(0, 0, 0, ${overlay})` }} />
      </AbsoluteFill>
    )
  }

  // Single background image
  return (
    <AbsoluteFill>
      <Img
        src={currentImage}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: `scale(${scale})`,
        }}
      />
      <AbsoluteFill style={{ backgroundColor: `rgba(0, 0, 0, ${overlay})` }} />
    </AbsoluteFill>
  )
}
