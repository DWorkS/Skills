# Vue 3 + Nuxt UI Integration with WXT

Complete guide for building Chrome extensions with Vue 3 and Nuxt UI.

## Setup

### Install Dependencies

```bash
npm create wxt@latest -- --template vue-ts
cd my-extension

# Nuxt UI v4 (works with plain Vue/Vite — Nuxt not required)
npm install @nuxt/ui tailwindcss

# WXT Vue module
npm install -D @wxt-dev/module-vue
```

### Configure wxt.config.ts

```typescript
import { defineConfig } from 'wxt';
import ui from '@nuxt/ui/vite';

export default defineConfig({
  modules: ['@wxt-dev/module-vue'],

  vite: () => ({
    plugins: [
      ui({
        router: false,   // Extensions don't use vue-router
        colorMode: true, // Enable dark/light mode via @vueuse/core
      }),
    ],
  }),

  manifest: {
    name: 'My Extension',
    permissions: ['storage', 'activeTab'],
  },
})
```

### CSS — Single Shared File for All Entrypoints

Create one CSS file in `assets/` and import it in every entrypoint's `main.ts`. **Do not** create a per-entrypoint `style.css`.

```css
/* src/assets/main.css */
@import "tailwindcss";
@import "@nuxt/ui";

@theme {
  /* Custom design tokens — see wxt.config.ts ui.colors for semantic aliases */
}
```

Import in each entrypoint's `main.ts` (adjust `../../` depth to your entrypoint folder):

```typescript
import '../../assets/main.css'; // src/entrypoints/popup/main.ts
```

### TypeScript Config

Nuxt UI generates type declaration files for auto-imports. Add them to your `tsconfig.json`:

```json
{
  "include": ["src/**/*.ts", "src/**/*.vue", "auto-imports.d.ts", "components.d.ts"],
  "compilerOptions": {
    "paths": {
      "#build/ui/*": ["./node_modules/.nuxt-ui/ui/*"]
    }
  }
}
```

Add to `.gitignore`:

```
auto-imports.d.ts
components.d.ts
```

---

## Entry Point Patterns

### Popup with Vue + Nuxt UI

**Directory structure:**

```
src/entrypoints/popup/
├── index.html
├── main.ts         # App entry — createApp + ui plugin
└── App.vue         # Root component with UApp wrapper
```

**entrypoints/popup/index.html:**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Extension Popup</title>
</head>
<body>
  <div id="app" class="isolate"></div>
  <script type="module" src="./main.ts"></script>
</body>
</html>
```

**src/entrypoints/popup/main.ts:**

```typescript
import { createApp } from 'vue';
import ui from '@nuxt/ui/vue-plugin';
import App from './App.vue';
import '../../assets/main.css'; // shared CSS

const app = createApp(App)
app.use(ui)
app.mount('#app')
```

**entrypoints/popup/App.vue:**

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue';

const settings = ref<Record<string, any>>({})
const loading = ref(true)

onMounted(async () => {
  const result = await browser.storage.local.get('settings')
  settings.value = result.settings ?? {}
  loading.value = false
})

async function handleSave() {
  await browser.storage.local.set({ settings: settings.value })
}
</script>

<template>
  <UApp>
    <div class="p-4 w-80 min-h-[200px]">
      <USkeleton v-if="loading" class="h-32 w-full" />
      <template v-else>
        <div class="flex items-center justify-between mb-4">
          <h1 class="text-lg font-semibold">My Extension</h1>
          <UBadge color="success" variant="subtle">Active</UBadge>
        </div>
        <!-- Your UI content here -->
        <UButton block @click="handleSave">Save Settings</UButton>
      </template>
    </div>
  </UApp>
</template>
```

---

### Options Page with Vue + Nuxt UI

**src/entrypoints/options/App.vue:**

Wrap the options page content in `<UMain>` (inside `<UApp>`) to emit a semantic `<main>` element. This is appropriate for full-page views like the options page but not for constrained views like the popup or side panel.

**Critical**: Form fields must be populated from storage on `onMounted`. Hardcoding defaults in `ref({})` means the form always shows defaults regardless of what the user saved. If using a Pinia store, `await store.init()` before reading values.

