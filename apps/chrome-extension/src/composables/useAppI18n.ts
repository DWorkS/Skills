/**
 * useAppI18n — runtime locale composable for WXT extensions.
 *
 * Why this exists instead of using `i18n` from `#i18n` (the @wxt-dev/i18n module):
 *   @wxt-dev/i18n wraps browser.i18n which reads the browser's OS language and
 *   cannot be switched at runtime. To support a user-selected language stored in
 *   sync storage, we import the JSON locale files directly and manage the active
 *   locale via a module-level Vue ref.
 *
 * Usage (Vue SFC or composable):
 *   const { t, locale, setLocale, availableLocales } = useAppI18n()
 *
 * Features:
 *   - Reactive t() — all bindings update immediately when setLocale() is called
 *   - Persists the selected locale to sync storage (Settings.language)
 *   - Listens for storage changes from other extension contexts so all open
 *     pages stay in sync without a reload
 *   - Plural forms: { "1": "1 item", "n": "$1 items" }
 *   - Parameter substitution: "Hello $1!" → "Hello World!"
 */

import { computed, onMounted, ref } from 'vue'
import deMessages from '../locales/de.json'
import enMessages from '../locales/en.json'
import { settingsStorage } from '../utils/storage'

// ── Types ──────────────────────────────────────────────────────────────────

type Messages = Record<string, string | Record<string, string>>
export type LocaleCode = 'en' | 'de'

// ── Locale registry ────────────────────────────────────────────────────────

const MESSAGES: Record<LocaleCode, Messages> = {
  en: enMessages as Messages,
  de: deMessages as Messages,
}

export const AVAILABLE_LOCALES: { code: LocaleCode, name: string }[] = [
  { code: 'en', name: 'English' },
  { code: 'de', name: 'Deutsch' },
]

// ── Module-level singleton ─────────────────────────────────────────────────
// One locale ref per entrypoint JS context — all components in the same
// page share the same ref so a single setLocale() call updates everything.

const locale = ref<LocaleCode>('en')
let storageWatcherAttached = false

// ── Helpers ────────────────────────────────────────────────────────────────

function substituteArgs(template: string, args: (string | number)[]): string {
  return template.replace(/\$(\d+)/g, (_, i) => String(args[Number(i) - 1] ?? ''))
}

function translate(msgs: Messages, key: string, args: (string | number)[]): string {
  const entry = msgs[key]
  if (entry === undefined)
    return key

  if (typeof entry === 'object') {
    // Plural form: { "1": "1 item", "n": "$1 items" }
    const count = typeof args[0] === 'number' ? args[0] : 0
    const template = count === 1 ? entry['1'] : entry.n
    return substituteArgs(template ?? key, args)
  }

  return substituteArgs(entry, args)
}

// ── Composable ─────────────────────────────────────────────────────────────

export function useAppI18n() {
  onMounted(async () => {
    // Read stored language preference and apply it
    const settings = await settingsStorage.getValue()
    locale.value = (settings.language as LocaleCode) ?? 'en'

    // Watch storage once per context so locale stays in sync across pages
    if (!storageWatcherAttached) {
      storageWatcherAttached = true
      settingsStorage.watch((s) => {
        if (s?.language)
          locale.value = s.language as LocaleCode
      })
    }
  })

  const messages = computed(() => MESSAGES[locale.value] ?? MESSAGES.en)

  function t(key: string, ...args: (string | number)[]): string {
    return translate(messages.value, key, args)
  }

  /**
   * Switch the active locale immediately (reactive) and persist to storage.
   * All components in this page update without a reload.
   */
  async function setLocale(lang: LocaleCode): Promise<void> {
    locale.value = lang
    const settings = await settingsStorage.getValue()
    await settingsStorage.setValue({ ...settings, language: lang })
  }

  return {
    t,
    locale,
    setLocale,
    availableLocales: AVAILABLE_LOCALES,
  }
}
