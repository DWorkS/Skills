/**
 * Snippets Pinia store.
 *
 * Used in the side panel and options page (both have Pinia installed).
 * The store syncs with `local:snippets` storage and stays reactive
 * via a `watch()` subscription.
 *
 * Import manually — stores/ is NOT an auto-import directory:
 *   import { useSnippetsStore } from '../stores/snippets';
 */

import type { Settings, Snippet, SnippetColor } from '../utils/storage'
import { defineStore } from 'pinia'
import { generateId, getDomain } from '../utils/helpers'
import { settingsStorage, snippetsStorage } from '../utils/storage'

export const useSnippetsStore = defineStore('snippets', () => {
  // ── State ──────────────────────────────────────────────────────────────────
  const snippets = ref<Snippet[]>([])
  const settings = ref<Settings | null>(null)
  const loading = ref(true)

  // ── Getters ────────────────────────────────────────────────────────────────
  const sortedSnippets = computed(() =>
    [...snippets.value].sort((a, b) => b.createdAt - a.createdAt),
  )

  const domains = computed(() => [
    ...new Set(snippets.value.map(s => s.domain)),
  ])

  // ── Init ───────────────────────────────────────────────────────────────────
  async function init() {
    loading.value = true;
    [snippets.value, settings.value] = await Promise.all([
      snippetsStorage.getValue(),
      settingsStorage.getValue(),
    ])
    loading.value = false

    // Keep in sync when another context updates storage
    snippetsStorage.watch((updated) => {
      if (updated)
        snippets.value = updated
    })
    settingsStorage.watch((updated) => {
      if (updated)
        settings.value = updated
    })
  }

  // ── Actions ────────────────────────────────────────────────────────────────
  async function add(payload: {
    text: string
    url: string
    title: string
    note?: string
    color?: SnippetColor
  }): Promise<string> {
    const snippet: Snippet = {
      id: generateId(),
      text: payload.text,
      url: payload.url,
      domain: getDomain(payload.url),
      title: payload.title,
      note: payload.note ?? '',
      color: payload.color ?? 'yellow',
      createdAt: Date.now(),
    }

    const max = settings.value?.maxSnippets ?? 500
    const updated = [snippet, ...snippets.value].slice(0, max)
    snippets.value = updated
    await snippetsStorage.setValue(updated)
    return snippet.id
  }

  async function remove(id: string): Promise<void> {
    const updated = snippets.value.filter(s => s.id !== id)
    snippets.value = updated
    await snippetsStorage.setValue(updated)
  }

  async function updateNote(id: string, note: string): Promise<void> {
    const updated = snippets.value.map(s =>
      s.id === id ? { ...s, note } : s,
    )
    snippets.value = updated
    await snippetsStorage.setValue(updated)
  }

  async function clearAll(): Promise<void> {
    snippets.value = []
    await snippetsStorage.setValue([])
  }

  async function saveSettings(patch: Partial<Settings>): Promise<void> {
    const next = { ...(settings.value!), ...patch }
    settings.value = next
    await settingsStorage.setValue(next)
  }

  return {
    snippets,
    settings,
    loading,
    sortedSnippets,
    domains,
    init,
    add,
    remove,
    updateNote,
    clearAll,
    saveSettings,
  }
})
