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
});
```

### CSS — Import in Each Entrypoint

Create a shared CSS file and import it in every entrypoint:

```css
/* assets/css/main.css */
@import "tailwindcss";
@import "@nuxt/ui";
```

Import it in each entrypoint's `main.ts`:

```typescript
import '../../../assets/css/main.css';
```

Or import it per-entrypoint (e.g., `entrypoints/popup/style.css`):

```css
/* entrypoints/popup/style.css */
@import "tailwindcss";
@import "@nuxt/ui";
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
entrypoints/popup/
├── index.html
├── main.ts         # App entry — createApp + ui plugin
├── App.vue         # Root component with UApp wrapper
├── style.css       # Tailwind + Nuxt UI imports
└── components/
    ├── Header.vue
    └── Settings.vue
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

**entrypoints/popup/main.ts:**

```typescript
import { createApp } from 'vue';
import ui from '@nuxt/ui/vue-plugin';
import App from './App.vue';
import './style.css';

const app = createApp(App);
app.use(ui);
app.mount('#app');
```

**entrypoints/popup/style.css:**

```css
@import "tailwindcss";
@import "@nuxt/ui";
```

**entrypoints/popup/App.vue:**

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue';

const settings = ref<Record<string, any>>({});
const loading = ref(true);

onMounted(async () => {
  const result = await browser.storage.local.get('settings');
  settings.value = result.settings ?? {};
  loading.value = false;
});

async function handleSave() {
  await browser.storage.local.set({ settings: settings.value });
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

**entrypoints/options/App.vue:**

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue';

const toast = useToast();

const settings = ref({
  theme: 'system',
  notifications: true,
  apiKey: '',
});

onMounted(async () => {
  const result = await browser.storage.sync.get('settings');
  if (result.settings) settings.value = result.settings;
});

async function handleSave() {
  await browser.storage.sync.set({ settings: settings.value });
  toast.add({
    title: 'Settings saved',
    description: 'Your preferences have been updated.',
    color: 'success',
  });
}
</script>

<template>
  <UApp>
    <div class="max-w-2xl mx-auto p-6 space-y-6">
      <h1 class="text-2xl font-bold">Extension Settings</h1>

      <UForm :state="settings" @submit="handleSave" class="space-y-4">
        <UFormField label="Theme" name="theme">
          <USelect
            v-model="settings.theme"
            :options="[
              { label: 'System', value: 'system' },
              { label: 'Light', value: 'light' },
              { label: 'Dark', value: 'dark' },
            ]"
          />
        </UFormField>

        <UFormField label="Enable Notifications" name="notifications">
          <USwitch v-model="settings.notifications" />
        </UFormField>

        <UFormField label="API Key" name="apiKey">
          <UInput
            v-model="settings.apiKey"
            type="password"
            placeholder="Enter your API key"
          />
        </UFormField>

        <UButton type="submit" color="primary">
          Save Settings
        </UButton>
      </UForm>
    </div>
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
        const app = createApp(ContentApp);
        app.use(nuxtUi);
        app.mount(container);
        return app;
      },

      onRemove(app) {
        app?.unmount();
      },
    });

    shadowUi.mount();
  },
});
```

**entrypoints/content/ContentApp.vue:**

```vue
<script setup lang="ts">
import { ref } from 'vue';

const visible = ref(false);
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
// entrypoints/sidepanel/main.ts
import { createApp } from 'vue';
import ui from '@nuxt/ui/vue-plugin';
import App from './App.vue';
import './style.css';

const app = createApp(App);
app.use(ui);
app.mount('#app');
```

Enable the side panel in your background script:

```typescript
// entrypoints/background.ts
export default defineBackground(() => {
  browser.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});
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
  const value = ref<T>(defaultValue);
  const loading = ref(true);

  function onChanged(
    changes: Record<string, chrome.storage.StorageChange>,
    changedArea: string
  ) {
    if (changedArea === area && key in changes) {
      value.value = changes[key].newValue ?? defaultValue;
    }
  }

  onMounted(async () => {
    const result = await browser.storage[area].get(key);
    if (result[key] !== undefined) value.value = result[key];
    loading.value = false;
    browser.storage.onChanged.addListener(onChanged);
  });

  onUnmounted(() => {
    browser.storage.onChanged.removeListener(onChanged);
  });

  async function setValue(newValue: T) {
    await browser.storage[area].set({ [key]: newValue });
    value.value = newValue;
  }

  return { value, setValue, loading: loading as Readonly<typeof loading> };
}
```

**Usage:**

```vue
<script setup lang="ts">
const { value: theme, setValue: setTheme, loading } = useStorage('theme', 'system');
</script>

<template>
  <USkeleton v-if="loading" class="h-8 w-32" />
  <USelect
    v-else
    v-model="theme"
    :options="[
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
) => any | Promise<any>;

