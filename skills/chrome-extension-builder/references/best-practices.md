# Chrome Extension Best Practices with WXT

Security, performance, and architecture recommendations.

## UI Conventions

### Always Externalize User-Visible Strings (i18n)

Every string shown to the user must come from the locale files — no hardcoded text in templates.

**Important distinction**: Use `@wxt-dev/i18n` (`import { i18n } from '#i18n'`) for manifest/CSS strings. For Vue UI strings, use `useAppI18n` when you need runtime locale switching:

```vue
<!-- ✅ Correct — runtime-switchable via useAppI18n composable -->
<script setup lang="ts">
import { useAppI18n } from '../../composables/useAppI18n';
const { t } = useAppI18n()
</script>

<template>
  <span>{{ t('extName') }}</span>
  <UButton>{{ t('save') }}</UButton>
</template>
```

```vue
<!-- ❌ Wrong — hardcoded text; cannot be translated -->
<span>My Extension</span>
<UButton>Save</UButton>
```

This rule applies to: button labels, section headings, descriptions, placeholders, alt attributes, aria-labels, and toast messages.

### Use Semantic Color Tokens, Not Manual Dark-Mode Pairs

Never write `text-gray-X dark:text-gray-Y` or `bg-white dark:bg-gray-800`. Use Nuxt UI v4 semantic tokens that adapt automatically:

```vue
<!-- ❌ Wrong — manual dark mode -->
<p class="text-gray-500 dark:text-gray-400">Subtitle</p>
<div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">

<!-- ✅ Correct — semantic tokens -->
<p class="text-muted">Subtitle</p>
<div class="bg-elevated border border-default">
```

| Token | Purpose |
|---|---|
| `text-default` | Primary body text |
| `text-muted` | Secondary/helper text |
| `text-dimmed` | Placeholder/very subtle |
| `bg-elevated` | Floating surfaces |
| `bg-muted` | Subtle fills |
| `border-default` | Standard borders |

### USelect — Use `items` Prop (v4 API)

In Nuxt UI v4, `USelect` uses the `items` prop. The v3 API (`options`, `option-attribute`, `value-attribute`) no longer exists:

```vue
<!-- ❌ Wrong (v3 API) -->
<USelect :options="list" option-attribute="label" value-attribute="value" />

<!-- ✅ Correct (v4 API) -->
<USelect :items="list" />
<!-- items: Array<{ label: string; value: string }> or string[] -->
```

### UModal — Use `title` Prop for Simple Headers

Pass the header title via the `title` prop instead of using a `#header` slot just for a title text. Use `v-model:open` for programmatic show/hide:

```vue
<!-- ❌ Unnecessary #header slot for a plain title -->
<UModal v-model:open="show">
  <template #header><h2>Delete All?</h2></template>
  ...
</UModal>

<!-- ✅ Correct — title prop + body/footer slots -->
<UModal v-model:open="show" :title="i18n.t('clearAll')">
  <template #body>...</template>
  <template #footer>...</template>
</UModal>
```

### UInput Width — Use `class` not `:ui root`

To set width on a `UInput`, use `class` directly. The `:ui="{ root: 'w-full' }"` pattern is the v3 API:

```vue
<!-- ❌ Wrong (v3 API) -->
<UInput :ui="{ root: 'w-full' }" />

<!-- ✅ Correct -->
<UInput class="w-full" />
```

### UMain — Use for Full-Page Entrypoints

Wrap the content of full-page views (options page) in `<UMain>` inside `<UApp>`. Skip it for constrained views (popup, side panel):

```vue
<!-- Options page — full page, use UMain -->
<UApp><UMain>...</UMain></UApp>

<!-- Popup or sidepanel — constrained size, UMain not needed -->
<UApp><div class="p-4 w-80">...</div></UApp>
```

### Logo in Headers (Use Asset PNG, not Icon Component)

Always import the extension logo as a Vite asset and use an `<img>` tag in headers. Never use a generic `UIcon` as a brand mark.

```typescript
// In any entrypoint SFC <script setup>
import logoUrl from '../../assets/icon.png'; // relative path from entrypoint folder
```

```vue
<!-- In template — next to the app name -->
<img :src="logoUrl" class="size-5 rounded" alt="My Extension" />
<span class="font-semibold text-sm">My Extension</span>
```

The `@wxt-dev/auto-icons` module reads `src/assets/icon.png` to generate all icon sizes for the manifest; the same file is separately importable by Vite as a URL.

### Color Mode — Use UColorModeSelect

Use `UColorModeSelect` on the options page instead of a manual `USelect` for theme. It manages light/dark/system automatically

```vue
<script setup lang="ts">

<template>
  <UFormField label="Theme" description="Applied immediately across all extension views.">
    <UColorModeSelect />
  </UFormField>
</template>
```

## Security

### Content Security Policy

Always configure CSP for extension pages:

```typescript
export default defineConfig({
  manifest: {
    content_security_policy: {
      extension_pages: "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'",
    },
  },
})
```

### Minimal Permissions

Request only necessary permissions:

```typescript
// Good - specific permissions
permissions: ['storage', 'activeTab']

// Bad - excessive permissions
permissions: ['<all_urls>', 'tabs', 'history', 'bookmarks']
```

Use `optional_permissions` for features that might not be needed:

```typescript
manifest: {
  permissions: ['storage'],
  optional_permissions: ['tabs', 'bookmarks'],
}
```

### Input Validation

Always sanitize user input:

```typescript
function sanitizeInput(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}
```

Use DOMPurify for HTML content:

```typescript
import DOMPurify from 'dompurify';

const clean = DOMPurify.sanitize(html, {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a'],
  ALLOWED_ATTR: ['href'],
})
```

### Secure API Calls

Never hardcode API keys:

```typescript
// Store in browser.storage, not in code
const { apiKey } = await browser.storage.local.get('apiKey')

const response = await fetch(url, {
  headers: {
    'Authorization': `Bearer ${apiKey}`,
  },
})
```

## Performance

### Service Worker Optimization

Keep service worker lightweight:

```typescript
export default defineBackground({
  main() {
    // Use alarms for long delays
    browser.alarms.create('daily-sync', {
      periodInMinutes: 1440,
    })

    // Unregister listeners when not needed
    let listener: any

    function enable() {
      listener = (msg: any) => handleMessage(msg)
      browser.runtime.onMessage.addListener(listener)
    }

    function disable() {
      if (listener) {
        browser.runtime.onMessage.removeListener(listener)
        listener = null
      }
    }
  },
})
```

### Lazy Loading

Load heavy dependencies only when needed:

```typescript
export default defineContentScript({
  matches: ['*://*.example.com/*'],

  async main(ctx) {
    // Wait for user interaction before mounting UI
    document.querySelector('#button')?.addEventListener('click', async () => {
      // Lazy load Vue and the component only when needed
      const { createApp } = await import('vue')
      const { default: App } = await import('./components/App.vue')
      const { default: nuxtUi } = await import('@nuxt/ui/vue-plugin')

      const container = document.getElementById('root')!
      const app = createApp(App)
      app.use(nuxtUi)
      app.mount(container)
    })
  },
})
```

### Bundle Splitting

Configure Vite for optimal chunks:

```typescript
export default defineConfig({
  vite: () => ({
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['vue', '@vue/runtime-core'],
            utils: ['date-fns', 'lodash-es'],
          },
        },
      },
    },
  }),
})
```

### Caching Strategy

Cache API responses appropriately:

```typescript
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

async function getCachedData(key: string) {
  const cached = await storage.getItem<{data: any, timestamp: number}>(`cache:${key}`)

  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data
  }

  const freshData = await fetchData(key)
  await storage.setItem(`cache:${key}`, {
    data: freshData,
    timestamp: Date.now(),
  })

  return freshData
}
```

## Architecture

### File Organization

```
src/
├── entrypoints/
│   ├── background/          # Complex background logic
│   │   ├── index.ts
│   │   ├── handlers.ts
│   │   └── utils.ts
│   ├── content/            # Complex content script
│   │   ├── index.ts
│   │   ├── Content.vue     # Root content script component
│   │   └── injector.ts
│   └── popup/              # Popup UI
│       ├── index.html
│       ├── main.ts
│       └── App.vue
├── components/             # Shared UI components (auto-imported)
│   ├── SettingsPanel.vue
│   └── StatusBadge.vue
├── composables/            # Auto-imported Vue composables
│   ├── useStorage.ts
│   └── useSettings.ts
├── utils/                  # Auto-imported utilities
│   ├── storage.ts
│   ├── messaging.ts
│   └── api.ts
└── types/                  # TypeScript types
    └── index.ts
```

### Type-Safe Communication

Define message interfaces:

```typescript
// types/messages.ts
export interface MessageMap {
  'fetch-data': {
    request: { url: string }
    response: { data: any }
  }
  'save-settings': {
    request: { settings: Record<string, any> }
    response: { success: boolean }
  }
}

// utils/messaging.ts
export async function sendMessage<K extends keyof MessageMap>(
  type: K,
  payload: MessageMap[K]['request']
): Promise<MessageMap[K]['response']> {
  return await browser.runtime.sendMessage({ type, payload })
}
```

### Error Handling

Implement comprehensive error handling:

```typescript
// utils/errors.ts
export class ExtensionError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: any
  ) {
    super(message)
    this.name = 'ExtensionError';
  }
}

// Usage
try {
  await riskyOperation()
} catch (error) {
  if (error instanceof ExtensionError) {
    // Handle known error
    console.error(`Error ${error.code}:`, error.message, error.context)
  } else {
    // Handle unknown error
    console.error('Unexpected error:', error)
  }

  // Report to user
  await browser.notifications.create({
    type: 'basic',
    title: 'Error',
    message: 'Something went wrong',
  })
}
```

### State Management

For complex shared state, use Pinia — Vue's official state management. Integrate with WXT storage for persistence:

```bash
pnpm i pinia
```

