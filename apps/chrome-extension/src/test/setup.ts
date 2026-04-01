/**
 * Vitest global test setup.
 *
 * Provides a minimal browser extension API mock so unit tests can
 * import and exercise extension code without a real browser.
 */

import { beforeEach, vi } from 'vitest'
import { computed, onMounted, onUnmounted, readonly, ref, watch, watchEffect } from 'vue'

// ── Vue auto-import stubs ──────────────────────────────────────────────────
// WXT auto-imports Vue composables in processed files. Vitest doesn't do
// this, so we add them to globalThis so store/composable files work without
// explicit Vue imports.
Object.assign(globalThis, { ref, computed, watch, watchEffect, onMounted, onUnmounted, readonly })

// ── Mock WXT storage global ────────────────────────────────────────────────
// In real WXT builds, `storage` is injected as an auto-import.
// Here we provide a simplified in-memory implementation.
const memStore: Record<string, unknown> = {}

// Reset shared in-memory store between every test so state doesn't leak.
beforeEach(() => {
  for (const key in memStore) delete memStore[key]
})

function mockStorageItem<T>(key: string, fallback: T) {
  return {
    getValue: vi.fn(async () => (memStore[key] as T) ?? fallback),
    setValue: vi.fn(async (val: T) => { memStore[key] = val }),
    watch: vi.fn(() => () => {}),
    removeValue: vi.fn(async () => { delete memStore[key] }),
  }
}

Object.assign(globalThis, {
  // WXT storage global
  storage: {
    defineItem: vi.fn((key: string, opts: { fallback?: unknown, version?: number }) =>
      mockStorageItem(key, opts?.fallback),
    ),
    getItem: vi.fn(async (key: string) => memStore[key]),
    setItem: vi.fn(async (key: string, val: unknown) => { memStore[key] = val }),
    removeItem: vi.fn(async (key: string) => { delete memStore[key] }),
    setItems: vi.fn(),
  },

  // Minimal browser API mocks
  browser: {
    runtime: {
      sendMessage: vi.fn(),
      onMessage: { addListener: vi.fn(), removeListener: vi.fn() },
      onInstalled: { addListener: vi.fn() },
      openOptionsPage: vi.fn(),
    },
    storage: {
      local: { get: vi.fn(), set: vi.fn(), remove: vi.fn() },
      sync: { get: vi.fn(), set: vi.fn(), remove: vi.fn() },
      session: { get: vi.fn(), set: vi.fn(), remove: vi.fn() },
    },
    tabs: {
      query: vi.fn(async () => [{ id: 1, url: 'https://example.com', title: 'Example' }]),
      sendMessage: vi.fn(),
    },
    action: {
      setBadgeText: vi.fn(),
      setBadgeBackgroundColor: vi.fn(),
    },
    contextMenus: {
      create: vi.fn(),
      onClicked: { addListener: vi.fn() },
    },
    alarms: {
      create: vi.fn(),
      onAlarm: { addListener: vi.fn() },
    },
    sidePanel: {
      open: vi.fn(),
    },
    commands: {
      onCommand: { addListener: vi.fn() },
    },
  },
})
