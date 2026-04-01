/**
 * Unit tests for utils/helpers.ts
 */

import type { Snippet } from '../../utils/storage'
import { describe, expect, it } from 'vitest'
import {
  colorClass,
  formatRelativeDate,
  generateId,
  getDomain,
  groupByDomain,
  truncate,
} from '../../utils/helpers'

describe('generateId', () => {
  it('returns a non-empty string', () => {
    expect(typeof generateId()).toBe('string')
    expect(generateId().length).toBeGreaterThan(0)
  })

  it('generates unique IDs', () => {
    const ids = Array.from({ length: 100 }, generateId)
    expect(new Set(ids).size).toBe(100)
  })
})

describe('getDomain', () => {
  it('strips www prefix', () => {
    expect(getDomain('https://www.example.com/page')).toBe('example.com')
  })

  it('handles urls without www', () => {
    expect(getDomain('https://github.com/user/repo')).toBe('github.com')
  })

  it('returns original string for invalid URLs', () => {
    expect(getDomain('not-a-url')).toBe('not-a-url')
  })
})

describe('truncate', () => {
  it('returns the string unchanged when within limit', () => {
    const short = 'hello world'
    expect(truncate(short, 100)).toBe(short)
  })

  it('appends ellipsis when truncated', () => {
    const long = 'a '.repeat(200)
    const result = truncate(long, 50)
    expect(result.endsWith('…')).toBe(true)
    expect(result.length).toBeLessThanOrEqual(51) // 50 chars + ellipsis
  })
})

describe('formatRelativeDate', () => {
  it('returns "Today" for timestamps less than 24h ago', () => {
    expect(formatRelativeDate(Date.now() - 1000)).toBe('Today')
  })

  it('returns "Yesterday" for timestamps 24-48h ago', () => {
    expect(formatRelativeDate(Date.now() - 86_400_000 * 1.5)).toBe('Yesterday')
  })

  it('returns a formatted date string for older timestamps', () => {
    const year2000 = new Date('2000-01-15').getTime()
    const result = formatRelativeDate(year2000)
    expect(result).toMatch(/Jan/)
    expect(result).toContain('2000')
  })
})

describe('groupByDomain', () => {
  const makeSnippet = (id: string, domain: string, createdAt: number): Snippet => ({
    id,
    text: 'sample',
    url: `https://${domain}`,
    domain,
    title: 'Test',
    note: '',
    color: 'yellow',
    createdAt,
  })

  it('groups snippets by domain', () => {
    const snippets = [
      makeSnippet('1', 'example.com', 1000),
      makeSnippet('2', 'github.com', 2000),
      makeSnippet('3', 'example.com', 3000),
    ]
    const groups = groupByDomain(snippets)
    expect(Object.keys(groups)).toContain('example.com')
    expect(Object.keys(groups)).toContain('github.com')
    expect(groups['example.com']).toHaveLength(2)
  })

  it('sorts snippets within a group newest first', () => {
    const snippets = [
      makeSnippet('1', 'example.com', 1000),
      makeSnippet('2', 'example.com', 3000),
      makeSnippet('3', 'example.com', 2000),
    ]
    const [first] = groupByDomain(snippets)['example.com']
    expect(first.id).toBe('2') // highest createdAt
  })
})

describe('colorClass', () => {
  it('returns a non-empty class string for known colors', () => {
    for (const color of ['yellow', 'green', 'blue', 'pink', 'purple']) {
      expect(colorClass(color).length).toBeGreaterThan(0)
    }
  })

  it('falls back to yellow for unknown colors', () => {
    expect(colorClass('unknown')).toBe(colorClass('yellow'))
  })
})
