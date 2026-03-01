import React from 'react'
import {
  AbsoluteFill,
  Audio,
  Sequence,
  staticFile,
  useVideoConfig,
  useCurrentFrame,
  spring,
  interpolate,
} from 'remotion'
import { AnimatedCaption } from './components/AnimatedCaption'
import { HookText } from './components/HookText'
import { Background } from './components/Background'
import { SceneBackground } from './components/SceneBackground'
import { AvatarOverlay } from './components/AvatarOverlay'
import { ProgressBar, CTAOverlay, Watermark } from './components/Overlays'

/**
 * Resolve audio source path for Remotion rendering.
 * During server-side rendering, audio is copied into the bundle directory
 * and passed as a root-relative path (e.g., "/tts-xxx.mp3").
 * For local preview, it may use staticFile().
 */
function resolveAudioSrc(audioSrc: string): string {
  // Root-relative paths from the bundle (e.g., "/tts-xxx.mp3")
  // These are served by Remotion's HTTP server directly
  if (audioSrc.startsWith('/') && !audioSrc.startsWith('/generated/')) {
    return audioSrc
  }
  // Relative paths for staticFile (local dev public/ files)
  try {
    return staticFile(audioSrc.replace('/generated/', 'generated/'))
  } catch {
    return audioSrc
  }
}

export interface UGCVideoProps {
  hook: string
  scriptLines: string[]
  caption: string
  cta: string
  audioSrc?: string
  backgroundImage?: string
  sceneImages?: string[] // per-scene background images (one per scriptLine)
  wordBoundaries?: { text: string; startMs: number; endMs: number }[]
  captionStyle?: 'karaoke' | 'word-by-word' | 'fade'
  hookStyle?: 'pop' | 'typewriter' | 'slide'
  colorAccent?: string
  // Avatar / Talking Head settings
  avatarFaceUrl?: string     // face image for static overlay
  avatarVideoUrl?: string    // talking head video (D-ID/SadTalker)
  avatarIsVideo?: boolean    // whether avatar source is video
  avatarPosition?: 'bottom-left' | 'bottom-right' | 'bottom-center' | 'top-left' | 'top-right'
  avatarShape?: 'circle' | 'rounded' | 'rectangle'
  avatarSize?: 'small' | 'medium' | 'large'
}

/**
 * Calculate scene timing from word boundaries.
 * Splits the word boundaries into per-scene timing so each scriptLine
 * gets the right portion of the audio timeline.
 */
function getSceneTiming(
  scriptLines: string[],
  wordBoundaries: { text: string; startMs: number; endMs: number }[],
  fps: number,
  durationInFrames: number,
  hookDurationSec: number = 3,
  ctaDurationSec: number = 4
) {
  const hookFrames = Math.floor(fps * hookDurationSec)
  const ctaFrames = Math.floor(fps * ctaDurationSec)
  const contentFrames = durationInFrames - hookFrames - ctaFrames
  const framesPerLine = scriptLines.length > 0
    ? Math.floor(contentFrames / scriptLines.length)
    : contentFrames

  return {
    hookFrames,
    ctaFrames,
    contentFrames,
    framesPerLine,
    getSceneStart: (index: number) => hookFrames + index * framesPerLine,
  }
}

// Template 1: Caption Style (TikTok/Reels style with animated captions)
export const CaptionStyleVideo: React.FC<UGCVideoProps> = ({
  hook,
  scriptLines,
  cta,
  audioSrc,
  backgroundImage,
  sceneImages = [],
  wordBoundaries = [],
  captionStyle = 'karaoke',
  hookStyle = 'pop',
  colorAccent = '#A855F7',
  avatarFaceUrl,
  avatarVideoUrl,
  avatarIsVideo = false,
  avatarPosition = 'bottom-right',
  avatarShape = 'circle',
  avatarSize = 'medium',
}) => {
  const { fps, durationInFrames } = useVideoConfig()

  const { hookFrames, ctaFrames, framesPerLine, getSceneStart } =
    getSceneTiming(scriptLines, wordBoundaries, fps, durationInFrames, 3, 4)

  const sceneStarts = scriptLines.map((_, i) => getSceneStart(i))

  return (
    <AbsoluteFill>
      {/* Background — switches per scene if sceneImages provided */}
      <SceneBackground
        backgroundImage={backgroundImage}
        sceneImages={sceneImages}
        sceneStarts={sceneStarts}
        hookFrames={hookFrames}
        ctaFrames={ctaFrames}
        overlay={0.5}
      />

      {/* Progress Bar */}
      <ProgressBar color={colorAccent} />

      {/* Audio */}
      {audioSrc && (
        <Audio src={resolveAudioSrc(audioSrc)} />
      )}

      {/* Hook (first 3 seconds) */}
      <HookText
        text={hook}
        startFrame={0}
        durationFrames={hookFrames}
        style={hookStyle}
        fontSize={52}
        color="#FFFFFF"
      />

      {/* Animated Captions — synced to word boundaries from TTS */}
      {wordBoundaries.length > 0 && (
        <AnimatedCaption
          words={wordBoundaries}
          style={captionStyle}
          fontSize={44}
          highlightColor={colorAccent}
          position="bottom"
        />
      )}

      {/* Fallback: show script lines as static captions if no word boundaries */}
      {wordBoundaries.length === 0 && scriptLines.length > 0 && (
        <>
          {scriptLines.map((line, i) => {
            const lineStart = getSceneStart(i)
            return (
              <Sequence key={i} from={lineStart} durationInFrames={framesPerLine}>
                <HookText
                  text={line}
                  startFrame={0}
                  durationFrames={framesPerLine}
                  style="pop"
                  fontSize={38}
                />
              </Sequence>
            )
          })}
        </>
      )}

      {/* Avatar Overlay */}
      {(avatarFaceUrl || avatarVideoUrl) && (
        <AvatarOverlay
          faceImageUrl={avatarFaceUrl}
          avatarVideoUrl={avatarVideoUrl}
          isVideo={avatarIsVideo}
          position={avatarPosition}
          shape={avatarShape}
          size={avatarSize}
          wordBoundaries={wordBoundaries}
          startFrame={0}
        />
      )}

      {/* CTA at the end */}
      <CTAOverlay
        text={cta}
        startFrame={durationInFrames - ctaFrames}
        durationFrames={ctaFrames}
        style="button"
      />

      {/* Watermark */}
      <Watermark />
    </AbsoluteFill>
  )
}

