# WXT Extension Project Patterns & Architecture

Tested patterns and best practices discovered through building production extensions with WXT, Vue 3, Nuxt UI, and Pinia.

## Project Structure Convention

```
extension/
├── src/
│   ├── assets/              # Static files, images, icons
│   │   ├── main.css        # Global Tailwind + theme colors
│   │   └── icon.png        # App icon (PNG or SVG)
│   ├── components/          # Reusable Vue components (auto-imported)
│   │   ├── EmptyState.vue  # Presentational component for empty states
│   │   └── ItemCard.vue    # Item display component
│   ├── composables/         # Vue composables (auto-imported)
│   │   └── useAppI18n.ts   # Runtime i18n switching composable
│   ├── stores/             # Pinia stores (NOT auto-imported - import manually)
│   │   └── items.ts        # Main app state
│   ├── utils/              # Helper functions (auto-imported)
│   │   └── helpers.ts      # Pure functions, regex patterns
│   │   └── storage.ts      # Cross-context storage wrapper
│   ├── types/              # TypeScript type definitions
│   │   └── messages.d.ts   # Message type definitions
│   ├── locales/            # i18n JSON files (NOT YAML - easier to maintain)
│   │   ├── en.json
│   │   └── de.json
│   ├── entrypoints/        # Extension entry points (discovered by WXT)
│   │   ├── background.ts   # Service worker
│   │   ├── popup/          # Popup page (icon click)
│   │   ├── options/        # Options page
│   │   ├── sidepanel/      # Side panel page
│   │   └── content/        # Content scripts
│   └── test/               # Test files
│       ├── setup.ts        # Vitest global setup
│       ├── stores/
│       └── utils/
├── wxt.config.ts           # WXT configuration
├── eslint.config.js        # ESLint config (Antfu - NO SEMICOLONS)
├── vitest.config.ts        # Vitest configuration
├── package.json            # Dependencies
└── README.md               # Project documentation
```

**Key Rules:**
- `/src` folder convention required for WXT discovery
- Components and composables auto-imported from `/src`
- Stores must be imported manually (not auto-imported)
- Locales are JSON, NOT YAML (simpler parsing)
- All icons: PNG or SVG only

## Runtime i18n Composable Pattern

**Problem:** `@wxt-dev/i18n` wraps `browser.i18n` which only reads OS language and cannot be switched at runtime.

**Solution:** Create `useAppI18n` composable that:
- Imports JSON locale files directly
- Manages active locale in a module-level Vue ref (singleton per context)
- Persists selection to sync storage
- Watches storage for cross-page sync
- Provides reactive `t()` function

```typescript
// src/composables/useAppI18n.ts

export function useAppI18n() {
  onMounted(async () => {
    const settings = await settingsStorage.getValue()
    locale.value = (settings.language as LocaleCode) ?? 'en'

    if (!storageWatcherAttached) {
      storageWatcherAttached = true
      settingsStorage.watch((s) => {
        if (s?.language)
          locale.value = s.language as LocaleCode
      })
    }
  })

  return {
    t,                    // (key, ...args) => string
    locale,               // reactive ref<LocaleCode>
    setLocale,           // async (lang) => void
    availableLocales,    // { code, name }[]
  }
}
```



## Component Architecture with Nuxt UI v4

### EmptyState (Presentational)

```vue
<script setup lang="ts">
defineProps<{
  message?: string
  icon?: string
}>()
</script>

<template>
  <div class="flex flex-col items-center justify-center gap-3 py-12 text-center">
    <UIcon :name="icon ?? 'i-lucide-inbox'" class="size-10 text-dimmed" />
    <p class="text-sm text-muted max-w-48 leading-relaxed">
      {{ message ?? 'Nothing here yet.' }}
    </p>
  </div>
</template>
```

**Characteristics:**
- Pure presentation (no logic)
- Accepts message text from parent
- Uses Nuxt UI defaults
- No side effects or API calls

### ItemCard (Container with Logic)

```vue
<script setup lang="ts">
const props = defineProps<{ item: Item }>()

const emit = defineEmits<{
  'update:note': [id: string, note: string]
  'delete': [id: string]
}>()

const { t } = useAppI18n()
const isEditing = ref(false)
const actionLoading = ref(false)

async function handleAction() {
  actionLoading.value = true
  try {
    // Perform action
  } finally {
    actionLoading.value = false
  }
}
</script>

<template>
  <div class="space-y-2">
    <!-- Multi-line template with proper indentation -->
    <UButton
      :loading="actionLoading"
      @click="handleAction"
    >
      {{ t('action') }}
    </UButton>
  </div>
</template>
```

**Characteristics:**
- Multi-line attributes
- Nuxt UI components throughout
- ESLint-compliant indentation
- Proper event naming
- All text localized via `t()`

## Pinia Store Pattern

```typescript
// src/stores/items.ts

export const useItemsStore = defineStore('items', () => {
  const items = ref<Item[]>([])
  const settings = ref<Settings>({ /* defaults */ })

  const sortedItems = computed(() =>
    [...items.value].sort((a, b) => b.createdAt - a.createdAt)
  )

  async function init() {
    loading.value = true
    [items.value, settings.value] = await Promise.all([
      itemsStorage.getValue(),
      settingsStorage.getValue(),
    ])

    // Watch for cross-context updates
    itemsStorage.watch((updated) => {
      if (updated) items.value = updated
    })
  }

  async function addItem(item: Item) {
    items.value.push(item)
    await itemsStorage.setValue(items.value)
  }

  return { items, settings, sortedItems, loading, init, addItem }
})
```

