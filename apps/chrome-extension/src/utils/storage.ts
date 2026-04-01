/**
 * Typed storage definitions for PageNote Pro.
 *
 * `storage` is a WXT global — no import needed in entrypoints or
 * files under components/, composables/, utils/.
 *
 * Storage areas:
 *   local:   device-local (persists across sessions)
 *   sync:    cross-device via Chrome Sync (5MB limit, 512 bytes per key)
 *   session: cleared when the browser session ends
 */

// ── Data models ─────────────────────────────────────────────────────────────

export interface Snippet {
  id: string
  text: string
  url: string
  domain: string
  title: string
  note: string
  color: SnippetColor
  createdAt: number // Unix ms
}

export type SnippetColor = 'yellow' | 'green' | 'blue' | 'pink' | 'purple'

export interface Settings {
  theme: 'light' | 'dark' | 'auto'
  maxSnippets: number
  showSelectionWidget: boolean
  language: 'en' | 'de'
}

// ── V1 shape (kept for migration reference only) ──────────────────────────────
interface SnippetV1 {
  id: string
  text: string
  url: string
  domain: string
  title: string
  note: string
  createdAt: number
  // ← no `color` field in v1
}

// ── Storage items ─────────────────────────────────────────────────────────────

/**
 * Main snippet list.
 *
 * Version 2 adds the `color` field. The migration function
 * back-fills `color: 'yellow'` on any v1 entries.
 */
export const snippetsStorage = storage.defineItem<Snippet[]>('local:snippets', {
  fallback: [],
  version: 2,
  migrations: {
    2: (old: SnippetV1[]): Snippet[] =>
      old.map(s => ({ ...s, color: 'yellow' as SnippetColor })),
  },
})

/**
 * User preferences — synced across devices.
 */
export const settingsStorage = storage.defineItem<Settings>('sync:settings', {
  fallback: {
    theme: 'auto',
    maxSnippets: 500,
    showSelectionWidget: true,
    language: 'en',
  },
})

/**
 * Records the first install date (set once, never updated).
 */
export const installDateStorage = storage.defineItem<number>('local:installDate', {
  init: () => Date.now(),
})

/**
 * Badge count cached in session storage for quick reads.
 * Rebuilt on every service worker wake-up.
 */
export const badgeCountStorage = storage.defineItem<number>('session:badgeCount', {
  fallback: 0,
})