```vue
<script setup lang="ts">
import { useAppI18n } from '../../composables/useAppI18n';
import logoUrl from '../../assets/icon.png';

const { t, locale, setLocale, availableLocales } = useAppI18n()

// ── Store ────────────────────────────────────────────────────────────────
const store = useSettingsStore() // your Pinia store

// ── Form state — MUST be loaded from storage, not hardcoded defaults ────
const form = ref({ notifications: true, maxItems: 500 })

onMounted(async () => {
  // Always await store init before reading settings into form
  await store.init()
  if (store.settings) {
    form.value.notifications = store.settings.notifications
    form.value.maxItems = store.settings.maxItems
  }
})

async function handleSave() {
  await store.saveSettings(form.value)
}
</script>

<template>
  <UApp>
    <UMain>
      <div class="max-w-2xl mx-auto p-6 space-y-6">
        <!-- Logo + Page title -->
        <div class="flex items-center gap-3">
          <img :src="logoUrl" class="size-8 rounded-xl" :alt="t('extName')" />
          <h1 class="text-2xl font-bold">{{ t('extName') }}</h1>
        </div>

        <!-- Appearance: theme + language -->
        <UCard>
          <div class="space-y-4">
            <UFormField :label="t('theme')" :description="t('themeDesc')">
              <!-- UColorModeSelect is self-managing — no v-model needed -->
              <UColorModeSelect />
            </UFormField>

            <UFormField :label="t('language')">
              <!--
                ULocaleSelect REQUIRES :locales and :model-value.
                Shows nothing without them.
              -->
              <ULocaleSelect
                :model-value="locale"
                :locales="availableLocales"
                @update:model-value="(v) => setLocale(v as 'en' | 'de')"
              />
            </UFormField>
          </div>
        </UCard>

        <!-- Behaviour -->
        <UCard>
          <div class="space-y-4">
            <UFormField :label="t('notifications')" name="notifications">
              <USwitch v-model="form.notifications" />
            </UFormField>
            <UFormField :label="t('maxItems')">
              <UInput v-model.number="form.maxItems" type="number" class="w-32" />
            </UFormField>
          </div>
        </UCard>

        <UButton color="primary" @click="handleSave">{{ t('saveSettings') }}</UButton>
      </div>
    </UMain>
  </UApp>
</template>
```

---

### Content Script with Vue + Nuxt UI

Content scripts run in a shadow DOM for style isolation. Use `cssInjectionMode: 'ui'` so WXT injects Nuxt UI styles into the shadow root automatically.

**entrypoints/content/index.ts:**

```typescript
import { createApp } from 'vue';
import nuxtUi from '@nuxt/ui/vue-plugin';
import ContentApp from './ContentApp.vue';

export default defineContentScript({
  matches: ['*://*.example.com/*'],
  cssInjectionMode: 'ui',

  async main(ctx) {
    const shadowUi = await createShadowRootUi(ctx, {
      name: 'my-extension-overlay',
      position: 'overlay',
      anchor: 'body',

      onMount(container) {
        const app = createApp(ContentApp)
        app.use(nuxtUi)
        app.mount(container)
        return app
      },

      onRemove(app) {
        app?.unmount()
      },
    })

    shadowUi.mount()
  },
})
```

**entrypoints/content/ContentApp.vue:**

```vue
<script setup lang="ts">
import { ref } from 'vue';

const visible = ref(false)
</script>

<template>
  <UApp>
    <div class="fixed bottom-4 right-4 z-[2147483647]">
      <UButton
        :icon="visible ? 'i-lucide-x' : 'i-lucide-panel-right'"
        color="primary"
        @click="visible = !visible"
      />

      <UCard v-if="visible" class="mt-2 w-72 shadow-xl">
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="font-semibold text-sm">Extension Panel</h3>
            <UButton
              icon="i-lucide-x"
              variant="ghost"
              size="xs"
              @click="visible = false"
            />
          </div>
        </template>

        <p class="text-sm">This panel is injected into the page!</p>
      </UCard>
    </div>
  </UApp>
</template>
```

---

### Side Panel with Vue + Nuxt UI

```typescript
// src/entrypoints/sidepanel/main.ts
import { createApp } from 'vue';
import ui from '@nuxt/ui/vue-plugin';
import App from './App.vue';
import '../../assets/main.css'; // shared CSS

const app = createApp(App)
app.use(ui)
app.mount('#app')
```