// Template 2: Text on Screen (Bold text overlays, minimal)
export const TextOnScreenVideo: React.FC<UGCVideoProps> = ({
  hook,
  scriptLines,
  cta,
  audioSrc,
  backgroundImage,
  sceneImages = [],
  wordBoundaries = [],
  colorAccent = '#EC4899',
  avatarFaceUrl,
  avatarVideoUrl,
  avatarIsVideo = false,
  avatarPosition = 'bottom-right',
  avatarShape = 'circle',
  avatarSize = 'medium',
}) => {
  const { fps, durationInFrames } = useVideoConfig()

  const hookFrames = Math.floor(fps * 3)
  const ctaFrames = Math.floor(fps * 3)
  const contentFrames = durationInFrames - hookFrames - ctaFrames
  const framesPerLine = scriptLines.length > 0 ? Math.floor(contentFrames / scriptLines.length) : contentFrames
  const sceneStarts = scriptLines.map((_, i) => hookFrames + i * framesPerLine)

  return (
    <AbsoluteFill>
      <SceneBackground
        backgroundImage={backgroundImage}
        sceneImages={sceneImages}
        sceneStarts={sceneStarts}
        hookFrames={hookFrames}
        ctaFrames={ctaFrames}
        overlay={0.6}
        gradient="linear-gradient(180deg, #0a0a0a 0%, #1a1a2e 50%, #0a0a0a 100%)"
      />

      <ProgressBar color={colorAccent} />

      {audioSrc && (
        <Audio src={resolveAudioSrc(audioSrc)} />
      )}

      {/* Hook */}
      <HookText
        text={hook}
        startFrame={0}
        durationFrames={hookFrames}
        style="typewriter"
        fontSize={56}
        color={colorAccent}
      />

      {/* Script lines one by one */}
      {scriptLines.map((line, i) => (
        <Sequence key={i} from={hookFrames + i * framesPerLine} durationInFrames={framesPerLine}>
          <HookText
            text={line}
            startFrame={0}
            durationFrames={framesPerLine}
            style="slide"
            fontSize={40}
          />
        </Sequence>
      ))}

      {/* Avatar Overlay */}
      {(avatarFaceUrl || avatarVideoUrl) && (
        <AvatarOverlay
          faceImageUrl={avatarFaceUrl}
          avatarVideoUrl={avatarVideoUrl}
          isVideo={avatarIsVideo}
          position={avatarPosition}
          shape={avatarShape}
          size={avatarSize}
          wordBoundaries={wordBoundaries}
          startFrame={0}
        />
      )}

      {/* CTA */}
      <CTAOverlay
        text={cta}
        startFrame={durationInFrames - Math.floor(fps * 3)}
        durationFrames={Math.floor(fps * 3)}
        style="banner"
      />

      <Watermark />
    </AbsoluteFill>
  )
}

