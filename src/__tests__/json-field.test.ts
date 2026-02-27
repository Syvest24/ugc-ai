import { describe, it, expect } from 'vitest'
import { parseJsonField } from '@/lib/json-field'

describe('parseJsonField', () => {
  it('parses a valid JSON string', () => {
    expect(parseJsonField('["a","b"]', [])).toEqual(['a', 'b'])
  })

  it('returns the value directly if already an object', () => {
    const obj = { key: 'value' }
    expect(parseJsonField(obj as unknown as string, {})).toBe(obj)
  })

  it('returns fallback for null', () => {
    expect(parseJsonField(null, 'default')).toBe('default')
  })

  it('returns fallback for undefined', () => {
    expect(parseJsonField(undefined, [])).toEqual([])
  })

  it('returns fallback for invalid JSON string', () => {
    expect(parseJsonField('not-json{', {})).toEqual({})
  })

  it('parses nested JSON objects', () => {
    const input = '{"a":1,"b":{"c":true}}'
    expect(parseJsonField(input, {})).toEqual({ a: 1, b: { c: true } })
  })

  it('returns array directly when value is already an array', () => {
    const arr = [1, 2, 3]
    expect(parseJsonField(arr, [])).toBe(arr)
  })
})
