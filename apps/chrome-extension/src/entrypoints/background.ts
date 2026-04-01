/**
 * Background service worker — the central hub of PageNote Pro.
 *
 * Responsibilities:
 *  - Open the side panel on toolbar icon click
 *  - Register and handle context menus (right-click → save snippet)
 *  - Respond to webext-bridge messages from popup, side panel, options, content
 *  - Run an hourly alarm to trim snippets that exceed the user's limit
 *  - Update the toolbar badge count
 *  - Forward keyboard shortcut → toggle selection widget in active tab
 */

import type { Snippet, SnippetColor } from '../utils/storage'
import { onMessage, sendMessage } from 'webext-bridge/background'
import { generateId, getDomain } from '../utils/helpers'
import {
  badgeCountStorage,
  installDateStorage,
  settingsStorage,
  snippetsStorage,
} from '../utils/storage'

const ALARM_CLEANUP = 'pagenote-cleanup'
const MENU_SAVE = 'pagenote-save-selection'

export default defineBackground({
  type: 'module',
  persistent: false, // MV3 service workers are never persistent

  main() {
    // ── Install / update ───────────────────────────────────────────────────
    browser.runtime.onInstalled.addListener(async ({ reason }) => {
      if (reason === 'install') {
        // Touch installDate so the `init` callback fires once
        await installDateStorage.getValue()
      }

      // Register context menu (must be inside onInstalled)
      browser.contextMenus.create({
        id: MENU_SAVE,
        title: 'Save to PageNote Pro',
        contexts: ['selection'],
      })

      // Schedule hourly cleanup alarm
      browser.alarms.create(ALARM_CLEANUP, { periodInMinutes: 60 })

      // Sync the badge on startup
      await syncBadge()
    })

    // ── Toolbar icon → open side panel ────────────────────────────────────
    browser.action.onClicked.addListener(async (tab) => {
      if (tab.id == null)
        return
      await browser.sidePanel.open({ tabId: tab.id })
    })

    // ── Keyboard shortcut ─────────────────────────────────────────────────
    browser.commands.onCommand.addListener(async (command, tab) => {
      if (command === 'toggle-widget' && tab?.id != null) {
        const settings = await settingsStorage.getValue()
        // Toggle: invert current setting for this tab only via a message
        await sendMessage(
          'toggle-widget',
          { visible: !settings.showSelectionWidget },
          `content-script@${tab.id}`,
        )
      }
    })

    // ── Context menu click → save snippet ─────────────────────────────────
    browser.contextMenus.onClicked.addListener(async (info, tab) => {
      if (info.menuItemId !== MENU_SAVE)
        return
      if (!info.selectionText || !tab?.id)
        return

      const snippet = buildSnippet({
        text: info.selectionText,
        url: tab.url ?? '',
        title: tab.title ?? '',
        domain: getDomain(tab.url ?? ''),
      })

      await persistSnippet(snippet)
    })

    // ── Alarms ────────────────────────────────────────────────────────────
    browser.alarms.onAlarm.addListener(async (alarm) => {
      if (alarm.name !== ALARM_CLEANUP)
        return
      await trimSnippets()
    })

    // ── webext-bridge handlers ─────────────────────────────────────────────

    // Content script / popup / side panel → save a new snippet
    onMessage('save-snippet', async ({ data }) => {
      const snippet = buildSnippet(data)
      await persistSnippet(snippet)
      return { id: snippet.id }
    })

    // Popup / side panel → fetch all snippets
    onMessage('get-snippets', async () => {
      return snippetsStorage.getValue()
    })

    // Side panel / options → delete one snippet
    onMessage('delete-snippet', async ({ data }) => {
      const all = await snippetsStorage.getValue()
      const updated = all.filter(s => s.id !== data.id)
      await snippetsStorage.setValue(updated)
      await syncBadge()
      return { success: true }
    })

    // Side panel → add / update a note on an existing snippet
    onMessage('update-snippet-note', async ({ data }) => {
      const all = await snippetsStorage.getValue()
      const updated = all.map(s =>
        s.id === data.id ? { ...s, note: data.note } : s,
      )
      await snippetsStorage.setValue(updated)
      return { success: true }
    })

    // Any context → read settings
    onMessage('get-settings', async () => {
      return settingsStorage.getValue()
    })

    // Options page → update settings
    onMessage('update-settings', async ({ data }) => {
      const current = await settingsStorage.getValue()
      const next = { ...current, ...data }
      await settingsStorage.setValue(next)
      return next
    })
  },
})

// ── Helpers ────────────────────────────────────────────────────────────────

function buildSnippet(data: {
  text: string
  url: string
  domain?: string
  title: string
  note?: string
  color?: SnippetColor
}): Snippet {
  return {
    id: generateId(),
    text: data.text.trim(),
    url: data.url,
    domain: data.domain ?? getDomain(data.url),
    title: data.title,
    note: data.note ?? '',
    color: data.color ?? 'yellow',
    createdAt: Date.now(),
  }
}

async function persistSnippet(snippet: Snippet): Promise<void> {
  const settings = await settingsStorage.getValue()
  const all = await snippetsStorage.getValue()
  const updated = [snippet, ...all].slice(0, settings.maxSnippets)
  await snippetsStorage.setValue(updated)
  await syncBadge()
}

async function trimSnippets(): Promise<void> {
  const settings = await settingsStorage.getValue()
  const all = await snippetsStorage.getValue()
  if (all.length <= settings.maxSnippets)
    return
  // Keep the most recent `maxSnippets` entries
  const trimmed = [...all]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, settings.maxSnippets)
  await snippetsStorage.setValue(trimmed)
  await syncBadge()
}

async function syncBadge(): Promise<void> {
  const all = await snippetsStorage.getValue()
  const count = all.length
  await badgeCountStorage.setValue(count)

  const label = count > 0 ? String(count > 999 ? '999+' : count) : ''
  await browser.action.setBadgeText({ text: label })
  await browser.action.setBadgeBackgroundColor({ color: '#6366f1' })
}
