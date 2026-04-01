---
name: chrome-extension-builder
description: Build production-ready Chrome/browser extensions using WXT framework with TypeScript, Vue 3, and Nuxt UI. Use when creating any type of browser extension — popups, side panels, content scripts, options pages, new tab overrides, devtools panels, or background service workers. Triggers on phrases like "chrome extension", "browser extension", "WXT framework", "manifest v3", or file patterns like wxt.config.ts.
metadata:
  version: "2.1.0"
---

# Chrome Extension Development with WXT

Build modern, production-ready, cross-browser extensions using WXT — the next-generation framework supporting Chrome, Firefox, Edge, and Safari from a single codebase.

## When to Use This Skill

Use this skill when:
- Creating any type of browser extension (popup, side panel, content script, new tab override, devtools)
- Setting up WXT development environment
- Implementing cross-browser compatibility
- Working with Manifest V3 (mandatory as of 2025, Chrome V2 support ended Jan 2025)
- Implementing UI with Vue 3 + Nuxt UI
- Adding i18n, auto-icons, storage, and messaging
- Publishing to Chrome Web Store or Firefox Add-ons

## Extension Type Decision Guide

| Extension Type | Entry Points Needed | Permissions |
|---------------|---------------------|-------------|
| **Quick action** (one-click tool) | background + popup | activeTab |
| **Page enhancer** (modify websites) | background + content script | host_permissions |
| **Research assistant** (AI sidebar) | background + side panel + content | storage, sidePanel |
| **Productivity tool** (settings + UI) | background + popup + options | storage |
| **New Tab replacement** | newtab | storage |
| **Dev tool** | background + devtools panel | debugger |
| **Scraper / extractor** | background + content + side panel | host_permissions, storage |
| **Cross-site automation** | background + multiple content scripts | host_permissions, scripting |

## Quick Start Workflow

### Step 1: Gather Requirements

Ask before building:
- Which UI entry points? (popup, side panel, options, new tab, devtools)
- Which pages does it run on? (specific sites, all pages, or on demand)
- Does it need persistent state? (storage)
- Multi-language support? (i18n)
- Does it need keyboard shortcuts? (commands)

### Step 2: Initialize Project

```bash
# Interactive setup
pnpm dlx wxt@latest init

# Or with Vue template directly
npm create wxt@latest -- --template vue-ts

# Available templates: vanilla-ts, vue-ts, svelte-ts, solid-ts
```

### Step 3: Project Structure

```
project/
├── entrypoints/             # All entry points (auto-discovered)
│   ├── background.ts        # Service worker (always include)
│   ├── popup/               # Toolbar popup
│   │   ├── index.html
│   │   ├── main.ts
│   │   └── App.vue
│   ├── sidepanel/           # Side panel
│   │   ├── index.html
│   │   ├── main.ts
│   │   └── App.vue
│   ├── options/             # Options/settings page
│   │   ├── index.html
│   │   └── App.vue
│   ├── newtab/              # Override new tab page
│   │   ├── index.html
│   │   └── App.vue
│   ├── devtools/            # DevTools panel
│   │   └── index.html
│   ├── content.ts           # Content script (flat file)
│   └── youtube.content/     # Site-specific content script (folder)
│       ├── index.ts
│       └── App.vue
├── assets/                  # Processed by Vite
│   └── icon.png             # Source icon for @wxt-dev/auto-icons
├── components/              # Auto-imported Vue components
├── composables/             # Auto-imported Vue composables
├── utils/                   # Auto-imported utilities
├── stores/                  # Pinia stores (import manually)
├── public/                  # Copied as-is (static assets)
│   └── _locales/            # Vanilla i18n locale files
├── locales/                 # @wxt-dev/i18n locale files (YAML/JSON)
│   ├── en.yml
│   └── de.yml
├── wxt.config.ts            # Build configuration
└── package.json
```

Rules:
- Only place entrypoints **one level deep** in `entrypoints/` (no nesting beyond folders)
- **Never** place helper files directly in `entrypoints/` — group them inside a folder
- Auto-imported dirs: `components/`, `composables/`, `utils/` — no imports needed

### Step 4: Configure wxt.config.ts