// Template 3: Split Screen (Hook top + content bottom)
export const SplitScreenVideo: React.FC<UGCVideoProps> = ({
  hook,
  scriptLines,
  cta,
  audioSrc,
  backgroundImage,
  sceneImages = [],
  wordBoundaries = [],
  colorAccent = '#3B82F6',
  avatarFaceUrl,
  avatarVideoUrl,
  avatarIsVideo = false,
  avatarPosition = 'bottom-right',
  avatarShape = 'circle',
  avatarSize = 'small',
}) => {
  const { fps, durationInFrames, width, height } = useVideoConfig()
  const hookFrames = Math.floor(fps * 2.5)

  return (
    <AbsoluteFill>
      {/* Top half - gradient with hook/brand */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: height * 0.35,
          background: `linear-gradient(135deg, ${colorAccent}20 0%, ${colorAccent}40 100%)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderBottom: `2px solid ${colorAccent}60`,
          padding: '0 30px',
        }}
      >
        <HookText
          text={hook}
          startFrame={0}
          durationFrames={hookFrames}
          style="pop"
          fontSize={36}
        />
      </div>

      {/* Bottom half - content area */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: height * 0.65,
        }}
      >
        <Background
          type={backgroundImage ? 'image' : 'gradient'}
          src={backgroundImage}
          overlay={0.6}
        />

        {wordBoundaries.length > 0 ? (
          <AnimatedCaption
            words={wordBoundaries}
            style="karaoke"
            fontSize={40}
            highlightColor={colorAccent}
            position="center"
          />
        ) : (
          scriptLines.map((line, i) => {
            const startFrame = hookFrames + i * Math.floor((durationInFrames - hookFrames) / scriptLines.length)
            const dur = Math.floor((durationInFrames - hookFrames) / scriptLines.length)
            return (
              <Sequence key={i} from={startFrame} durationInFrames={dur}>
                <HookText text={line} startFrame={0} durationFrames={dur} style="pop" fontSize={34} />
              </Sequence>
            )
          })
        )}
      </div>

      {audioSrc && (
        <Audio src={resolveAudioSrc(audioSrc)} />
      )}

      <ProgressBar color={colorAccent} />

      <CTAOverlay
        text={cta}
        startFrame={durationInFrames - Math.floor(fps * 3)}
        durationFrames={Math.floor(fps * 3)}
        style="minimal"
      />
    </AbsoluteFill>
  )
}

// Template 4: Countdown (numbered steps with animated counter)
export const CountdownVideo: React.FC<UGCVideoProps> = ({
  hook,
  scriptLines,
  cta,
  audioSrc,
  backgroundImage,
  sceneImages = [],
  colorAccent = '#F59E0B',
  avatarFaceUrl,
  avatarVideoUrl,
  avatarIsVideo = false,
  avatarPosition = 'bottom-right',
  avatarShape = 'circle',
  avatarSize = 'small',
}) => {
  const frame = useCurrentFrame()
  const { fps, durationInFrames } = useVideoConfig()

  const hookFrames = Math.floor(fps * 3)
  const ctaFrames = Math.floor(fps * 3.5)
  const contentFrames = durationInFrames - hookFrames - ctaFrames
  const framesPerItem = scriptLines.length > 0 ? Math.floor(contentFrames / scriptLines.length) : contentFrames

  // Determine which countdown number is currently showing
  const contentRelFrame = frame - hookFrames
  const currentIndex = Math.min(
    Math.floor(contentRelFrame / framesPerItem),
    scriptLines.length - 1
  )
  const countdownNumber = scriptLines.length - currentIndex

  return (
    <AbsoluteFill>
      <Background
        type={backgroundImage ? 'image' : 'gradient'}
        src={backgroundImage}
        gradient={`linear-gradient(180deg, #0f0f0f 0%, ${colorAccent}15 50%, #0f0f0f 100%)`}
        overlay={0.5}
      />

      <ProgressBar color={colorAccent} />

      {audioSrc && (
        <Audio src={resolveAudioSrc(audioSrc)} />
      )}

      {/* Hook */}
      <HookText
        text={hook}
        startFrame={0}
        durationFrames={hookFrames}
        style="pop"
        fontSize={52}
        color={colorAccent}
      />

      {/* Countdown number badge (persistent during content) */}
      {frame >= hookFrames && frame < durationInFrames - ctaFrames && (
        <div
          style={{
            position: 'absolute',
            top: 80,
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'center',
            zIndex: 10,
          }}
        >
          <div
            style={{
              width: 100,
              height: 100,
              borderRadius: '50%',
              background: `linear-gradient(135deg, ${colorAccent}, ${colorAccent}CC)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 8px 32px ${colorAccent}60`,
            }}
          >
            <span
              style={{
                fontSize: 56,
                fontWeight: 900,
                fontFamily: 'Inter, system-ui, sans-serif',
                color: '#000',
              }}
            >
              {countdownNumber}
            </span>
          </div>
        </div>
      )}

      {/* Script lines with countdown */}
      {scriptLines.map((line, i) => (
        <Sequence key={i} from={hookFrames + i * framesPerItem} durationInFrames={framesPerItem}>
          <div
            style={{
              position: 'absolute',
              top: '35%',
              left: 0,
              right: 0,
              display: 'flex',
              justifyContent: 'center',
              padding: '0 50px',
            }}
          >
            <div
              style={{
                background: 'rgba(0,0,0,0.7)',
                borderLeft: `4px solid ${colorAccent}`,
                borderRadius: 12,
                padding: '24px 32px',
                maxWidth: 900,
              }}
            >
              <HookText
                text={line}
                startFrame={0}
                durationFrames={framesPerItem}
                style="slide"
                fontSize={36}
              />
            </div>
          </div>
        </Sequence>
      ))}

      <CTAOverlay
        text={cta}
        startFrame={durationInFrames - ctaFrames}
        durationFrames={ctaFrames}
        style="button"
      />

      <Watermark />
    </AbsoluteFill>
  )
}

// Template 5: Testimonial (Quote-style layout with avatar)
export const TestimonialVideo: React.FC<UGCVideoProps> = ({
  hook,
  scriptLines,
  cta,
  audioSrc,
  backgroundImage,
  sceneImages = [],
  wordBoundaries = [],
  colorAccent = '#10B981',
  avatarFaceUrl,
  avatarVideoUrl,
  avatarIsVideo = false,
  avatarPosition = 'bottom-right',
  avatarShape = 'circle',
  avatarSize = 'medium',
}) => {
  const frame = useCurrentFrame()
  const { fps, durationInFrames, height } = useVideoConfig()

  const hookFrames = Math.floor(fps * 3)
  const ctaFrames = Math.floor(fps * 3)

  // Entry animation for the quote card
  const cardEntry = spring({
    frame: Math.max(0, frame - hookFrames),
    fps,
    config: { damping: 15, stiffness: 80 },
  })

  return (
    <AbsoluteFill>
      <Background
        type={backgroundImage ? 'image' : 'gradient'}
        src={backgroundImage}
        gradient={`linear-gradient(180deg, #0a0a0a 0%, ${colorAccent}10 40%, #0a0a0a 100%)`}
        overlay={0.6}
      />

      <ProgressBar color={colorAccent} />

      {audioSrc && (
        <Audio src={resolveAudioSrc(audioSrc)} />
      )}

      {/* Hook as intro */}
      <HookText
        text={hook}
        startFrame={0}
        durationFrames={hookFrames}
        style="pop"
        fontSize={48}
        color="#FFFFFF"
      />

      {/* Testimonial card */}
      {frame >= hookFrames && (
        <div
          style={{
            position: 'absolute',
            top: '15%',
            left: 40,
            right: 40,
            bottom: height * 0.2,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: cardEntry,
            transform: `translateY(${(1 - cardEntry) * 40}px)`,
          }}
        >
          {/* Avatar circle */}
          <div
            style={{
              width: 90,
              height: 90,
              borderRadius: '50%',
              background: `linear-gradient(135deg, ${colorAccent}, ${colorAccent}80)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 24,
              boxShadow: `0 4px 24px ${colorAccent}40`,
            }}
          >
            <span
              style={{
                fontSize: 40,
                fontWeight: 900,
                fontFamily: 'Inter, system-ui, sans-serif',
                color: '#FFF',
              }}
            >
              ★
            </span>
          </div>

          {/* Big quote mark */}
          <div
            style={{
              fontSize: 80,
              fontFamily: 'Georgia, serif',
              color: `${colorAccent}60`,
              lineHeight: 0.8,
              marginBottom: 8,
            }}
          >
            &ldquo;
          </div>

          {/* Quote card background */}
          <div
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: `1px solid ${colorAccent}30`,
              borderRadius: 20,
              padding: '32px 40px',
              maxWidth: 900,
              position: 'relative',
            }}
          >
            {/* Script lines as quote text */}
            {wordBoundaries.length > 0 ? (
              <AnimatedCaption
                words={wordBoundaries}
                style="fade"
                fontSize={36}
                highlightColor={colorAccent}
                position="center"
              />
            ) : (
              scriptLines.map((line, i) => {
                const contentFrames = durationInFrames - hookFrames - ctaFrames
                const startF = hookFrames + i * Math.floor(contentFrames / scriptLines.length)
                const dur = Math.floor(contentFrames / scriptLines.length)
                return (
                  <Sequence key={i} from={startF} durationInFrames={dur}>
                    <div
                      style={{
                        fontSize: 34,
                        fontWeight: 500,
                        fontFamily: 'Georgia, serif',
                        color: '#F0F0F0',
                        textAlign: 'center',
                        fontStyle: 'italic',
                        lineHeight: 1.6,
                      }}
                    >
                      {line}
                    </div>
                  </Sequence>
                )
              })
            )}
          </div>

          {/* Closing quote */}
          <div
            style={{
              fontSize: 80,
              fontFamily: 'Georgia, serif',
              color: `${colorAccent}60`,
              lineHeight: 0.5,
              marginTop: 8,
              alignSelf: 'flex-end',
              marginRight: 20,
            }}
          >
            &rdquo;
          </div>

          {/* Rating stars */}
          <div
            style={{
              display: 'flex',
              gap: 8,
              marginTop: 20,
            }}
          >
            {[1, 2, 3, 4, 5].map(star => (
              <span
                key={star}
                style={{
                  fontSize: 28,
                  color: colorAccent,
                  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
                }}
              >
                ★
              </span>
            ))}
          </div>
        </div>
      )}

      <CTAOverlay
        text={cta}
        startFrame={durationInFrames - ctaFrames}
        durationFrames={ctaFrames}
        style="banner"
      />

      <Watermark />
    </AbsoluteFill>
  )
}

// Template 6: Before/After (Split reveal transition)
export const BeforeAfterVideo: React.FC<UGCVideoProps> = ({
  hook,
  scriptLines,
  cta,
  audioSrc,
  backgroundImage,
  sceneImages = [],
  colorAccent = '#EF4444',
  avatarFaceUrl,
  avatarVideoUrl,
  avatarIsVideo = false,
  avatarPosition = 'bottom-right',
  avatarShape = 'circle',
  avatarSize = 'small',
}) => {
  const frame = useCurrentFrame()
  const { fps, durationInFrames, width, height } = useVideoConfig()

  const hookFrames = Math.floor(fps * 3)
  const ctaFrames = Math.floor(fps * 3)
  const revealFrames = durationInFrames - hookFrames - ctaFrames

  // The "before" takes the first half, "after" the second half
  const midpoint = hookFrames + Math.floor(revealFrames / 2)
  const isAfterPhase = frame >= midpoint

  // Reveal animation — the divider slides across
  const revealProgress = interpolate(
    frame,
    [midpoint - Math.floor(fps * 0.8), midpoint + Math.floor(fps * 0.3)],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  )

  // Flash effect on transition
  const flashOpacity = frame >= midpoint - 5 && frame <= midpoint + 5
    ? interpolate(frame, [midpoint - 5, midpoint, midpoint + 5], [0, 0.6, 0])
    : 0

  // Split lines: first half = "before", second half = "after"
  const halfIdx = Math.ceil(scriptLines.length / 2)
  const beforeLines = scriptLines.slice(0, halfIdx)
  const afterLines = scriptLines.slice(halfIdx)

  return (
    <AbsoluteFill>
      <Background
        type={backgroundImage ? 'image' : 'gradient'}
        src={backgroundImage}
        gradient="linear-gradient(180deg, #1a0000 0%, #0a0a0a 50%, #001a00 100%)"
        overlay={0.5}
      />

      <ProgressBar color={colorAccent} />

      {audioSrc && (
        <Audio src={resolveAudioSrc(audioSrc)} />
      )}

      {/* Hook */}
      <HookText
        text={hook}
        startFrame={0}
        durationFrames={hookFrames}
        style="pop"
        fontSize={48}
        color="#FFFFFF"
      />

      {/* BEFORE label */}
      {frame >= hookFrames && !isAfterPhase && (
        <div
          style={{
            position: 'absolute',
            top: 60,
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'center',
            zIndex: 10,
          }}
        >
          <div
            style={{
              background: '#EF4444',
              color: '#FFF',
              fontSize: 24,
              fontWeight: 900,
              fontFamily: 'Inter, system-ui, sans-serif',
              padding: '10px 32px',
              borderRadius: 30,
              letterSpacing: 3,
              textTransform: 'uppercase',
            }}
          >
            BEFORE
          </div>
        </div>
      )}

      {/* AFTER label */}
      {isAfterPhase && frame < durationInFrames - ctaFrames && (
        <div
          style={{
            position: 'absolute',
            top: 60,
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'center',
            zIndex: 10,
          }}
        >
          <div
            style={{
              background: '#10B981',
              color: '#FFF',
              fontSize: 24,
              fontWeight: 900,
              fontFamily: 'Inter, system-ui, sans-serif',
              padding: '10px 32px',
              borderRadius: 30,
              letterSpacing: 3,
              textTransform: 'uppercase',
            }}
          >
            AFTER
          </div>
        </div>
      )}

      {/* Before content */}
      {beforeLines.map((line, i) => {
        const beforeContentFrames = midpoint - hookFrames
        const startF = hookFrames + i * Math.floor(beforeContentFrames / beforeLines.length)
        const dur = Math.floor(beforeContentFrames / beforeLines.length)
        return (
          <Sequence key={`before-${i}`} from={startF} durationInFrames={dur}>
            <HookText text={line} startFrame={0} durationFrames={dur} style="slide" fontSize={38} color="#F87171" />
          </Sequence>
        )
      })}

      {/* Flash effect */}
      {flashOpacity > 0 && (
        <AbsoluteFill
          style={{
            backgroundColor: `rgba(255, 255, 255, ${flashOpacity})`,
            zIndex: 15,
          }}
        />
      )}

      {/* After content */}
      {afterLines.map((line, i) => {
        const afterContentFrames = durationInFrames - ctaFrames - midpoint
        const startF = midpoint + i * Math.floor(afterContentFrames / Math.max(afterLines.length, 1))
        const dur = Math.floor(afterContentFrames / Math.max(afterLines.length, 1))
        return (
          <Sequence key={`after-${i}`} from={startF} durationInFrames={dur}>
            <HookText text={line} startFrame={0} durationFrames={dur} style="pop" fontSize={38} color="#34D399" />
          </Sequence>
        )
      })}

      <CTAOverlay
        text={cta}
        startFrame={durationInFrames - ctaFrames}
        durationFrames={ctaFrames}
        style="button"
      />

      <Watermark />
    </AbsoluteFill>
  )
}

// Template 7: Product Showcase (Feature callout cards)
export const ProductShowcaseVideo: React.FC<UGCVideoProps> = ({
  hook,
  scriptLines,
  cta,
  audioSrc,
  backgroundImage,
  sceneImages = [],
  colorAccent = '#8B5CF6',
  avatarFaceUrl,
  avatarVideoUrl,
  avatarIsVideo = false,
  avatarPosition = 'bottom-right',
  avatarShape = 'circle',
  avatarSize = 'small',
}) => {
  const frame = useCurrentFrame()
  const { fps, durationInFrames, height } = useVideoConfig()

  const hookFrames = Math.floor(fps * 3)
  const ctaFrames = Math.floor(fps * 3.5)
  const contentFrames = durationInFrames - hookFrames - ctaFrames
  const framesPerCard = scriptLines.length > 0 ? Math.floor(contentFrames / scriptLines.length) : contentFrames

  const featureIcons = ['✦', '◆', '▸', '●', '★', '⚡']

  return (
    <AbsoluteFill>
      <Background
        type={backgroundImage ? 'image' : 'gradient'}
        src={backgroundImage}
        gradient={`radial-gradient(ellipse at center, ${colorAccent}15 0%, #0a0a0a 70%)`}
        overlay={0.5}
      />

      <ProgressBar color={colorAccent} />

      {audioSrc && (
        <Audio src={resolveAudioSrc(audioSrc)} />
      )}

      {/* Hook with product name feel */}
      <HookText
        text={hook}
        startFrame={0}
        durationFrames={hookFrames}
        style="typewriter"
        fontSize={50}
        color={colorAccent}
      />

      {/* Feature cards */}
      {scriptLines.map((line, i) => {
        const startF = hookFrames + i * framesPerCard
        return (
          <Sequence key={i} from={startF} durationInFrames={framesPerCard}>
            <FeatureCard
              text={line}
              icon={featureIcons[i % featureIcons.length]}
              index={i}
              total={scriptLines.length}
              colorAccent={colorAccent}
              framesPerCard={framesPerCard}
              height={height}
            />
          </Sequence>
        )
      })}

      {/* Progress dots */}
      {frame >= hookFrames && frame < durationInFrames - ctaFrames && (
        <div
          style={{
            position: 'absolute',
            bottom: 140,
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'center',
            gap: 12,
            zIndex: 10,
          }}
        >
          {scriptLines.map((_, i) => {
            const isActive = frame >= hookFrames + i * framesPerCard && frame < hookFrames + (i + 1) * framesPerCard
            return (
              <div
                key={i}
                style={{
                  width: isActive ? 32 : 10,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: isActive ? colorAccent : `${colorAccent}40`,
                  transition: 'all 0.3s',
                }}
              />
            )
          })}
        </div>
      )}

      <CTAOverlay
        text={cta}
        startFrame={durationInFrames - ctaFrames}
        durationFrames={ctaFrames}
        style="banner"
      />

      <Watermark />
    </AbsoluteFill>
  )
}

// Feature card sub-component for ProductShowcase
const FeatureCard: React.FC<{
  text: string
  icon: string
  index: number
  total: number
  colorAccent: string
  framesPerCard: number
  height: number
}> = ({ text, icon, index, total, colorAccent, framesPerCard, height }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const entry = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 100 },
  })

  const exitOpacity = interpolate(
    frame,
    [framesPerCard - 10, framesPerCard],
    [1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  )

  // Alternate card position (left/right) for visual variety
  const isLeft = index % 2 === 0

  return (
    <div
      style={{
        position: 'absolute',
        top: '30%',
        left: isLeft ? 40 : 'auto',
        right: isLeft ? 'auto' : 40,
        maxWidth: '85%',
        opacity: entry * exitOpacity,
        transform: `translateX(${(1 - entry) * (isLeft ? -60 : 60)}px) scale(${0.9 + entry * 0.1})`,
        zIndex: 5,
      }}
    >
      <div
        style={{
          background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(10px)',
          border: `1px solid ${colorAccent}40`,
          borderRadius: 20,
          padding: '32px 36px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 20,
        }}
      >
        {/* Icon badge */}
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 14,
            background: `linear-gradient(135deg, ${colorAccent}30, ${colorAccent}15)`,
            border: `1px solid ${colorAccent}50`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 28, color: colorAccent }}>{icon}</span>
        </div>

        {/* Text */}
        <div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              fontFamily: 'Inter, system-ui, sans-serif',
              color: colorAccent,
              letterSpacing: 2,
              textTransform: 'uppercase',
              marginBottom: 8,
            }}
          >
            Feature {index + 1} of {total}
          </div>
          <div
            style={{
              fontSize: 32,
              fontWeight: 700,
              fontFamily: 'Inter, system-ui, sans-serif',
              color: '#F0F0F0',
              lineHeight: 1.4,
            }}
          >
            {text}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Template 8: Cinematic (Film-style with letterbox bars & dramatic text)
// ─────────────────────────────────────────────────────────────────────
export const CinematicVideo: React.FC<UGCVideoProps> = ({
  hook,
  scriptLines,
  cta,
  audioSrc,
  backgroundImage,
  sceneImages = [],
  wordBoundaries = [],
  captionStyle = 'fade',
  colorAccent = '#D4AF37',
  avatarFaceUrl,
  avatarVideoUrl,
  avatarIsVideo = false,
  avatarPosition = 'bottom-right',
  avatarShape = 'circle',
  avatarSize = 'medium',
}) => {
  const frame = useCurrentFrame()
  const { fps, durationInFrames, height } = useVideoConfig()
  const hookFrames = Math.floor(fps * 4) // longer hook for drama
  const ctaFrames = Math.floor(fps * 4)
  const contentFrames = durationInFrames - hookFrames - ctaFrames
  const framesPerLine = scriptLines.length > 0 ? Math.floor(contentFrames / scriptLines.length) : contentFrames

  // Letterbox bar height animation
  const barHeight = height * 0.08
  const barEntry = spring({ frame, fps, config: { damping: 30, stiffness: 60 } })

  return (
    <AbsoluteFill>
      <Background
        type={backgroundImage ? 'image' : 'gradient'}
        src={backgroundImage}
        gradient="linear-gradient(180deg, #0a0a0a 0%, #1a1510 30%, #0d0d0d 70%, #000000 100%)"
        overlay={0.55}
        zoom={true}
      />

      {audioSrc && (
        <Audio src={resolveAudioSrc(audioSrc)} />
      )}

      {/* Cinematic letterbox bars */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        height: barHeight * barEntry,
        background: '#000', zIndex: 15,
      }} />
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: barHeight * barEntry,
        background: '#000', zIndex: 15,
      }} />

      {/* Film grain overlay */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 14,
        opacity: 0.04,
        backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence baseFrequency=\'0.65\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")',
      }} />

      {/* Subtle vignette */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 13,
        background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.6) 100%)',
      }} />

      <ProgressBar color={colorAccent} />

      {/* Hook — centered, dramatic, with gold underline */}
      <Sequence from={0} durationInFrames={hookFrames}>
        <AbsoluteFill style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '0 60px', zIndex: 16,
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: 54, fontWeight: 800, color: '#FFFFFF',
              fontFamily: 'Georgia, "Times New Roman", serif',
              letterSpacing: -0.5, lineHeight: 1.3,
              textShadow: '0 4px 30px rgba(0,0,0,0.8)',
              opacity: spring({ frame, fps, config: { damping: 20, stiffness: 80 } }),
              transform: `translateY(${(1 - spring({ frame, fps, config: { damping: 20, stiffness: 80 } })) * 30}px)`,
            }}>
              {hook}
            </div>
            <div style={{
              width: 80, height: 2, background: colorAccent,
              margin: '16px auto 0',
              opacity: spring({ frame: frame - 10, fps, config: { damping: 20 } }),
              transform: `scaleX(${spring({ frame: frame - 10, fps, config: { damping: 20 } })})`,
            }} />
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* Script lines — cinematic subtitle style */}
      {wordBoundaries.length > 0 ? (
        <AnimatedCaption
          words={wordBoundaries}
          style={captionStyle}
          fontSize={40}
          highlightColor={colorAccent}
          position="bottom"
        />
      ) : (
        scriptLines.map((line, i) => (
          <Sequence key={i} from={hookFrames + i * framesPerLine} durationInFrames={framesPerLine}>
            <AbsoluteFill style={{
              display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
              paddingBottom: barHeight + 40, padding: '0 80px', zIndex: 16,
            }}>
              <div style={{
                textAlign: 'center',
                fontSize: 36, fontWeight: 500, color: '#E8E8E8',
                fontFamily: 'Georgia, "Times New Roman", serif',
                lineHeight: 1.5,
                textShadow: '0 2px 20px rgba(0,0,0,0.9)',
                opacity: spring({ frame: frame - (hookFrames + i * framesPerLine), fps, config: { damping: 18 } }),
              }}>
                {line}
              </div>
            </AbsoluteFill>
          </Sequence>
        ))
      )}

      <CTAOverlay
        text={cta}
        startFrame={durationInFrames - ctaFrames}
        durationFrames={ctaFrames}
        style="minimal"
      />
      <Watermark />
    </AbsoluteFill>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Template 9: Neon/Cyberpunk (Glowing borders, dark bg, neon accents)
