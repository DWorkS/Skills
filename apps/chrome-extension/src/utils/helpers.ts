/**
 * Utility helpers used throughout the extension.
 * Auto-imported in all entrypoints, components, composables, and utils.
 */

import type { Snippet } from './storage'

// ── Regex patterns ────────────────────────────────────────────────────────────
const WWW_PREFIX_REGEX = /^www\./

// ── ID generation ────────────────────────────────────────────────────────────

/** Generates a short unique ID (not cryptographically secure). */
export function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

// ── URL utilities ─────────────────────────────────────────────────────────────

/** Extracts the hostname from a URL, stripping 'www.' prefix. */
export function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(WWW_PREFIX_REGEX, '')
  }
  catch {
    return url
  }
}

// ── Text utilities ────────────────────────────────────────────────────────────

/**
 * Truncates `text` to `max` characters, appending '…' if cut.
 * Truncates at the last word boundary when possible.
 */
export function truncate(text: string, max = 200): string {
  if (text.length <= max)
    return text
  const cut = text.lastIndexOf(' ', max)
  return `${text.slice(0, cut > max / 2 ? cut : max)}…`
}

// ── Date formatting ───────────────────────────────────────────────────────────

const DAY_MS = 86_400_000

/** Returns a human-readable relative date label. */
export function formatRelativeDate(timestamp: number): string {
  const diff = Date.now() - timestamp
  if (diff < DAY_MS)
    return 'Today'
  if (diff < DAY_MS * 2)
    return 'Yesterday'
  return new Date(timestamp).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

// ── Grouping ──────────────────────────────────────────────────────────────────

/** Groups snippets by domain, sorted by most recent first within each group. */
export function groupByDomain(snippets: Snippet[]): Record<string, Snippet[]> {
  const sorted = [...snippets].sort((a, b) => b.createdAt - a.createdAt)
  return sorted.reduce<Record<string, Snippet[]>>((acc, snippet) => {
    (acc[snippet.domain] ??= []).push(snippet)
    return acc
  }, {})
}

// ── Color helpers ─────────────────────────────────────────────────────────────

const COLOR_CLASSES: Record<string, string> = {
  yellow: 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-700',
  green: 'bg-green-100  dark:bg-green-900/30  border-green-300  dark:border-green-700',
  blue: 'bg-blue-100   dark:bg-blue-900/30   border-blue-300   dark:border-blue-700',
  pink: 'bg-pink-100   dark:bg-pink-900/30   border-pink-300   dark:border-pink-700',
  purple: 'bg-purple-100 dark:bg-purple-900/30 border-purple-300 dark:border-purple-700',
}

export function colorClass(color: string): string {
  return COLOR_CLASSES[color] ?? COLOR_CLASSES.yellow
}