```typescript
import { defineConfig } from 'wxt';
import ui from '@nuxt/ui/vite';

export default defineConfig({
  modules: [
    '@wxt-dev/module-vue',   // Vue 3 SFC support
    '@wxt-dev/auto-icons',   // Auto-generate icon sizes
    '@wxt-dev/i18n/module',  // Type-safe i18n (optional)
  ],

  vite: () => ({
    plugins: [
      ui({
        router: false,   // Extensions do not use vue-router
        colorMode: true,
      }),
    ],
  }),

  manifest: {
    name: 'My Extension',
    description: '__MSG_extDescription__',
    default_locale: 'en',
    permissions: ['storage', 'activeTab'],
    host_permissions: ['*://example.com/*'],
    side_panel: { default_path: 'sidepanel.html' }, // Only if using side panel
    commands: {
      _execute_action: {
        suggested_key: { default: 'Ctrl+Shift+Y', mac: 'Command+Shift+Y' },
        description: 'Open extension',
      },
    },
  },
});
```

### Step 5: Required package.json Scripts

```json
{
  "scripts": {
    "dev": "wxt",
    "dev:firefox": "wxt -b firefox",
    "build": "wxt build",
    "build:firefox": "wxt build -b firefox",
    "zip": "wxt zip",
    "zip:all": "wxt zip && wxt zip -b firefox",
    "compile": "wxt prepare && tsc --noEmit",
    "postinstall": "wxt prepare"
  }
}
```

`postinstall: wxt prepare` is **required** — it generates `.wxt/` TypeScript types.

## All Entry Point Types

WXT auto-discovers entrypoints by filename in `entrypoints/`:

| Entrypoint filename | Type | In Manifest |
|--|--|--|
| `background.[jt]s` | Service worker | Yes |
| `popup.html` or `popup/index.html` | Toolbar popup | Yes |
| `sidepanel.html` or `sidepanel/index.html` | Side panel | Yes |
| `options.html` or `options/index.html` | Options page | Yes |
| `newtab.html` or `newtab/index.html` | New tab override | Yes |
| `bookmarks.html` or `bookmarks/index.html` | Bookmarks override | Yes |
| `history.html` or `history/index.html` | History override | Yes |
| `devtools.html` or `devtools/index.html` | DevTools page | Yes |
| `sandbox.html` (Chrome only) | Sandboxed page | Yes |
| `{name}.content.[jt]s` | Content script | Yes |
| `{name}.html` (non-reserved name) | Unlisted page | No |
| `{name}.[jt]s` (non-reserved name) | Unlisted script | No |
| `{name}.css` | Unlisted CSS | No |

See `references/entrypoints.md` for all configuration options per type.

## Core Entry Points (with Vue + Nuxt UI)

### Background Script (Service Worker)

```typescript
// entrypoints/background.ts
export default defineBackground({
  type: 'module',
  persistent: false, // MV3 service workers are never persistent

  main() {
    // Open side panel on icon click
    browser.action.onClicked.addListener(async (tab) => {
      await browser.sidePanel.open({ tabId: tab.id! });
    });

    // Handle one-time messages
    browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'GET_DATA') {
        (async () => {
          const data = await loadData();
          sendResponse({ success: true, data });
        })();
        return true; // Keep channel open for async response
      }
    });

    // Schedule with alarms (do not use setTimeout in service workers)
    browser.alarms.create('daily-sync', { periodInMinutes: 1440 });
    browser.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name === 'daily-sync') syncData();
    });
  },
});
```

### Popup (Vue + Nuxt UI)

```typescript
// entrypoints/popup/main.ts
import { createApp } from 'vue';
import ui from '@nuxt/ui/vue-plugin';
import App from './App.vue';
import './style.css';

const app = createApp(App);
app.use(ui);
app.mount('#app');
```

```html
<!-- entrypoints/popup/index.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My Extension</title>
</head>
<body>
  <div id="app" class="isolate"></div>
  <script type="module" src="./main.ts"></script>
</body>
</html>
```

```vue
<!-- entrypoints/popup/App.vue -->
<script setup lang="ts">
const settingsItem = storage.defineItem<{ theme: string }>('local:settings', {
  fallback: { theme: 'auto' },
});

const settings = ref<{ theme: string } | null>(null);
const loading = ref(true);

onMounted(async () => {
  settings.value = await settingsItem.getValue();
  loading.value = false;
});
</script>

<template>
  <UApp>
    <div class="p-4 w-80">
      <USkeleton v-if="loading" class="h-32" />
      <template v-else>
        <h1 class="text-lg font-semibold mb-4">My Extension</h1>
        <UButton block @click="doAction">Run Action</UButton>
      </template>
    </div>
  </UApp>
</template>
```