// ─────────────────────────────────────────────────────────────────────
export const NeonVideo: React.FC<UGCVideoProps> = ({
  hook,
  scriptLines,
  cta,
  audioSrc,
  backgroundImage,
  sceneImages = [],
  colorAccent = '#00F0FF',
  avatarFaceUrl,
  avatarVideoUrl,
  avatarIsVideo = false,
  avatarPosition = 'bottom-right',
  avatarShape = 'circle',
  avatarSize = 'small',
}) => {
  const frame = useCurrentFrame()
  const { fps, durationInFrames } = useVideoConfig()
  const hookFrames = Math.floor(fps * 3)
  const ctaFrames = Math.floor(fps * 3.5)
  const contentFrames = durationInFrames - hookFrames - ctaFrames
  const framesPerLine = scriptLines.length > 0 ? Math.floor(contentFrames / scriptLines.length) : contentFrames

  // Neon pulse effect
  const pulse = Math.sin((frame / fps) * Math.PI * 2 * 0.8) * 0.3 + 0.7

  // Secondary neon color
  const neonSecondary = '#FF00FF'

  return (
    <AbsoluteFill>
      <Background
        type={backgroundImage ? 'image' : 'gradient'}
        src={backgroundImage}
        gradient="linear-gradient(180deg, #05000a 0%, #0a0015 40%, #0f0020 60%, #05000a 100%)"
        overlay={0.6}
      />

      {audioSrc && (
        <Audio src={resolveAudioSrc(audioSrc)} />
      )}

      {/* Neon grid floor effect */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: '40%',
        background: `linear-gradient(180deg, transparent 0%, ${colorAccent}08 100%)`,
        zIndex: 2,
      }} />

      {/* Glowing border frame */}
      <div style={{
        position: 'absolute', inset: 20, zIndex: 12,
        border: `2px solid ${colorAccent}40`,
        borderRadius: 24,
        boxShadow: `inset 0 0 30px ${colorAccent}10, 0 0 30px ${colorAccent}10`,
        opacity: pulse,
      }} />

      {/* Corner glows */}
      {[
        { top: 20, left: 20, borderTop: `3px solid ${colorAccent}`, borderLeft: `3px solid ${colorAccent}` },
        { top: 20, right: 20, borderTop: `3px solid ${neonSecondary}`, borderRight: `3px solid ${neonSecondary}` },
        { bottom: 20, left: 20, borderBottom: `3px solid ${neonSecondary}`, borderLeft: `3px solid ${neonSecondary}` },
        { bottom: 20, right: 20, borderBottom: `3px solid ${colorAccent}`, borderRight: `3px solid ${colorAccent}` },
      ].map((style, i) => (
        <div key={i} style={{
          position: 'absolute', ...style, width: 40, height: 40,
          borderRadius: i === 0 ? '8px 0 0 0' : i === 1 ? '0 8px 0 0' : i === 2 ? '0 0 0 8px' : '0 0 8px 0',
          zIndex: 13,
          boxShadow: `0 0 15px ${i % 2 === 0 ? colorAccent : neonSecondary}60`,
        }} />
      ))}

      <ProgressBar color={colorAccent} />

      {/* Hook — neon glow text */}
      <Sequence from={0} durationInFrames={hookFrames}>
        <AbsoluteFill style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '0 50px', zIndex: 16,
        }}>
          <div style={{
            fontSize: 52, fontWeight: 900,
            fontFamily: 'Inter, system-ui, sans-serif',
            color: '#fff',
            textShadow: `0 0 10px ${colorAccent}, 0 0 40px ${colorAccent}80, 0 0 80px ${colorAccent}40`,
            textAlign: 'center', lineHeight: 1.3,
            letterSpacing: 2, textTransform: 'uppercase',
            opacity: spring({ frame, fps, config: { damping: 15 } }),
            transform: `scale(${0.8 + spring({ frame, fps, config: { damping: 15 } }) * 0.2})`,
          }}>
            {hook}
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* Script lines — neon card style */}
      {scriptLines.map((line, i) => {
        const startF = hookFrames + i * framesPerLine
        const localFrame = frame - startF
        const entry = spring({ frame: localFrame, fps, config: { damping: 12, stiffness: 100 } })
        const fadeOut = interpolate(localFrame, [framesPerLine - 8, framesPerLine], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

        return (
          <Sequence key={i} from={startF} durationInFrames={framesPerLine}>
            <AbsoluteFill style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '0 40px', zIndex: 16,
            }}>
              <div style={{
                background: 'rgba(5,0,20,0.85)',
                border: `1px solid ${colorAccent}50`,
                borderRadius: 16,
                padding: '28px 36px',
                maxWidth: '90%',
                boxShadow: `0 0 20px ${colorAccent}20, inset 0 0 20px ${colorAccent}08`,
                opacity: entry * fadeOut,
                transform: `translateY(${(1 - entry) * 40}px)`,
              }}>
                <div style={{
                  fontSize: 10, fontWeight: 700, letterSpacing: 3,
                  textTransform: 'uppercase', color: colorAccent,
                  fontFamily: 'Inter, system-ui, sans-serif',
                  marginBottom: 10,
                }}>
                  {'///'} Point {i + 1}
                </div>
                <div style={{
                  fontSize: 34, fontWeight: 600, color: '#F0F0F0',
                  fontFamily: 'Inter, system-ui, sans-serif',
                  lineHeight: 1.4,
                }}>
                  {line}
                </div>
              </div>
            </AbsoluteFill>
          </Sequence>
        )
      })}

      <CTAOverlay
        text={cta}
        startFrame={durationInFrames - ctaFrames}
        durationFrames={ctaFrames}
        style="button"
      />
      <Watermark />
    </AbsoluteFill>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Template 10: Minimalist (Ultra clean, lots of whitespace, zen)