Enable the side panel in your background script:

```typescript
// entrypoints/background.ts
export default defineBackground(() => {
  browser.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
})
```

---

## Vue Composables for Extensions

### useStorage — Reactive Storage

Wraps `browser.storage` with Vue reactivity and automatic cleanup:

```typescript
// composables/useStorage.ts
import { ref, onMounted, onUnmounted } from 'vue';

export function useStorage<T>(
  key: string,
  defaultValue: T,
  area: 'local' | 'sync' = 'local'
) {
  const value = ref<T>(defaultValue)
  const loading = ref(true)

  function onChanged(
    changes: Record<string, chrome.storage.StorageChange>,
    changedArea: string
  ) {
    if (changedArea === area && key in changes) {
      value.value = changes[key].newValue ?? defaultValue
    }
  }

  onMounted(async () => {
    const result = await browser.storage[area].get(key)
    if (result[key] !== undefined) value.value = result[key]
    loading.value = false
    browser.storage.onChanged.addListener(onChanged)
  })

  onUnmounted(() => {
    browser.storage.onChanged.removeListener(onChanged)
  })

  async function setValue(newValue: T) {
    await browser.storage[area].set({ [key]: newValue })
    value.value = newValue
  }

  return { value, setValue, loading: loading as Readonly<typeof loading> }
}
```

**Usage:**

```vue
<script setup lang="ts">
const { value: theme, setValue: setTheme, loading } = useStorage('theme', 'system')
</script>

<template>
  <USkeleton v-if="loading" class="h-8 w-32" />
  <USelect
    v-else
    v-model="theme"
    :items="[
      { label: 'System', value: 'system' },
      { label: 'Light', value: 'light' },
      { label: 'Dark', value: 'dark' },
    ]"
    @update:model-value="setTheme"
  />
</template>
```

### useMessage — Type-Safe Message Listener

```typescript
// composables/useMessage.ts
import { onMounted, onUnmounted } from 'vue';

type MessageHandler<T = any> = (
  message: T,
  sender: chrome.runtime.MessageSender
) => any | Promise<any>

export function useMessage<T = any>(type: string, handler: MessageHandler<T>) {
  function listener(
    message: any,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: any) => void
  ) {
    if (message.type === type) {
      Promise.resolve(handler(message.payload, sender))
        .then(sendResponse)
        .catch((err) => sendResponse({ error: err.message }))
      return true // Keep channel open for async response
    }
  }

  onMounted(() => browser.runtime.onMessage.addListener(listener))
  onUnmounted(() => browser.runtime.onMessage.removeListener(listener))
}
```

**Usage:**

```vue
<script setup lang="ts">
// Responds to messages of type 'get-tab-info'
useMessage('get-tab-info', async (_payload, sender) => {
  return { tabId: sender.tab?.id, url: sender.tab?.url }
})
</script>
```

### useCurrentTab — Active Tab Info

```typescript
// composables/useCurrentTab.ts
import { ref, onMounted } from 'vue';

export function useCurrentTab() {
  const tab = ref<browser.tabs.Tab | null>(null)
  const loading = ref(true)

  onMounted(async () => {
    const [activeTab] = await browser.tabs.query({
      active: true,
      currentWindow: true,
    })
    tab.value = activeTab ?? null
    loading.value = false
  })

  return { tab, loading }
}
```

---

## Nuxt UI Theming

### Global Color Configuration

Pass theme options to the Nuxt UI Vite plugin in `wxt.config.ts`:

```typescript
ui({
  router: false,
  ui: {
    colors: {
      primary: 'rose',
      neutral: 'neutral',
    },
  },
})
```

### Custom CSS Variables

Override design tokens in your CSS file:

```css
@import "tailwindcss";
@import "@nuxt/ui";

@theme {
  --font-sans: 'Inter', system-ui, sans-serif
  --color-green-400: #00DC82; /* Custom Nuxt green */
}
```

### UModal — Use `title` Prop and `v-model:open`

In Nuxt UI v4, use the `title` prop for the modal header text instead of a custom `#header` slot. Control visibility with `v-model:open`:

```vue
<script setup lang="ts">
import { i18n } from '#i18n';
const showConfirm = ref(false)
</script>

<template>
  <!-- Trigger button — open programmatically -->
  <UButton color="error" variant="outline" @click="showConfirm = true">
    {{ i18n.t('clearAll') }}
  </UButton>

  <UModal v-model:open="showConfirm" :title="i18n.t('clearAll')">
    <template #body>
      <p class="text-muted">{{ i18n.t('clearAllConfirm', store.items.length) }}</p>
    </template>
    <template #footer>
      <div class="flex gap-2 justify-end">
        <UButton variant="ghost" @click="showConfirm = false">{{ i18n.t('cancel') }}</UButton>
        <UButton color="error" @click="handleClear">{{ i18n.t('confirmDelete') }}</UButton>
      </div>
    </template>
  </UModal>
</template>
```

---

## Semantic Color Tokens

Nuxt UI v4 with Tailwind v4 provides semantic utility classes that automatically adapt to light/dark mode. Use these instead of manual `text-gray-X dark:text-gray-Y` pairs:

| Semantic token | Replaces | Use for |
|---|---|---|
| `text-default` | `text-gray-900 dark:text-white` | Primary body text |
| `text-muted` | `text-gray-500 dark:text-gray-400` | Secondary/helper text |
| `text-dimmed` | `text-gray-400 dark:text-gray-600` | Placeholder/very subtle text |
| `text-highlighted` | `text-gray-900 dark:text-white font-medium` | Emphasized text |
| `bg-default` | `bg-white dark:bg-gray-900` | Default page/card background |
| `bg-elevated` | `bg-white dark:bg-gray-800` | Floating surfaces (modals, popovers) |
| `bg-muted` | `bg-gray-100 dark:bg-gray-800` | Subtle background fills |
| `border-default` | `border-gray-200 dark:border-gray-700` | Standard borders |
| `divide-default` | `divide-gray-200 dark:divide-gray-700` | Table/list dividers |

**Example — before and after:**

```vue
<!-- Before (manual dark mode) -->
<div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
  <p class="text-gray-900 dark:text-white">Title</p>
  <p class="text-gray-500 dark:text-gray-400">Subtitle</p>
</div>

<!-- After (semantic tokens) -->
<div class="bg-elevated border border-default">
  <p class="text-default">Title</p>
  <p class="text-muted">Subtitle</p>
</div>
```

---

### Component Customization via `ui` Prop

Every Nuxt UI component accepts a `ui` prop for scoped class overrides:

```vue
<UButton
  :ui="{
    base: 'rounded-full',
    color: { primary: { solid: 'bg-rose-600 hover:bg-rose-700' } },
  }"
>
  Custom Button
</UButton>
```

---

## Key Nuxt UI Components for Extensions

Reference for the most useful components in extension UIs:

### Layout & Structure

| Component | Use case |
|-----------|----------|
| `UApp` | **Required** root wrapper — enables Toast, Tooltip, and overlays |
| `UMain` | Semantic `<main>` element — use in full-page views (options page) |
| `UCard` | Content containers with header/body/footer slots |
| `UTabs` | Multi-section popup navigation |
| `UAccordion` | Collapsible settings sections |
| `USeparator` | Dividers between sections |

### Form Elements

| Component | Use case |
|-----------|----------|
| `UForm` + `UFormField` | Validated forms with error display |
| `UInput` | Text, password, search inputs |
| `UTextarea` | Multi-line text input |
| `USelect` / `USelectMenu` | Dropdowns and searchable selects |
| `USwitch` | Toggle settings (notifications, features) |
| `UCheckbox` / `UCheckboxGroup` | Multi-option settings |
| `URadioGroup` | Single-choice settings |
| `USlider` | Numeric range settings |
| `UInputNumber` | Numeric inputs with +/- controls |

### Feedback & Status

| Component | Use case |
|-----------|----------|
| `UButton` | Primary actions, icon-only buttons |
| `UBadge` | Status indicators, counters |
| `UAlert` | Inline info/warning/error messages |
| `useToast()` + `UToast` | Success/error notifications (requires `UApp`) |
| `USkeleton` | Loading placeholders |
| `UProgress` | Progress indicators |

### Overlays

| Component | Use case |
|-----------|----------|
| `UModal` | Confirmations, detailed views |
| `UPopover` | Contextual help tooltips |
| `UTooltip` | Hover labels for icon buttons |
| `UDropdownMenu` | Context menus, action menus |

