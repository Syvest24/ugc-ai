import { describe, it, expect } from 'vitest'
import { IMAGE_STYLES, IMAGE_ASPECT_RATIOS, buildImagePrompt, type ImageStyle } from '@/lib/image-gen'
import { IMAGE_TO_VIDEO_MOTIONS } from '@/lib/image-to-video'
import {
  PRESET_TEMPLATES,
  TEMPLATE_CATEGORIES,
} from '@/stores/prompt-store'

// ─── IMAGE_STYLES ───────────────────────────────────────────────────

describe('IMAGE_STYLES', () => {
  it('should have 10 styles', () => {
    expect(IMAGE_STYLES).toHaveLength(10)
  })

  it('each style has id, name, and emoji', () => {
    for (const s of IMAGE_STYLES) {
      expect(s.id).toBeTruthy()
      expect(s.name).toBeTruthy()
      expect(s.emoji).toBeTruthy()
    }
  })

  it('all style ids are unique', () => {
    const ids = IMAGE_STYLES.map(s => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('includes expected styles', () => {
    const ids = IMAGE_STYLES.map(s => s.id)
    expect(ids).toContain('photorealistic')
    expect(ids).toContain('cinematic')
    expect(ids).toContain('anime')
    expect(ids).toContain('neon')
    expect(ids).toContain('3d-render')
  })
})

// ─── IMAGE_ASPECT_RATIOS ───────────────────────────────────────────

describe('IMAGE_ASPECT_RATIOS', () => {
  it('should have 5 aspect ratios', () => {
    expect(IMAGE_ASPECT_RATIOS).toHaveLength(5)
  })

  it('each ratio has valid dimensions', () => {
    for (const ar of IMAGE_ASPECT_RATIOS) {
      expect(ar.width).toBeGreaterThanOrEqual(256)
      expect(ar.height).toBeGreaterThanOrEqual(256)
      expect(ar.width).toBeLessThanOrEqual(2048)
      expect(ar.height).toBeLessThanOrEqual(2048)
    }
  })

  it('includes square, portrait and landscape', () => {
    const ids = IMAGE_ASPECT_RATIOS.map(ar => ar.id)
    expect(ids).toContain('1:1')
    expect(ids).toContain('9:16')
    expect(ids).toContain('16:9')
  })

  it('each has label and desc', () => {
    for (const ar of IMAGE_ASPECT_RATIOS) {
      expect(ar.label.length).toBeGreaterThan(0)
      expect(ar.desc.length).toBeGreaterThan(0)
    }
  })
})

// ─── buildImagePrompt ───────────────────────────────────────────────

describe('buildImagePrompt', () => {
  it('includes product name', () => {
    const result = buildImagePrompt('Widget Pro', 'A great widget')
    expect(result).toContain('Widget Pro')
  })

  it('includes product description', () => {
    const result = buildImagePrompt('Widget Pro', 'Sleek aluminum body')
    expect(result).toContain('Sleek aluminum body')
  })

  it('includes context when provided', () => {
    const result = buildImagePrompt('Widget Pro', 'desc', 'on a white desk')
    expect(result).toContain('on a white desk')
  })

  it('adds professional photography suffix', () => {
    const result = buildImagePrompt('Widget', '')
    expect(result).toContain('Professional product photography')
  })

  it('works with empty description', () => {
    const result = buildImagePrompt('Widget', '')
    expect(result).toContain('Widget')
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })
})

// ─── IMAGE_TO_VIDEO_MOTIONS ────────────────────────────────────────

describe('IMAGE_TO_VIDEO_MOTIONS', () => {
  it('should have 6 motion types', () => {
    expect(IMAGE_TO_VIDEO_MOTIONS).toHaveLength(6)
  })

  it('each motion has id, name, and desc', () => {
    for (const m of IMAGE_TO_VIDEO_MOTIONS) {
      expect(m.id).toBeTruthy()
      expect(m.name).toBeTruthy()
      expect(m.desc.length).toBeGreaterThan(0)
    }
  })

  it('includes ken-burns motion', () => {
    const ids = IMAGE_TO_VIDEO_MOTIONS.map(m => m.id)
    expect(ids).toContain('ken-burns')
    expect(ids).toContain('zoom-in')
    expect(ids).toContain('pan-left')
  })
})

// ─── PRESET_TEMPLATES ──────────────────────────────────────────────

describe('PRESET_TEMPLATES', () => {
  it('should have at least 10 templates', () => {
    expect(PRESET_TEMPLATES.length).toBeGreaterThanOrEqual(10)
  })

  it('each template has required fields', () => {
    for (const t of PRESET_TEMPLATES) {
      expect(t.id).toBeTruthy()
      expect(t.name.length).toBeGreaterThan(0)
      expect(t.prompt.length).toBeGreaterThan(10)
      expect(t.category).toBeTruthy()
    }
  })

  it('all template ids are unique', () => {
    const ids = PRESET_TEMPLATES.map(t => t.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('covers all non-custom categories', () => {
    const categories = new Set(PRESET_TEMPLATES.map(t => t.category))
    expect(categories).toContain('product')
    expect(categories).toContain('social')
    expect(categories).toContain('background')
    expect(categories).toContain('artistic')
    expect(categories).toContain('portrait')
  })

  it('template styles are valid ImageStyle values', () => {
    const validStyles: ImageStyle[] = [
      'photorealistic', 'digital-art', 'anime', 'cinematic', 'minimalist',
      'watercolor', 'oil-painting', '3d-render', 'neon', 'vintage',
    ]
    for (const t of PRESET_TEMPLATES) {
      if (t.style) {
        expect(validStyles).toContain(t.style)
      }
    }
  })
})

describe('TEMPLATE_CATEGORIES', () => {
  it('should have 6 categories', () => {
    expect(TEMPLATE_CATEGORIES).toHaveLength(6)
  })

  it('includes custom category', () => {
    const ids = TEMPLATE_CATEGORIES.map(c => c.id)
    expect(ids).toContain('custom')
  })

  it('each has emoji and name', () => {
    for (const c of TEMPLATE_CATEGORIES) {
      expect(c.emoji.length).toBeGreaterThan(0)
      expect(c.name.length).toBeGreaterThan(0)
    }
  })
})