// ─────────────────────────────────────────────────────────────────────
export const MinimalistVideo: React.FC<UGCVideoProps> = ({
  hook,
  scriptLines,
  cta,
  audioSrc,
  backgroundImage,
  sceneImages = [],
  colorAccent = '#111111',
  avatarFaceUrl,
  avatarVideoUrl,
  avatarIsVideo = false,
  avatarPosition = 'bottom-right',
  avatarShape = 'circle',
  avatarSize = 'small',
}) => {
  const frame = useCurrentFrame()
  const { fps, durationInFrames } = useVideoConfig()
  const hookFrames = Math.floor(fps * 3.5)
  const ctaFrames = Math.floor(fps * 3)
  const contentFrames = durationInFrames - hookFrames - ctaFrames
  const framesPerLine = scriptLines.length > 0 ? Math.floor(contentFrames / scriptLines.length) : contentFrames

  return (
    <AbsoluteFill style={{ backgroundColor: '#FAFAFA' }}>
      {backgroundImage ? (
        <Background type="image" src={backgroundImage} overlay={0.15} zoom={false} />
      ) : null}

      {audioSrc && (
        <Audio src={resolveAudioSrc(audioSrc)} />
      )}

      {/* Thin accent line at top */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 3,
        background: colorAccent, zIndex: 10,
      }} />

      {/* Progress bar — subtle */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, height: 2,
        width: `${(frame / durationInFrames) * 100}%`,
        background: colorAccent, zIndex: 10, opacity: 0.3,
      }} />

      {/* Hook — elegant, centered, large serif text */}
      <Sequence from={0} durationInFrames={hookFrames}>
        <AbsoluteFill style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '0 80px', zIndex: 5,
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: 50, fontWeight: 300, color: colorAccent,
              fontFamily: 'Georgia, "Times New Roman", serif',
              lineHeight: 1.4, letterSpacing: -1,
              opacity: spring({ frame, fps, config: { damping: 40, stiffness: 60 } }),
              transform: `translateY(${(1 - spring({ frame, fps, config: { damping: 40, stiffness: 60 } })) * 20}px)`,
            }}>
              {hook}
            </div>
            <div style={{
              width: 40, height: 1, background: colorAccent,
              margin: '24px auto 0', opacity: 0.3,
              transform: `scaleX(${spring({ frame: frame - 15, fps, config: { damping: 20 } })})`,
            }} />
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* Script lines — clean, one at a time */}
      {scriptLines.map((line, i) => {
        const startF = hookFrames + i * framesPerLine
        const localFrame = frame - startF
        const entry = spring({ frame: localFrame, fps, config: { damping: 30, stiffness: 50 } })
        const fadeOut = interpolate(localFrame, [framesPerLine - 12, framesPerLine], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

        return (
          <Sequence key={i} from={startF} durationInFrames={framesPerLine}>
            <AbsoluteFill style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '0 80px', zIndex: 5,
            }}>
              <div style={{ textAlign: 'center' }}>
                {/* Step indicator */}
                <div style={{
                  fontSize: 11, fontWeight: 500, letterSpacing: 4,
                  textTransform: 'uppercase', color: '#999',
                  fontFamily: 'Inter, system-ui, sans-serif',
                  marginBottom: 16,
                  opacity: entry * fadeOut,
                }}>
                  {String(i + 1).padStart(2, '0')}
                </div>
                <div style={{
                  fontSize: 38, fontWeight: 400, color: '#222',
                  fontFamily: 'Georgia, "Times New Roman", serif',
                  lineHeight: 1.5,
                  opacity: entry * fadeOut,
                  transform: `translateY(${(1 - entry) * 15}px)`,
                }}>
                  {line}
                </div>
              </div>
            </AbsoluteFill>
          </Sequence>
        )
      })}

      <CTAOverlay
        text={cta}
        startFrame={durationInFrames - ctaFrames}
        durationFrames={ctaFrames}
        style="minimal"
      />
      <Watermark />
    </AbsoluteFill>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Template 11: Magazine/Editorial (Editorial spreads, typography focused)
