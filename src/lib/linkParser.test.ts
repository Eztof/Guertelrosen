import { describe, it, expect } from 'vitest'
import { extractInternalLinks, generateSlug, renderInternalLinks } from './linkParser'

describe('extractInternalLinks', () => {
  it('extracts single link', () => {
    expect(extractInternalLinks('See [[Andergast]] for more')).toEqual(['Andergast'])
  })
  it('extracts multiple links', () => {
    expect(extractInternalLinks('[[Elfen]] and [[Zwerge]] live here')).toEqual(['Elfen', 'Zwerge'])
  })
  it('deduplicates links', () => {
    expect(extractInternalLinks('[[A]] and [[A]] again')).toEqual(['A'])
  })
  it('returns empty for no links', () => {
    expect(extractInternalLinks('No links here')).toEqual([])
  })
})

describe('generateSlug', () => {
  it('converts umlauts', () => {
    expect(generateSlug('Ärger')).toBe('aerger')
  })
  it('replaces spaces with hyphens', () => {
    expect(generateSlug('Die Schwarze Gilde')).toBe('die-schwarze-gilde')
  })
  it('adds suffix', () => {
    expect(generateSlug('Test', 2)).toBe('test-2')
  })
})

describe('renderInternalLinks', () => {
  it('renders valid links', () => {
    const map = new Map([['andergast', { slug: 'andergast', exists: true }]])
    const result = renderInternalLinks('See [[Andergast]]', map)
    expect(result).toContain('href="#/articles/andergast"')
    expect(result).toContain('internal-link')
  })
  it('renders broken links', () => {
    const result = renderInternalLinks('See [[Unknown]]', new Map())
    expect(result).toContain('broken-link')
  })
})
