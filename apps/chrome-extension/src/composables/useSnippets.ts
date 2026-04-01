/**
 * useSnippets — composable that sends messages to the background service worker.
 *
 * Keeps popup and side panel decoupled from storage by routing ALL
 * mutations through the background (single source of truth).
 *
 * Auto-imported in all entrypoints, components, and composables.
 */

// NOTE: this composable is used by multiple contexts; the caller must
// ensure only the correct webext-bridge context module is imported in
// the bundled entrypoint (handled by context-specific main.ts files).

import type { Settings, Snippet } from '../utils/storage'

/**
 * Light reactive wrapper around the background messaging API.
 * Use this in popup where Pinia is not installed.
 */
export function useSnippetMessages(
  bridge: {
    getSnippets: () => Promise<Snippet[]>
    deleteSnippet: (id: string) => Promise<{ success: boolean }>
    updateNote: (id: string, note: string) => Promise<{ success: boolean }>
    getSettings: () => Promise<Settings>
  },
) {
  const snippets = ref<Snippet[]>([])
  const settings = ref<Settings | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function refresh() {
    loading.value = true
    error.value = null
    try {
      [snippets.value, settings.value] = await Promise.all([
        bridge.getSnippets(),
        bridge.getSettings(),
      ])
    }
    catch (e) {
      error.value = (e as Error).message
    }
    finally {
      loading.value = false
    }
  }

  async function deleteSnippet(id: string) {
    await bridge.deleteSnippet(id)
    snippets.value = snippets.value.filter(s => s.id !== id)
  }

  async function saveNote(id: string, note: string) {
    await bridge.updateNote(id, note)
    snippets.value = snippets.value.map(s =>
      s.id === id ? { ...s, note } : s,
    )
  }

  onMounted(refresh)

  return { snippets, settings, loading, error, refresh, deleteSnippet, saveNote }
}