// ─────────────────────────────────────────────────────────────────────
export const MagazineVideo: React.FC<UGCVideoProps> = ({
  hook,
  scriptLines,
  cta,
  audioSrc,
  backgroundImage,
  sceneImages = [],
  colorAccent = '#C8102E',
  avatarFaceUrl,
  avatarVideoUrl,
  avatarIsVideo = false,
  avatarPosition = 'bottom-right',
  avatarShape = 'circle',
  avatarSize = 'small',
}) => {
  const frame = useCurrentFrame()
  const { fps, durationInFrames, width } = useVideoConfig()
  const hookFrames = Math.floor(fps * 3.5)
  const ctaFrames = Math.floor(fps * 3)
  const contentFrames = durationInFrames - hookFrames - ctaFrames
  const framesPerLine = scriptLines.length > 0 ? Math.floor(contentFrames / scriptLines.length) : contentFrames

  return (
    <AbsoluteFill>
      <Background
        type={backgroundImage ? 'image' : 'gradient'}
        src={backgroundImage}
        gradient="linear-gradient(180deg, #f5f0eb 0%, #e8e0d8 50%, #f5f0eb 100%)"
        overlay={backgroundImage ? 0.3 : 0}
        zoom={false}
      />

      {audioSrc && (
        <Audio src={resolveAudioSrc(audioSrc)} />
      )}

      {/* Editorial accent bar on left */}
      <div style={{
        position: 'absolute', top: 100, left: 40, width: 4, height: 120,
        background: colorAccent, zIndex: 10,
        opacity: spring({ frame, fps, config: { damping: 20 } }),
        transform: `scaleY(${spring({ frame, fps, config: { damping: 20 } })})`,
        transformOrigin: 'top',
      }} />

      {/* Page number decoration */}
      <div style={{
        position: 'absolute', top: 60, right: 50, zIndex: 10,
        fontSize: 14, fontWeight: 300, letterSpacing: 3,
        fontFamily: 'Georgia, "Times New Roman", serif',
        color: backgroundImage ? '#fff' : '#888',
      }}>
        EDITORIAL
      </div>

      <ProgressBar color={colorAccent} />

      {/* Hook — magazine headline style */}
      <Sequence from={0} durationInFrames={hookFrames}>
        <AbsoluteFill style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '0 60px', zIndex: 16,
        }}>
          <div style={{ textAlign: 'left', maxWidth: width * 0.85 }}>
            <div style={{
              fontSize: 12, fontWeight: 600, letterSpacing: 6,
              textTransform: 'uppercase',
              color: colorAccent,
              fontFamily: 'Inter, system-ui, sans-serif',
              marginBottom: 16,
              opacity: spring({ frame, fps, config: { damping: 20 } }),
            }}>
              FEATURED
            </div>
            <div style={{
              fontSize: 56, fontWeight: 800,
              fontFamily: 'Georgia, "Times New Roman", serif',
              color: backgroundImage ? '#fff' : '#1a1a1a',
              lineHeight: 1.15, letterSpacing: -1,
              textShadow: backgroundImage ? '0 2px 20px rgba(0,0,0,0.5)' : 'none',
              opacity: spring({ frame: frame - 5, fps, config: { damping: 15 } }),
              transform: `translateY(${(1 - spring({ frame: frame - 5, fps, config: { damping: 15 } })) * 25}px)`,
            }}>
              {hook}
            </div>
            <div style={{
              width: 60, height: 3, background: colorAccent,
              marginTop: 20,
              transform: `scaleX(${spring({ frame: frame - 15, fps, config: { damping: 20 } })})`,
              transformOrigin: 'left',
            }} />
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* Script lines — editorial quote cards */}
      {scriptLines.map((line, i) => {
        const startF = hookFrames + i * framesPerLine
        const localFrame = frame - startF
        const entry = spring({ frame: localFrame, fps, config: { damping: 14, stiffness: 90 } })
        const fadeOut = interpolate(localFrame, [framesPerLine - 10, framesPerLine], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
        const isEven = i % 2 === 0

        return (
          <Sequence key={i} from={startF} durationInFrames={framesPerLine}>
            <AbsoluteFill style={{
              display: 'flex', alignItems: isEven ? 'flex-start' : 'flex-end', justifyContent: 'center',
              padding: `0 ${isEven ? '50px' : '50px'} 0 ${isEven ? '50px' : '50px'}`,
              paddingTop: '30%', zIndex: 16,
            }}>
              <div style={{
                maxWidth: '85%',
                opacity: entry * fadeOut,
                transform: `translateX(${(1 - entry) * (isEven ? -40 : 40)}px)`,
              }}>
                <div style={{
                  fontSize: 80, fontWeight: 200, color: colorAccent,
                  fontFamily: 'Georgia, "Times New Roman", serif',
                  lineHeight: 0.8, marginBottom: 8, opacity: 0.4,
                }}>
                  &ldquo;
                </div>
                <div style={{
                  fontSize: 34, fontWeight: 400,
                  fontFamily: 'Georgia, "Times New Roman", serif',
                  color: backgroundImage ? '#fff' : '#2a2a2a',
                  lineHeight: 1.5, fontStyle: 'italic',
                  textShadow: backgroundImage ? '0 2px 15px rgba(0,0,0,0.5)' : 'none',
                }}>
                  {line}
                </div>
                <div style={{
                  width: 40, height: 2, background: colorAccent,
                  marginTop: 16, opacity: 0.6,
                }} />
              </div>
            </AbsoluteFill>
          </Sequence>
        )
      })}

      <CTAOverlay
        text={cta}
        startFrame={durationInFrames - ctaFrames}
        durationFrames={ctaFrames}
        style="banner"
      />
      <Watermark />
    </AbsoluteFill>
  )
}