### Icons

Nuxt UI uses Iconify with 200k+ icons. Use the `UIcon` component or the `icon` prop on buttons:

```vue
<!-- Icon component -->
<UIcon name="i-lucide-settings" class="w-5 h-5" />

<!-- Button with icon -->
<UButton icon="i-lucide-download" label="Download" />
<UButton icon="i-heroicons-cog-6-tooth" variant="ghost" />

<!-- Badge with icon -->
<UBadge icon="i-lucide-check" color="success">Done</UBadge>
```

Popular icon sets:
- `i-lucide-*` — Lucide Icons (clean, consistent)
- `i-heroicons-*` — Heroicons (Tailwind team)
- `i-mdi-*` — Material Design Icons
- `i-ph-*` — Phosphor Icons

---

## Built-in Options Components

### UColorModeSelect — Theme Switching

`UColorModeSelect` is a built-in Nuxt UI component that handles theme switching (light/dark/system) automatically. Use it on the options page instead of a manual `USelect`:

```vue
<script setup lang="ts">
import { i18n } from '#i18n';
</script>

<template>
  <UFormField :label="i18n.t('settings.theme')"
    :description="i18n.t('settings.themeDesc')">
    <!-- Manages light/dark/system mode automatically -->
    <UColorModeSelect />
  </UFormField>
</template>
```

It manages its own state via `@vueuse/core`'s `useColorMode()` internally — no manual binding needed.

### ULocaleSelect — Language Switching

`ULocaleSelect` is a Nuxt UI component that renders a language picker. **It does NOT auto-detect locales** — you must provide `:locales` (array of `{ code, name }` objects) and `v-model` explicitly. Without these props, the component renders as an empty select box.

**It is also NOT connected to `@wxt-dev/i18n` or `browser.i18n`** — you must wire it up to your own locale state. For WXT extensions, this means using a custom composable (see [i18n.md — Runtime Locale Switching](i18n.md)).

```vue
<script setup lang="ts">
// You must provide BOTH :locales and v-model to ULocaleSelect
import { useAppI18n } from '../../composables/useAppI18n';
const { t, locale, setLocale, availableLocales } = useAppI18n()
// availableLocales = [{ code: 'en', name: 'English' }, { code: 'de', name: 'Deutsch' }]
</script>

<template>
  <UFormField :label="t('language')">
    <ULocaleSelect
      :model-value="locale"
      :locales="availableLocales"
      @update:model-value="(v) => setLocale(v as 'en' | 'de')"
    />
  </UFormField>
</template>
```

The component automatically shows flag emojis next to each locale (derived from country codes).

> `UColorModeSelect` manages dark/light/system mode automatically and requires no props. `ULocaleSelect` is the opposite — it requires explicit `:locales` and `v-model`.

---

## State Management with Pinia