export function useMessage<T = any>(type: string, handler: MessageHandler<T>) {
  function listener(
    message: any,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: any) => void
  ) {
    if (message.type === type) {
      Promise.resolve(handler(message.payload, sender))
        .then(sendResponse)
        .catch((err) => sendResponse({ error: err.message }));
      return true; // Keep channel open for async response
    }
  }

  onMounted(() => browser.runtime.onMessage.addListener(listener));
  onUnmounted(() => browser.runtime.onMessage.removeListener(listener));
}
```

**Usage:**

```vue
<script setup lang="ts">
// Responds to messages of type 'get-tab-info'
useMessage('get-tab-info', async (_payload, sender) => {
  return { tabId: sender.tab?.id, url: sender.tab?.url };
});
</script>
```

### useCurrentTab — Active Tab Info

```typescript
// composables/useCurrentTab.ts
import { ref, onMounted } from 'vue';

export function useCurrentTab() {
  const tab = ref<browser.tabs.Tab | null>(null);
  const loading = ref(true);

  onMounted(async () => {
    const [activeTab] = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });
    tab.value = activeTab ?? null;
    loading.value = false;
  });

  return { tab, loading };
}
```

---

## Dark Mode

Nuxt UI integrates with `@vueuse/core`'s `useColorMode` (enabled by `colorMode: true` in the vite plugin options).

```vue
<script setup lang="ts">
// useColorMode is auto-imported by Nuxt UI
const colorMode = useColorMode();

function toggleTheme() {
  colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark';
}
</script>

<template>
  <UApp>
    <div class="p-4">
      <!-- Toggle button -->
      <UButton
        :icon="colorMode.value === 'dark' ? 'i-lucide-sun' : 'i-lucide-moon'"
        variant="ghost"
        @click="toggleTheme"
      />

      <!-- Or use the built-in color mode select -->
      <USelect
        v-model="colorMode.preference"
        :options="[
          { label: 'System', value: 'system' },
          { label: 'Light', value: 'light' },
          { label: 'Dark', value: 'dark' },
        ]"
      />
    </div>
  </UApp>
</template>
```

Persist the user's preference across sessions:

```typescript
// entrypoints/popup/main.ts
import { createApp } from 'vue';
import ui from '@nuxt/ui/vue-plugin';
import App from './App.vue';
import './style.css';

const app = createApp(App);
app.use(ui);
app.mount('#app');

// Sync color mode with storage
const colorMode = useColorMode(); // available after ui plugin is installed
browser.storage.local.get('colorMode').then(({ colorMode: saved }) => {
  if (saved) colorMode.preference = saved;
});
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
      primary: 'violet',
      neutral: 'zinc',
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
  --font-sans: 'Inter', system-ui, sans-serif;
  --color-green-400: #00DC82; /* Custom Nuxt green */
}
```

### Component Customization via `ui` Prop

Every Nuxt UI component accepts a `ui` prop for scoped class overrides:

```vue
<UButton
  :ui="{
    base: 'rounded-full',
    color: { primary: { solid: 'bg-violet-600 hover:bg-violet-700' } },
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
  const theme = ref<'system' | 'light' | 'dark'>('system');
  const notifications = ref(true);

  async function load() {
    const result = await browser.storage.sync.get(['theme', 'notifications']);
    theme.value = result.theme ?? 'system';
    notifications.value = result.notifications ?? true;
  }

  async function save() {
    await browser.storage.sync.set({
      theme: theme.value,
      notifications: notifications.value,
    });
  }

  return { theme, notifications, load, save };
});
```

Mount Pinia in each entrypoint's `main.ts`:

```typescript
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import ui from '@nuxt/ui/vue-plugin';
import App from './App.vue';
import './style.css';

const app = createApp(App);
app.use(createPinia());
app.use(ui);
app.mount('#app');
```

---

## Type-Safe Communication Between Entrypoints

```typescript
// types/messages.ts
export interface MessageMap {
  'get-tab-info': {
    request: Record<string, never>;
    response: { tabId: number; url: string };
  };
  'save-settings': {
    request: { settings: Record<string, unknown> };
    response: { success: boolean };
  };
}

// utils/messaging.ts
import type { MessageMap } from '~/types/messages';

export async function sendMessage<K extends keyof MessageMap>(
  type: K,
  payload: MessageMap[K]['request']
): Promise<MessageMap[K]['response']> {
  return await browser.runtime.sendMessage({ type, payload });
}
```

Usage in a Vue component:

```vue
<script setup lang="ts">
import { sendMessage } from '~/utils/messaging';

async function fetchTabInfo() {
  const { tabId, url } = await sendMessage('get-tab-info', {});
  console.log('Current tab:', tabId, url);
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
});
```

```typescript
// entrypoints/popup/main.ts
import { createApp } from 'vue';
import ui from '@nuxt/ui/vue-plugin';
import App from './App.vue';
import { router } from './router';
import './style.css';

// Note: pass router: false to Nuxt UI since we handle routing ourselves
const app = createApp(App);
app.use(router);
app.use(ui);
app.mount('#app');
```

---

## Troubleshooting

### Nuxt UI styles not showing in content script shadow DOM

Ensure `cssInjectionMode: 'ui'` is set in `defineContentScript`. This tells WXT to inject CSS into the shadow root.

```typescript
export default defineContentScript({
  cssInjectionMode: 'ui', // ← required for Nuxt UI in shadow DOM
  // ...
});
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

### Dark mode not persisting

`useColorMode` stores the preference in `localStorage`, which is not shared between extension pages. Use `browser.storage.sync` or `storage.local` to sync the preference across popup, options, and side panel.

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