### Side Panel (Vue + Nuxt UI)

Enable: add `'sidePanel'` permission and `side_panel: { default_path: 'sidepanel.html' }` to manifest.

```typescript
// entrypoints/sidepanel/main.ts
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

```vue
<!-- entrypoints/sidepanel/App.vue -->
<script setup lang="ts">
const messages = ref<{ id: string; content: string }[]>([]);
const loading = ref(false);

onMounted(() => {
  browser.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'NEW_DATA') messages.value.unshift(msg.data);
  });
});

async function runAction() {
  loading.value = true;
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  const response = await browser.tabs.sendMessage(tab.id!, { type: 'EXTRACT' });
  messages.value = response.data;
  loading.value = false;
}
</script>

<template>
  <UApp>
    <div class="h-screen flex flex-col p-4">
      <div class="flex items-center justify-between mb-4">
        <h1 class="font-semibold">My Extension</h1>
        <UButton size="sm" :loading="loading" @click="runAction">Analyze</UButton>
      </div>
      <div class="flex-1 overflow-y-auto space-y-2">
        <UCard v-for="msg in messages" :key="msg.id" class="text-sm">
          {{ msg.content }}
        </UCard>
        <p v-if="!messages.length" class="text-center text-gray-400 mt-8">
          Click Analyze to extract page content
        </p>
      </div>
    </div>
  </UApp>
</template>
```

### Options Page (Vue + Nuxt UI)

```html
<!-- entrypoints/options/index.html -->
<!DOCTYPE html>
<html>
<head>
  <meta name="manifest.open_in_tab" content="true" />
  <title>Extension Settings</title>
</head>
<body>
  <div id="app" class="isolate"></div>
  <script type="module" src="./main.ts"></script>
</body>
</html>
```

```vue
<!-- entrypoints/options/App.vue -->
<script setup lang="ts">
interface Settings {
  theme: 'light' | 'dark' | 'auto';
  notifications: boolean;
  apiKey: string;
}

const settingsItem = storage.defineItem<Settings>('local:settings', {
  fallback: { theme: 'auto', notifications: true, apiKey: '' },
});

const settings = ref<Settings | null>(null);
const saved = ref(false);

onMounted(async () => { settings.value = await settingsItem.getValue(); });

async function save() {
  if (!settings.value) return;
  await settingsItem.setValue(settings.value);
  saved.value = true;
  setTimeout(() => { saved.value = false; }, 2000);
}
</script>

<template>
  <UApp>
    <div class="max-w-2xl mx-auto p-8">
      <h1 class="text-2xl font-bold mb-6">Settings</h1>
      <UForm v-if="settings" class="space-y-6" @submit="save">
        <UFormField label="Theme">
          <USelect v-model="settings.theme" :options="['light', 'dark', 'auto']" />
        </UFormField>
        <UFormField label="Notifications">
          <USwitch v-model="settings.notifications" />
        </UFormField>
        <UFormField label="API Key">
          <UInput v-model="settings.apiKey" type="password" />
        </UFormField>
        <UButton type="submit" :color="saved ? 'success' : 'primary'">
          {{ saved ? 'Saved!' : 'Save Settings' }}
        </UButton>
      </UForm>
    </div>
  </UApp>
</template>
```

### Content Script (Shadow DOM UI)

```typescript
// entrypoints/content.ts  (or entrypoints/mysite.content/index.ts)
import { createApp } from 'vue';
import nuxtUi from '@nuxt/ui/vue-plugin';
import ContentApp from './ContentApp.vue';

export default defineContentScript({
  matches: ['*://*.example.com/*'],
  cssInjectionMode: 'ui',  // Required for shadow DOM CSS injection

  async main(ctx) {
    const ui = await createShadowRootUi(ctx, {
      name: 'my-extension-ui',
      position: 'inline',
      anchor: 'body',

      onMount(container) {
        const app = createApp(ContentApp);
        app.use(nuxtUi);
        app.mount(container);
        return app;
      },

      onRemove(app) { app?.unmount(); },
    });

    ui.mount();
  },
});
```

### New Tab Override

```html
<!-- entrypoints/newtab/index.html -->
<!DOCTYPE html>
<html>
<head><title>My New Tab</title></head>
<body>
  <div id="app" class="isolate"></div>
  <script type="module" src="./main.ts"></script>