**Usage:**
```vue
<script setup>
const store = useItemsStore()

onMounted(async () => {
  await store.init()  // Load from storage
})
</script>
```

## Testing Setup (Vitest + jsdom)

**Critical:** Vue 3 composables need manual global polyfill in tests.

```typescript
// src/test/setup.ts

import { beforeEach } from 'vitest'
import { ref, computed, watch, onMounted, onUnmounted, readonly } from 'vue'

// Polyfill WXT auto-imports
Object.assign(globalThis, {
  ref, computed, watch, onMounted, onUnmounted, readonly
})

// Reset state between tests
beforeEach(() => {
  memStore.reset()
})
```

**Test patterns:**
```typescript
describe('Composable', () => {
  it('returns translated value', () => {
    const { result } = renderComposable(() => useAppI18n())
    expect(result.current.t('key')).toBe('translated')
  })
})

describe('Store', () => {
  it('adds item and persists', async () => {
    const store = useItemsStore()
    await store.addItem(item)
    expect(store.items).toContainEqual(item)
  })
})
```

## Linting Configuration (Antfu ESLint)

```javascript
// eslint.config.js (NO SEMICOLONS!)

export default antfu({
  vue: true,
  typescript: true,

  rules: {
    'no-console': ['warn', { allow: ['debug', 'error', 'warn'] }],
    'no-undef': 'off',  // Browser globals
  },

  ignores: ['**/node_modules/**', '**/.output/**'],
})
```

**Key Patterns Enforced:**
- NO SEMICOLONS
- Multi-line attributes on separate lines
- Imports sorted by type
- Regex patterns at module scope
- Max 1 statement per line

## Storage Sync Pattern

```typescript
// src/utils/storage.ts

export const itemsStorage = storage.defineItem<Item[]>(
  'local:items',
  { fallback: [] }
)

export const settingsStorage = storage.defineItem<Settings>(
  'sync:settings',  // Use 'sync:' for cross-device
  { fallback: { language: 'en', theme: 'auto' } }
)
```

**Cross-context sync:**
```typescript
// In any entrypoint
settingsStorage.watch((newSettings) => {
  // Auto-called when ANY context updates storage
  applySettings(newSettings)
})
```

## Manifest Configuration

```typescript
// wxt.config.ts

manifest: {
  name: '__MSG_extName__',         // i18n key
  description: '__MSG_extDescription__',
  default_locale: 'en',
  version: '1.0.0',

  permissions: [
    'storage',      // Storage operations
    'activeTab',    // Current tab access
    'sidePanel',    // For side panel
    'scripting',    // Content script injection
  ],

  host_permissions: ['<all_urls>'],

  side_panel: {
    default_path: 'sidepanel.html',
  },

  action: {
    default_title: '__MSG_extName__',
    default_popup: 'popup.html',
  },
}
```

## Performance & Build Tips

**Module-level regex (avoid recreation):**
```typescript
// BAD — recreated on every call
export function getDomain(url: string): string {
  return new URL(url).hostname.replace(/^www\./, '')
}

// GOOD — created once at module load
const PREFIX_REGEX = /^www\./

export function getDomain(url: string): string {
  return new URL(url).hostname.replace(PREFIX_REGEX, '')
}
```

**Build optimization:**
```bash
yarn lint:fix    # Fix linting issues
yarn test        # Verify tests pass
yarn wxt build   # Optimized build
```

Build output: minified JS, optimized assets, processed manifest, checked size.

## Dependency Management

**Recommended versions (tested & working):**
- Vue 3.4.0+
- Nuxt UI 4.6.0+
- @antfu/eslint-config 8.0.0+
- WXT 0.20.20+
- Vitest 4.1.2+
- TypeScript 6.0.2+

**Convention:**
- Dependencies use `^` for patch updates
- Update Nuxt UI monthly for bug fixes
- Update TypeScript quarterly

## Common Patterns Summary

| Pattern | File | Reason |
|---------|------|--------|
| Runtime i18n | `composables/useAppI18n.ts` | `browser.i18n` cannot switch at runtime |
| Multi-context state | `stores/items.ts` | Reactive + storage sync |
| Pure presentation | `components/EmptyState.vue` | Reusable, testable |
| Module regex | `utils/helpers.ts` | Avoid regex recreation |
| Storage watch | `entrypoints/*` | Cross-page sync |
| Global setup | `test/setup.ts` | Polyfill auto-imports |
| Linting | `eslint.config.js` | Antfu standard |

## Debugging Tips

**Linting issues:**
```bash
yarn lint        # Full output
yarn lint:fix    # Auto-fix
eslint . --rule "style/semi"  # Specific rule
```

**Test failures - "Cannot create property null":**
- Verify `test/setup.ts` polyfills all Vue globals
- Check `beforeEach()` resets store state
- Ensure Pinia store initialized

**i18n not syncing across pages:**
- Verify `settingsStorage.watch()` attached ONCE per context
- Check storage is set to `'sync:'` area
- Confirm `onMounted()` in useAppI18n runs on each page load