```typescript
// stores/settings.ts
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { storage } from '#imports';

interface UserSettings {
  theme: 'light' | 'dark' | 'auto';
  notifications: boolean
}

const settingsItem = storage.defineItem<UserSettings>('local:settings', {
  fallback: { theme: 'auto', notifications: true },
})

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<UserSettings>({ theme: 'auto', notifications: true })
  const isLoaded = ref(false)

  async function load() {
    settings.value = await settingsItem.getValue()
    // Keep in sync with storage changes
    settingsItem.watch((newValue) => {
      if (newValue) settings.value = newValue
    })
    isLoaded.value = true
  }

  async function update(updates: Partial<UserSettings>) {
    settings.value = { ...settings.value, ...updates }
    await settingsItem.setValue(settings.value)
  }

  return { settings, isLoaded, load, update }
})
```

Usage in Vue components — Pinia stores are auto-imported like composables:

```vue
<script setup lang="ts">
const store = useSettingsStore()
onMounted(() => store.load())
</script>

<template>
  <USwitch v-model="store.settings.notifications" label="Notifications" />
</template>
```

## Testing

### Unit Tests

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/test/**/*.test.ts'],
    globals: true,
  },
})
```

**Critical: `src/test/setup.ts` must polyfill Vue and WXT globals**

WXT auto-imports `ref`, `computed`, `onMounted`, etc. in extension code but Vitest does not. Without polyfilling them, any store or composable that uses Vue reactivity without explicit imports will throw `ReferenceError: ref is not defined`.

```typescript
// src/test/setup.ts
import { vi, beforeEach } from 'vitest';
import { ref, computed, watch, watchEffect, onMounted, onUnmounted, readonly } from 'vue';

// Polyfill Vue auto-imports — required because WXT auto-imports these in
// entrypoints/components, but Vitest runs without WXT's transform pipeline.
Object.assign(globalThis, { ref, computed, watch, watchEffect, onMounted, onUnmounted, readonly })

// In-memory storage mock for WXT's storage global
const memStore: Record<string, unknown> = {}

// Reset storage between every test — prevents state leaking across tests
beforeEach(() => {
  for (const key in memStore) delete memStore[key]
})

const mockStorageItem = <T>(key: string, fallback: T) => ({
  getValue: vi.fn(async () => (memStore[key] as T) ?? fallback),
  setValue: vi.fn(async (val: T) => { memStore[key] = val; }),
  watch: vi.fn(() => () => {}),
  removeValue: vi.fn(async () => { delete memStore[key]; }),
})

Object.assign(globalThis, {
  storage: {
    defineItem: vi.fn((key: string, opts: { fallback?: unknown }) =>
      mockStorageItem(key, opts?.fallback)
    ),
  },
  browser: {
    runtime: { sendMessage: vi.fn(), onMessage: { addListener: vi.fn() } },
    storage: {
      local: { get: vi.fn(), set: vi.fn() },
      sync: { get: vi.fn(), set: vi.fn() },
    },
    tabs: { query: vi.fn(async () => [{ id: 1, url: 'https://example.com' }]) },
  },
})
```

> If you skip the `beforeEach` cleanup of `memStore`, tests that write to storage will leak state into subsequent tests, causing intermittent failures.

### E2E Tests

```typescript
// e2e/extension.spec.ts
import { test, expect } from '@playwright/test';

test('popup loads correctly', async ({ page, extensionId }) => {
  await page.goto(`chrome-extension://${extensionId}/popup.html`)
  await expect(page.locator('h1')).toHaveText('My Extension')
})
```

## ESLint Setup

Use the `@antfu/eslint-config` flat config for zero-config Vue + TypeScript linting:

```bash
yarn add -D eslint @antfu/eslint-config
```

Create `eslint.config.js` at the project root:

```javascript
import antfu from '@antfu/eslint-config';

export default antfu({
  vue: true,
  typescript: true,
  rules: {
    'no-console': ['warn', { allow: ['debug', 'error', 'warn'] }],
    'no-undef': 'off', // WXT globals (browser, defineBackground, etc.) handled by tsconfig
  },
  ignores: ['**/node_modules/**', '**/.output/**', '**/.wxt/**', '**/dist/**'],
})
```

Add scripts to `package.json`:

```json
{
  "scripts": {
    "lint": "eslint .",
    "lint:fix": "eslint . --fix"
  }
}
```

## Deployment

### Version Management

Use semantic versioning:

```json
{
  "version": "1.0.0"  // MAJOR.MINOR.PATCH
}
```

### Store Submission Checklist

- [ ] Icons provided (16, 32, 48, 128)
- [ ] Permissions justified in description
- [ ] Privacy policy provided (if handling user data)
- [ ] Screenshot and promotional images
- [ ] Tested on target browsers
- [ ] No hardcoded secrets
- [ ] CSP properly configured
- [ ] Manifest complete and valid

### CI/CD Pipeline

```yaml
# .github/workflows/release.yml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - run: npm ci
      - run: npm run build
      - run: npm run zip:all

      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: extensions
          path: .output/*.zip
```