</body>
</html>
```

```typescript
// entrypoints/newtab/main.ts
import { createApp } from 'vue';
import ui from '@nuxt/ui/vue-plugin';
import App from './App.vue';
const app = createApp(App);
app.use(ui);
app.mount('#app');
```

## WXT Official Modules

WXT has 6 official modules. This skill is Vue-first, but here is complete coverage:

| Module | Purpose | Use in this skill |
|---|---|---|
| `@wxt-dev/module-vue` | Vue framework integration | Primary framework module |
| `@wxt-dev/module-react` | React framework integration | Not used in this Vue skill |
| `@wxt-dev/module-svelte` | Svelte framework integration | Not used in this Vue skill |
| `@wxt-dev/module-solid` | Solid framework integration | Not used in this Vue skill |
| `@wxt-dev/auto-icons` | Auto-generate icon sizes | Recommended |
| `@wxt-dev/i18n` | Type-safe i18n + manifest localization | Recommended |

### @wxt-dev/module-vue — Vue Framework Module

```bash
pnpm i -D @wxt-dev/module-vue
```

```typescript
export default defineConfig({
  modules: ['@wxt-dev/module-vue'],
});
```

This enables Vue SFC support (`.vue`), Vue HMR during development, and seamless integration with Nuxt UI.

### @wxt-dev/auto-icons — Automatic Icon Generation

Generates all required icon sizes (16, 32, 48, 96, 128px) from one source image.

```bash
pnpm i -D @wxt-dev/auto-icons
```

```typescript
export default defineConfig({
  modules: ['@wxt-dev/module-vue', '@wxt-dev/auto-icons'],
  autoIcons: { /* grayscale: true  --  shows dev build */ },
});
```

Place source icon at `<srcDir>/assets/icon.png` (PNG or SVG). All sizes generated automatically.

### @wxt-dev/i18n — Type-Safe Internationalization

Recommended over `vue-i18n` — translations load synchronously, are not bundled per-entrypoint, and can localize manifest strings.

```bash
pnpm i @wxt-dev/i18n
```

```typescript
export default defineConfig({
  modules: ['@wxt-dev/module-vue', '@wxt-dev/i18n/module'],
  manifest: {
    default_locale: 'en',
    name: '__MSG_extName__',
    description: '__MSG_extDescription__',
  },
});
```

```yaml
# locales/en.yml
extName: My Extension
extDescription: Does useful things
welcome: Welcome, $1!
itemCount:
  1: 1 item
  n: $1 items
```

```typescript
// Auto-imported everywhere
i18n.t('extName');             // "My Extension"
i18n.t('welcome', ['Bob']);    // "Welcome, Bob!"
i18n.t('itemCount', 3);        // "3 items"
```

Types generated by `wxt prepare` — wrong keys are TypeScript errors.
See `references/i18n.md` for full guide including pluralization.

## Storage

WXT ships a built-in typed storage API. Use `storage.defineItem` for versioned, observable items:

```typescript
// utils/storage.ts
interface Settings { theme: 'light' | 'dark' | 'auto'; notifications: boolean }

export const settingsStorage = storage.defineItem<Settings>('local:settings', {
  fallback: { theme: 'auto', notifications: true },
});

export const installDate = storage.defineItem<number>('local:installDate', {
  init: () => Date.now(),  // Sets value once on first access
});

// Versioned with migration:
export const dataStorage = storage.defineItem<DataV2>('local:data', {
  version: 2,
  migrations: {
    2: (oldV1: DataV1): DataV2 => ({ ...oldV1, newField: 'default' }),
  },
});
```

```typescript
// Usage (storage is auto-imported)
const value = await settingsStorage.getValue();
await settingsStorage.setValue({ theme: 'dark', notifications: false });
const unwatch = settingsStorage.watch((newVal) => console.log(newVal));

// Bulk operations
await storage.setItems([
  { item: settingsStorage, value: { theme: 'dark', notifications: true } },
  { key: 'local:lastSync', value: Date.now() },
]);
```

Storage areas: `local:` (device), `sync:` (cross-device), `session:` (tab session), `managed:` (admin).
Requires `"storage"` permission.

## Messaging

### Recommended: webext-bridge

```bash
pnpm i webext-bridge
```

Works across all contexts (background, content, popup, sidepanel) with full TypeScript support:

```typescript
// entrypoints/background.ts
import { onMessage } from 'webext-bridge/background';