For complex cross-entrypoint state, use Pinia (Vue's official store):

```bash
npm install pinia
```

```typescript
// stores/settings.ts
import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useSettingsStore = defineStore('settings', () => {
  const theme = ref<'system' | 'light' | 'dark'>('system')
  const notifications = ref(true)

  async function load() {
    const result = await browser.storage.sync.get(['theme', 'notifications'])
    theme.value = result.theme ?? 'system';
    notifications.value = result.notifications ?? true
  }

  async function save() {
    await browser.storage.sync.set({
      theme: theme.value,
      notifications: notifications.value,
    })
  }

  return { theme, notifications, load, save }
})
```

Mount Pinia in each entrypoint's `main.ts`:

```typescript
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import ui from '@nuxt/ui/vue-plugin';
import App from './App.vue';
import './style.css';

const app = createApp(App)
app.use(createPinia())
app.use(ui)
app.mount('#app')
```

---

## Type-Safe Communication Between Entrypoints

```typescript
// types/messages.ts
export interface MessageMap {
  'get-tab-info': {
    request: Record<string, never>
    response: { tabId: number; url: string }
  }
  'save-settings': {
    request: { settings: Record<string, unknown> }
    response: { success: boolean }
  }
}

// utils/messaging.ts
import type { MessageMap } from '~/types/messages';

export async function sendMessage<K extends keyof MessageMap>(
  type: K,
  payload: MessageMap[K]['request']
): Promise<MessageMap[K]['response']> {
  return await browser.runtime.sendMessage({ type, payload })
}
```

Usage in a Vue component:

```vue
<script setup lang="ts">
import { sendMessage } from '~/utils/messaging';

async function fetchTabInfo() {
  const { tabId, url } = await sendMessage('get-tab-info', {})
  console.log('Current tab:', tabId, url)
}
</script>
```

---

## Routing in Popups (Multi-Page)

Web extensions require hash-mode routing. Use `vue-router` with `createWebHashHistory`:

```bash
npm install vue-router
```

```typescript
// entrypoints/popup/router.ts
import { createRouter, createWebHashHistory } from 'vue-router';
import Home from './pages/Home.vue';
import Settings from './pages/Settings.vue';

export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', component: Home },
    { path: '/settings', component: Settings },
  ],
})
```

```typescript
// entrypoints/popup/main.ts
import { createApp } from 'vue';
import ui from '@nuxt/ui/vue-plugin';
import App from './App.vue';
import { router } from './router';
import './style.css';

// Note: pass router: false to Nuxt UI since we handle routing ourselves
const app = createApp(App)
app.use(router)
app.use(ui)
app.mount('#app')
```

---

## Critical: Component State Management & Form Binding

### Independent Component State vs. Shared State

Each Vue component instance has its own isolated state. When binding form inputs with `v-model` to a component's local `ref`, updates only affect that specific component instance.

**Problem: Form changes not persisting across component re-renders**

```vue
<!-- BAD: Local ref not persisted -->
<script setup lang="ts">
const apiKey = ref('') // re-created on every render
const handleSave = async () => {
  await browser.storage.sync.set({ apiKey: apiKey.value })
}
</script>

<template>
  <UInput v-model="apiKey" type="password" />
  <UButton @click="handleSave">Save</UButton>
</template>
```

When the component re-renders, `ref()` is called again, creating a new state object. Any previous values are lost. This is why saved settings appear to disappear or don't persist correctly.

**Solution: Load state from browser.storage on mount, then persist on change**

```vue
<!-- GOOD: Load from storage on mount, persist on save -->
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useDebounce } from '@vueuse/core';

const apiKey = ref('')
const isSaving = ref(false)

// Load from persistent storage on mount
onMounted(async () => {
  const result = await browser.storage.sync.get('apiKey')
  apiKey.value = result.apiKey ?? '';
})

// Auto-save on change (debounced to avoid excessive writes)
const debouncedSave = useDebounce(async () => {
  isSaving.value = true
  try {
    await browser.storage.sync.set({ apiKey: apiKey.value })
  } finally {
    isSaving.value = false
  }
}, 500)

// Trigger auto-save on input
const handleInput = () => debouncedSave()
</script>

<template>
  <UInput
    v-model="apiKey"
    type="password"
    @input="handleInput"
    :disabled="isSaving"
    placeholder="Enter API key"
  />
  <USkeleton v-if="isSaving" class="h-5 w-32 mt-2" />
</template>
```

### Why `v-model` Alone Isn't Enough

`v-model` in Vue provides two-way binding **within a component instance**, but it doesn't connect to external state like browser storage:

```
┌─────────────────────────────────────────┐
│  Component Instance                      │
│  ┌──────────────────────────────────┐   │
│  │  Local ref (lost on re-render)   │   │
│  │  ↕ v-model binding               │   │
│  │  <UInput />                      │   │
│  └──────────────────────────────────┘   │
│                                         │
│  ⚠️  NOT connected to browser.storage    │
└─────────────────────────────────────────┘
```

### Pattern: Form Loading from Pinia Store

When using a Pinia store as the source of truth, always `await store.init()` before populating form fields. The store's `init()` is async because it reads from storage — form values bound before `init()` completes will show hardcoded defaults:

```vue
<script setup lang="ts">
const store = useSettingsStore()

// ❌ WRONG: form sees default values, not stored values
const form = ref({ maxItems: 500, notifications: true }) // hardcoded
onMounted(() => store.init()) // async but result never copied to form

// ✅ CORRECT: await init then populate form
const form = ref({ maxItems: 500, notifications: true }) // safe defaults
onMounted(async () => {
  await store.init()
  if (store.settings) {
    form.value.maxItems = store.settings.maxItems
    form.value.notifications = store.settings.notifications
  }
})
</script>
```

### Pattern: Reactive Storage Composable

For clean, reusable state that persists automatically, create a composable wrapper around browser.storage:

```typescript
// composables/usePersistedState.ts
import { ref, watch, onMounted, onUnmounted, type Ref } from 'vue';

export function usePersistedState<T>(
  key: string,
  defaultValue: T,
  area: 'local' | 'sync' = 'sync'
): { value: Ref<T>; loading: Ref<boolean>; clear: () => Promise<void> } {
  const value = ref<T>(defaultValue)
  const loading = ref(true)

  // Load value from storage on mount
  onMounted(async () => {
    const result = await browser.storage[area].get(key)
    value.value = result[key] ?? defaultValue
    loading.value = false
  })

  // Watch for changes in this window and sync updates
  const onChanged = (
    changes: Record<string, any>,
    changedArea: string
  ) => {
    if (changedArea === area && key in changes) {
      value.value = changes[key].newValue ?? defaultValue
    }
  }

  onMounted(() => browser.storage.onChanged.addListener(onChanged))
  onUnmounted(() => browser.storage.onChanged.removeListener(onChanged))

  // Auto-save on change
  watch(
    value,
    async (newValue) => {
      await browser.storage[area].set({ [key]: newValue })
    },
    { deep: true }
  )

  async function clear() {
    await browser.storage[area].remove(key)
    value.value = defaultValue
  }

  return { value, loading, clear }
}
```

**Usage:**

```vue
<script setup lang="ts">
import { usePersistedState } from '~/composables/usePersistedState';

const { value: apiKey, loading } = usePersistedState('apiKey', '')
const { value: isEnabled, loading: loadingEnabled } = usePersistedState('isEnabled', false)
</script>

<template>
  <div v-if="loading || loadingEnabled" class="space-y-2">
    <USkeleton class="h-10 w-full" />
  </div>
  <div v-else class="space-y-4">
    <!-- Direct v-model binding now syncs with browser.storage -->
    <UFormField label="API Key">
      <UInput v-model="apiKey" type="password" />
    </UFormField>
    <UFormField label="Enable Feature">
      <USwitch v-model="isEnabled" />
    </UFormField>
  </div>
</template>
```

Now `v-model` works because `usePersistedState` ensures the ref is populated from storage on mount and automatically synced on every change.

### Debugging State Issues

**Check if state is loading from storage:**

```vue
<script setup lang="ts">
const { value: setting, loading } = usePersistedState('mySetting', 'default')

// In browser console or debug:
// console.log('loading:', loading.value, 'value:', value.value)
// If loading is true, state hasn't been read yet
// If loading is false but value is 'default', nothing was in storage
</script>
```

**Verify storage persistence:**

```typescript
// In background script or console:
const result = await browser.storage.sync.get('apiKey')
console.log('Stored apiKey:', result.apiKey)
```

**Check for cross-window sync issues in multiple entrypoints:**

If a popup and options page both modify the same setting, use the `storage.onChanged` listener to stay in sync:

```typescript
browser.storage.onChanged.addListener((changes, area) => {
  if ('apiKey' in changes) {
    console.log('API key changed:', changes.apiKey.newValue)
    // Update local state to stay in sync with other windows
    apiKey.value = changes.apiKey.newValue
  }
})
```

---

## Troubleshooting

### Nuxt UI styles not showing in content script shadow DOM

Ensure `cssInjectionMode: 'ui'` is set in `defineContentScript`. This tells WXT to inject CSS into the shadow root.

```typescript
export default defineContentScript({
  cssInjectionMode: 'ui', // ← required for Nuxt UI in shadow DOM
  // ...
})
```

### Auto-imported components/composables not found

Run `npm run dev` once to generate `auto-imports.d.ts` and `components.d.ts`, then add them to `tsconfig.json`'s `include` array.

### `useToast()` / `useModal()` not working

These require `<UApp>` to be present as an ancestor. Wrap every entrypoint root with `<UApp>`:

```vue
<template>
  <UApp>
    <!-- rest of your UI -->
  </UApp>
</template>
```

### TypeScript errors with `browser.*` APIs

Ensure `wxt` types are included. WXT auto-generates the types, but you can also add:

```json
// tsconfig.json
{
  "compilerOptions": {
    "types": ["chrome"]
  }
}
```
