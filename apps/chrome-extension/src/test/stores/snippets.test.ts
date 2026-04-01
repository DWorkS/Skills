/**
 * Unit tests for the snippets Pinia store.
 *
 * Uses in-memory storage mocks (set up in test/setup.ts) so no
 * real browser storage is touched during tests.
 */

import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useSnippetsStore } from '../../stores/snippets'

// Provide minimal WXT auto-import stubs needed by the store module.
// (storage global is set up in test/setup.ts)

describe('useSnippetsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    // Reset the in-memory store mock data
    vi.clearAllMocks()
  })

  it('initialises with empty snippets', async () => {
    const store = useSnippetsStore()
    await store.init()
    expect(store.snippets).toEqual([])
  })

  it('adds a snippet and returns its ID', async () => {
    const store = useSnippetsStore()
    await store.init()

    const id = await store.add({
      text: 'Hello world',
      url: 'https://example.com',
      title: 'Example',
    })

    expect(id).toBeTruthy()
    expect(store.snippets).toHaveLength(1)
    expect(store.snippets[0].text).toBe('Hello world')
    expect(store.snippets[0].domain).toBe('example.com')
  })

  it('removes a snippet by ID', async () => {
    const store = useSnippetsStore()
    await store.init()

    const id = await store.add({
      text: 'Delete me',
      url: 'https://example.com',
      title: 'Example',
    })

    await store.remove(id)
    expect(store.snippets).toHaveLength(0)
  })

  it('updates a snippet note', async () => {
    const store = useSnippetsStore()
    await store.init()

    const id = await store.add({
      text: 'My research finding',
      url: 'https://example.com',
      title: 'Example',
    })

    await store.updateNote(id, 'Important context')
    const snippet = store.snippets.find(s => s.id === id)
    expect(snippet?.note).toBe('Important context')
  })

  it('clears all snippets', async () => {
    const store = useSnippetsStore()
    await store.init()

    await store.add({ text: 'One', url: 'https://example.com', title: 'A' })
    await store.add({ text: 'Two', url: 'https://example.com', title: 'B' })
    expect(store.snippets).toHaveLength(2)

    await store.clearAll()
    expect(store.snippets).toHaveLength(0)
  })

  it('sorts snippets newest first in sortedSnippets', async () => {
    const store = useSnippetsStore()
    await store.init()

    // Add with small delays to ensure different timestamps
    await store.add({ text: 'First', url: 'https://a.com', title: 'A' })
    await new Promise(r => setTimeout(r, 5))
    await store.add({ text: 'Second', url: 'https://b.com', title: 'B' })

    const [newest] = store.sortedSnippets
    expect(newest.text).toBe('Second')
  })

  it('domain list contains unique domains', async () => {
    const store = useSnippetsStore()
    await store.init()

    await store.add({ text: 'A', url: 'https://alpha.com/1', title: 'A' })
    await store.add({ text: 'B', url: 'https://alpha.com/2', title: 'B' })
    await store.add({ text: 'C', url: 'https://beta.com', title: 'C' })

    expect(store.domains).toEqual(expect.arrayContaining(['alpha.com', 'beta.com']))
    expect(store.domains).toHaveLength(2) // no duplicates
  })
})