onMessage('get-settings', async () => {
  return await settingsStorage.getValue();
});
```

```typescript
// entrypoints/sidepanel/App.vue (or popup)
import { sendMessage } from 'webext-bridge/popup'; // or /sidepanel

const settings = await sendMessage('get-settings', {});
```

```typescript
// entrypoints/content.ts
import { sendMessage, onMessage } from 'webext-bridge/content-script';

const result = await sendMessage('process-data', { text: document.body.innerText });
onMessage('highlight', ({ data }) => highlightText(data.text));
```

See `references/messaging.md` for vanilla API patterns, long-lived connections, and protocol design.

## Common Patterns

### SPA Navigation Handling

Content scripts only run on full page loads. For SPAs (YouTube, Gmail, GitHub):

```typescript
// entrypoints/youtube.content.ts
const watchPattern = new MatchPattern('*://*.youtube.com/watch*');

export default defineContentScript({
  matches: ['*://*.youtube.com/*'],
  main(ctx) {
    ctx.addEventListener(window, 'wxt:locationchange', ({ newUrl }) => {
      if (watchPattern.includes(newUrl)) mountUi(ctx);
    });
    if (watchPattern.includes(location.href)) mountUi(ctx);
  },
});
```

**Critical**: Use `ctx.addEventListener` NOT `window.addEventListener` — the ctx version cleans up when the extension reloads, preventing `Extension context invalidated` errors.

### Context Invalidation

```typescript
export default defineContentScript({
  main(ctx) {
    ctx.onInvalidated(() => {
      // Cleanup when extension reloads
      ui.remove();
      observer.disconnect();
    });

    // Long-running loops must check validity
    async function pollData() {
      while (ctx.isValid) {
        await processPage();
        await new Promise(r => setTimeout(r, 5000));
      }
    }
    pollData();
  },
});
```

### Dynamic UI Mount (waitFor element)

```typescript
const ui = createIntegratedUi(ctx, {
  position: 'inline',
  anchor: '#dynamic-container', // Observes until element appears
  onMount(container) {
    const app = createApp(MyWidget);
    app.mount(container);
    return app;
  },
  onRemove(app) { app?.unmount(); },
});

ui.autoMount(); // Handles element add/remove automatically
```

### Script Injection (Main World)

```typescript
// entrypoints/injected.ts  (unlisted script -- runs in page context)
export default defineUnlistedScript(() => {
  window.__MY_EXT__ = { version: '1.0' };
});
```

```typescript
// entrypoints/content.ts
export default defineContentScript({
  matches: ['<all_urls>'],
  async main() {
    await injectScript('/injected.js', { keepInDom: true });
  },
});
```

Required in manifest:
```typescript
web_accessible_resources: [{ resources: ['injected.js'], matches: ['<all_urls>'] }]
```

### Content Script Text Insertion

```typescript
// utils/insertion.ts
export function insertAtCursor(text: string): boolean {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return false;

  const range = selection.getRangeAt(0);
  range.deleteContents();
  range.insertNode(document.createTextNode(text));
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
  return true;
}

// Fallback for contenteditable elements (e.g. Google Docs)
export async function insertViaClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    document.execCommand('paste');
    return true;
  } catch { return false; }
}
```

### Context Menus

```typescript
// entrypoints/background.ts
export default defineBackground({
  main() {
    browser.runtime.onInstalled.addListener(() => {
      browser.contextMenus.create({
        id: 'search-selected',
        title: 'Search "%s" with MyExt',
        contexts: ['selection'],
      });
    });

    browser.contextMenus.onClicked.addListener((info, _tab) => {
      if (info.menuItemId === 'search-selected') {
        const text = info.selectionText;
        // process text...
      }
    });
  },
});
```

Requires `"contextMenus"` permission.

### Environment Variables

```bash
# .env.development
VITE_API_URL=http://localhost:3000
VITE_ENABLE_DEBUG_TOOLS=true

