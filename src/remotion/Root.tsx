import React from 'react'
import { Composition } from 'remotion'
import {
  CaptionStyleVideo,
  TextOnScreenVideo,
  SplitScreenVideo,
  CountdownVideo,
  TestimonialVideo,
  BeforeAfterVideo,
  ProductShowcaseVideo,
  CinematicVideo,
  NeonVideo,
  MinimalistVideo,
  MagazineVideo,
} from './UGCCompositions'
import type { UGCVideoProps } from './UGCCompositions'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const asComponent = (c: React.FC<UGCVideoProps>) => c as React.FC<any>

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="CaptionStyle"
        component={asComponent(CaptionStyleVideo)}
        durationInFrames={900}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          hook: 'This changed everything...',
          scriptLines: ['Line 1', 'Line 2'],
          caption: '',
          cta: 'Link in Bio',
          captionStyle: 'karaoke' as const,
          hookStyle: 'pop' as const,
          colorAccent: '#A855F7',
        }}
      />
      <Composition
        id="TextOnScreen"
        component={asComponent(TextOnScreenVideo)}
        durationInFrames={900}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          hook: 'Stop scrolling...',
          scriptLines: ['Point 1', 'Point 2', 'Point 3'],
          caption: '',
          cta: 'Shop Now',
          colorAccent: '#EC4899',
        }}
      />
      <Composition
        id="SplitScreen"
        component={asComponent(SplitScreenVideo)}
        durationInFrames={900}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          hook: 'Watch this hack...',
          scriptLines: ['Step 1', 'Step 2', 'Step 3'],
          caption: '',
          cta: 'Comment LINK for details',
          colorAccent: '#3B82F6',
        }}
      />
      <Composition
        id="Countdown"
        component={asComponent(CountdownVideo)}
        durationInFrames={900}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          hook: 'Top 5 reasons to try this...',
          scriptLines: ['Reason one', 'Reason two', 'Reason three', 'Reason four', 'Reason five'],
          caption: '',
          cta: 'Try it now!',
          colorAccent: '#F59E0B',
        }}
      />
      <Composition
        id="Testimonial"
        component={asComponent(TestimonialVideo)}
        durationInFrames={900}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          hook: 'Real results, real people',
          scriptLines: ['This product changed my routine', 'Results in just 2 weeks'],
          caption: '',
          cta: 'See for yourself',
          colorAccent: '#10B981',
        }}
      />
      <Composition
        id="BeforeAfter"
        component={asComponent(BeforeAfterVideo)}
        durationInFrames={900}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          hook: 'The transformation is real...',
          scriptLines: ['Dull skin', 'No confidence', 'Glowing skin', 'Total confidence'],
          caption: '',
          cta: 'Start your journey',
          colorAccent: '#EF4444',
        }}
      />
      <Composition
        id="ProductShowcase"
        component={asComponent(ProductShowcaseVideo)}
        durationInFrames={900}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          hook: 'Introducing the ultimate solution',
          scriptLines: ['Premium ingredients', 'Fast-acting formula', 'Clinically tested'],
          caption: '',
          cta: 'Shop Now',
          colorAccent: '#8B5CF6',
        }}
      />
      <Composition
        id="Cinematic"
        component={asComponent(CinematicVideo)}
        durationInFrames={900}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          hook: 'A story worth telling...',
          scriptLines: ['Every great journey', 'begins with one step'],
          caption: '',
          cta: 'Watch Now',
          captionStyle: 'fade' as const,
          colorAccent: '#D4AF37',
        }}
      />
      <Composition
        id="Neon"
        component={asComponent(NeonVideo)}
        durationInFrames={900}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          hook: 'THE FUTURE IS HERE',
          scriptLines: ['Next-gen technology', 'Built for creators', 'Available now'],
          caption: '',
          cta: 'Get Access',
          colorAccent: '#00F0FF',
        }}
      />
      <Composition
        id="Minimalist"
        component={asComponent(MinimalistVideo)}
        durationInFrames={900}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          hook: 'Less is more.',
          scriptLines: ['Simple ingredients', 'Real results'],
          caption: '',
          cta: 'Learn More',
          colorAccent: '#111111',
        }}
      />
      <Composition
        id="Magazine"
        component={asComponent(MagazineVideo)}
        durationInFrames={900}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          hook: 'The definitive guide',
          scriptLines: ['Expert insights', 'Industry secrets revealed'],
          caption: '',
          cta: 'Read More',
          colorAccent: '#C8102E',
        }}
      />
    </>
  )
}
