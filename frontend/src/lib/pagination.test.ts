import { describe, expect, it } from 'vitest'
import { appendPage } from './pagination'

const row = (id: string) => ({ id })

describe('appendPage', () => {
  it('appends new rows in order', () => {
    expect(appendPage([row('a'), row('b')], [row('c'), row('d')])).toEqual([row('a'), row('b'), row('c'), row('d')])
  })

  it('skips rows that are already present', () => {
    expect(appendPage([row('a'), row('b')], [row('b'), row('c')])).toEqual([row('a'), row('b'), row('c')])
  })

  it('returns the same array when nothing is new, so React can skip re-rendering', () => {
    const existing = [row('a')]
    expect(appendPage(existing, [row('a')])).toBe(existing)
    expect(appendPage(existing, [])).toBe(existing)
  })
})
