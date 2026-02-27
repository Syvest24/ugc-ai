import { describe, it, expect } from 'vitest'
import {
  PLATFORMS,
  TONES,
  CONTENT_GOALS,
  PLATFORM_LABELS,
  PLATFORM_COLORS,
  TONE_LABELS,
  CONTENT_GOAL_LABELS,
  GOAL_PROMPT_LABELS,
  VOICE_OPTIONS,
  VIDEO_TEMPLATES,
  TEMPLATE_LABELS,
  LLM_PROVIDERS,
} from '@/lib/constants'

describe('constants', () => {
  describe('PLATFORMS', () => {
    it('has 5 platforms', () => {
      expect(PLATFORMS).toHaveLength(5)
    })

    it('every platform has a label', () => {
      for (const p of PLATFORMS) {
        expect(PLATFORM_LABELS[p]).toBeDefined()
        expect(typeof PLATFORM_LABELS[p]).toBe('string')
      }
    })

    it('every platform has a color', () => {
      for (const p of PLATFORMS) {
        expect(PLATFORM_COLORS[p]).toMatch(/^#[0-9a-fA-F]{6}$/)
      }
    })
  })

  describe('TONES', () => {
    it('has 5 tones', () => {
      expect(TONES).toHaveLength(5)
    })

    it('every tone has a label', () => {
      for (const t of TONES) {
        expect(TONE_LABELS[t]).toBeDefined()
      }
    })
  })

  describe('CONTENT_GOALS', () => {
    it('has 4 goals', () => {
      expect(CONTENT_GOALS).toHaveLength(4)
    })

    it('every goal has both a UI label and a prompt label', () => {
      for (const g of CONTENT_GOALS) {
        expect(CONTENT_GOAL_LABELS[g]).toBeDefined()
        expect(GOAL_PROMPT_LABELS[g]).toBeDefined()
      }
    })
  })

  describe('VOICE_OPTIONS', () => {
    it('has 8 voices', () => {
      expect(VOICE_OPTIONS).toHaveLength(8)
    })

    it('each voice has id, name, gender, style', () => {
      for (const v of VOICE_OPTIONS) {
        expect(v.id).toBeTruthy()
        expect(v.name).toBeTruthy()
        expect(['Male', 'Female']).toContain(v.gender)
        expect(v.style).toBeTruthy()
      }
    })

    it('all voice ids are unique', () => {
      const ids = VOICE_OPTIONS.map(v => v.id)
      expect(new Set(ids).size).toBe(ids.length)
    })
  })

  describe('VIDEO_TEMPLATES', () => {
    it('has 11 templates', () => {
      expect(VIDEO_TEMPLATES).toHaveLength(11)
    })

    it('every template has a label', () => {
      for (const t of VIDEO_TEMPLATES) {
        expect(TEMPLATE_LABELS[t]).toBeDefined()
      }
    })
  })

  describe('LLM_PROVIDERS', () => {
    it('has 5 providers', () => {
      expect(LLM_PROVIDERS).toHaveLength(5)
    })

    it('each provider has value, label, and at least one model', () => {
      for (const p of LLM_PROVIDERS) {
        expect(p.value).toBeTruthy()
        expect(p.label).toBeTruthy()
        expect(p.models.length).toBeGreaterThan(0)
      }
    })
  })
})