# .env.production
VITE_API_URL=https://api.myextension.com
VITE_ENABLE_DEBUG_TOOLS=false
```

```typescript
const apiUrl = import.meta.env.VITE_API_URL;
const enableDebugTools = import.meta.env.VITE_ENABLE_DEBUG_TOOLS === 'true';
```

WXT also supports `.env.publish` for store submission credentials.

## State Management (Pinia)

```bash
pnpm i pinia
```

```typescript
// stores/settings.ts
import { defineStore } from 'pinia';

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref({ theme: 'auto', enabled: true });
  const item = storage.defineItem('local:settings',
    { fallback: { theme: 'auto', enabled: true } });

  async function load() {
    settings.value = await item.getValue();
    item.watch((v) => { if (v) settings.value = v; });
  }

  async function update(patch: Partial<typeof settings.value>) {
    Object.assign(settings.value, patch);
    await item.setValue(settings.value);
  }

  return { settings, load, update };
});
```

## Testing

### Unit Tests (Vitest)

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: { environment: 'jsdom', globals: true, setupFiles: ['./test/setup.ts'] },
});
```

```typescript
// test/setup.ts
import { vi } from 'vitest';
Object.assign(globalThis, {
  browser: {
    storage: { local: { get: vi.fn(), set: vi.fn() } },
    runtime: { sendMessage: vi.fn(), onMessage: { addListener: vi.fn() } },
    tabs: { query: vi.fn(), sendMessage: vi.fn() },
  },
});
```

### E2E Tests (Playwright)

```typescript
// e2e/extension.spec.ts
import { test, expect, chromium } from '@playwright/test';
import path from 'path';

test('popup renders correctly', async () => {
  const pathToExtension = path.join(process.cwd(), '.output/chrome-mv3');

  const context = await chromium.launchPersistentContext('', {
    headless: false,
    args: [
      `--disable-extensions-except=${pathToExtension}`,
      `--load-extension=${pathToExtension}`,
    ],
  });

  const [background] = context.serviceWorkers();
  const extensionId = background.url().split('/')[2];

  const popup = await context.newPage();
  await popup.goto(`chrome-extension://${extensionId}/popup.html`);
  await expect(popup.locator('h1')).toBeVisible();

  await context.close();
});
```

## Building & Deployment

### Production Build

```bash
wxt build              # Chrome (default)
wxt build -b firefox   # Firefox
wxt build -b edge      # Edge (uses Chrome manifest)

wxt zip               # Chrome store-ready ZIP
wxt zip -b firefox    # Firefox ZIP
```

Output: `.output/{browser}-mv3/` and `.output/my-extension-{version}-{browser}.zip`

### Cross-Browser Compatibility

```typescript
if (import.meta.env.BROWSER === 'firefox') {
  // Firefox-specific
} else {
  // Chrome / Edge
}
```

### Store Submission Checklist

- [ ] Icons 16, 32, 48, 128px (auto with @wxt-dev/auto-icons)
- [ ] Screenshots + promotional images (1280x800)
- [ ] Privacy policy URL (if handling user data)
- [ ] All permissions justified
- [ ] No hardcoded secrets or API keys
- [ ] CSP configured (no unsafe-eval, no remote scripts)
- [ ] Tested on all target browsers
- [ ] manifest.json version matches package.json

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Extension context invalidated | Use ctx.addEventListener not window.addEventListener in content scripts |
| CSP violation | Add source to content_security_policy.extension_pages in manifest |
| Storage not persisting | Prefix keys: local:key, sync:key |
| Hot reload not working | Check service worker is active in chrome://extensions |
| Content script not injecting | Check matches patterns and host_permissions |
| Shadow DOM styles not loading | Ensure cssInjectionMode is set to "ui" |
| Side panel not opening | Add sidePanel permission and side_panel.default_path in manifest |
| Types missing (.wxt/) | Run wxt prepare or the postinstall script |
| favicon shows as default | Place icon.png in assets/ with @wxt-dev/auto-icons module |

## Reference Files

- `references/entrypoints.md` — All entrypoint types, options, and patterns
- `references/vue-integration.md` — Vue 3 + Nuxt UI complete setup guide
- `references/messaging.md` — Cross-context communication patterns
- `references/content-patterns.md` — DOM extraction, SPA handling, text insertion
- `references/i18n.md` — @wxt-dev/i18n complete guide
- `references/best-practices.md` — Security, performance, architecture
- `references/wxt-config.md` — Complete wxt.config.ts options reference
- `references/mv3-permissions.md` — All MV3 permissions guide
- `references/chrome-api.md` — Chrome Extension API reference (includes Chrome 140+ features)
- `references/wxt-api.md` — WXT framework API reference
