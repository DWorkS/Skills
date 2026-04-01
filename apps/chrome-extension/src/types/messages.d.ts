/**
 * webext-bridge ProtocolMap — fully typed cross-context messaging.
 *
 * Augment this interface to add new message types.
 * Keys are message names; each entry declares:
 *   data     — the payload sent with sendMessage()
 *   response — what onMessage() must return (use void for fire-and-forget)
 *
 * @see https://github.com/zikaari/webext-bridge
 */

import type { Settings, Snippet } from '../utils/storage'

declare module 'webext-bridge' {
  export interface ProtocolMap {
    // ── Snippet CRUD ────────────────────────────────────────────────────
    'save-snippet': {
      data: {
        text: string
        url: string
        domain: string
        title: string
        note?: string
        color?: string
      }
      response: { id: string }
    }

    'delete-snippet': {
      data: { id: string }
      response: { success: boolean }
    }

    'update-snippet-note': {
      data: { id: string, note: string }
      response: { success: boolean }
    }

    // ── Queries ──────────────────────────────────────────────────────────
    'get-snippets': {
      data: Record<string, never>
      response: Snippet[]
    }

    'get-settings': {
      data: Record<string, never>
      response: Settings
    }

    // ── Settings ─────────────────────────────────────────────────────────
    'update-settings': {
      data: Partial<Settings>
      response: Settings
    }

    // ── Notifications (background → content script) ───────────────────────
    'toggle-widget': {
      data: { visible: boolean }
      response: void
    }

    // ── Count update (background → sidepanel/popup) ───────────────────────
    'snippets-updated': {
      data: { count: number }
      response: void
    }
  }
}
