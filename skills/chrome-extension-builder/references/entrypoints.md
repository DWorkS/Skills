# WXT Entrypoints Reference

Complete guide to all 13 WXT entrypoint types with configuration options and examples.

## Auto-Discovery Rules

WXT discovers entrypoints from `entrypoints/` by filename. Two forms:
- **Flat file**: `entrypoints/popup.html` or `entrypoints/content.ts`
- **Folder**: `entrypoints/popup/index.html` or `entrypoints/youtube.content/index.ts`

Never nest deeper than one folder inside `entrypoints/`.

## Background Script

**File**: `entrypoints/background.ts` (or `.js`)

```typescript
export default defineBackground({
  // Options:
  type: 'module',        // Use ES modules (recommended)
  persistent: false,     // MV3: always false. MV2 only: true keeps SW alive
  // Include specific browsers only:
  include: ['chrome', 'firefox'],

  main() {
    // All extension startup logic goes here
  },
})
```

**Key rules**:
- Service workers (MV3) terminate when idle — don't rely on in-memory state
- Use `browser.storage` + `browser.alarms` for persistence and scheduling
- Service workers wake up for events; each event handler must finish within 5 minutes

## Popup

**Files**: `entrypoints/popup.html` or `entrypoints/popup/index.html`

```html
<!-- HTML meta options (in <head>) -->
<meta name="manifest.default_icon" content='{ "16": "icon/16.png" }' />
<meta name="manifest.browser_style" content="true" />
```

The popup is the small window that appears when a user clicks the extension icon.
Max dimensions: 800×600px. Min dimensions: depend on content.

```typescript
// entrypoints/popup/main.ts
import { createApp } from 'vue';
import ui from '@nuxt/ui/vue-plugin';
import App from './App.vue';

createApp(App).use(ui).mount('#app')
```

## Side Panel

**Files**: `entrypoints/sidepanel.html` or `entrypoints/sidepanel/index.html`

Shown as a panel on the side of the browser window (Chrome 114+, Firefox sidebar).

**Required manifest configuration**:
```typescript
// wxt.config.ts
manifest: {
  permissions: ['sidePanel'],
  side_panel: { default_path: 'sidepanel.html' },
}
```

**Opening the side panel programmatically**:
```typescript
// entrypoints/background.ts
// Open on icon click (most common pattern)
browser.action.onClicked.addListener(async (tab) => {
  await browser.sidePanel.open({ tabId: tab.id! })
})

// Or open from any page/popup
await browser.sidePanel.open({ windowId: browser.windows.WINDOW_ID_CURRENT })

// Enable per-tab (disable by default, enable for specific pages)
browser.tabs.onUpdated.addListener((tabId, _info, tab) => {
  const enabled = tab.url?.includes('example.com') ?? false
  browser.sidePanel.setOptions({ tabId, enabled })
})
```

The side panel persists across page navigations — it's ideal for persistent AI assistants and research tools.

## Options Page

**Files**: `entrypoints/options.html` or `entrypoints/options/index.html`

Accessible from `chrome://extensions` → Details → Extension options.

```html
<!-- HTML meta options -->
<meta name="manifest.open_in_tab" content="true" />  <!-- Opens full tab instead of overlay -->
<meta name="manifest.browser_style" content="true" />
```

```typescript
// entrypoints/options/main.ts
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import ui from '@nuxt/ui/vue-plugin';
import App from './App.vue';

const app = createApp(App)
app.use(createPinia())
app.use(ui)
app.mount('#app')
```

Open options page programmatically:
```typescript
browser.runtime.openOptionsPage()
```

## New Tab Override

**Files**: `entrypoints/newtab.html` or `entrypoints/newtab/index.html`

Replaces the default new tab page. Only one extension can own the new tab at a time.

No special manifest configuration needed — WXT adds `chrome_url_overrides` automatically.

```typescript
// entrypoints/newtab/main.ts
import { createApp } from 'vue';
import ui from '@nuxt/ui/vue-plugin';
import App from './App.vue';
createApp(App).use(ui).mount('#app')
```

**Note**: Avoid making network requests on new tab load — they delay page render.

## Bookmarks Override (Chrome only)

**Files**: `entrypoints/bookmarks.html` or `entrypoints/bookmarks/index.html`

Replaces `chrome://bookmarks`. Requires `"bookmarks"` permission.

```typescript
// wxt.config.ts
manifest: { permissions: ['bookmarks'] }
```

## History Override (Chrome only)

**Files**: `entrypoints/history.html` or `entrypoints/history/index.html`

Replaces `chrome://history`. Requires `"history"` permission.

## DevTools Panel

**Files**: `entrypoints/devtools.html` or `entrypoints/devtools/index.html`

The devtools HTML is a loader — it creates the actual panel using `chrome.devtools.panels`:

```html
<!-- entrypoints/devtools/index.html -->
<!DOCTYPE html>
<html>
<head><script src="devtools.js"></script></head>
</html>
```

```typescript
// entrypoints/devtools/devtools.ts
chrome.devtools.panels.create(
  'My Extension',          // Panel title
  'icon/48.png',           // Panel icon
  'devtools-panel.html',   // Panel HTML (unlisted page)
  (panel) => {
    panel.onShown.addListener((window) => {
      window.document.getElementById('app')?.setAttribute('data-active', 'true')
    })
  }
)
```

```html
<!-- entrypoints/devtools-panel.html (unlisted page) -->
<!DOCTYPE html>
<html>
<body>
  <div id="app"></div>
  <script type="module" src="./devtools-panel.ts"></script>
</body>
</html>
```

```typescript
// entrypoints/devtools-panel.ts (unlisted script for panel)
import { createApp } from 'vue';
import ui from '@nuxt/ui/vue-plugin';
import DevToolsApp from '../components/DevToolsApp.vue';
createApp(DevToolsApp).use(ui).mount('#app')
```

DevTools pages have access to `chrome.devtools.*` APIs for inspecting the current page.

## Sandbox (Chrome only)

**Files**: `entrypoints/sandbox.html` or `entrypoints/sandbox/index.html`

A sandboxed page that runs in a unique origin with no access to extension APIs or external content. Useful for:
- Running third-party scripts (e.g. code execution environments)
- Isolated iframe content
- `eval()` and `new Function()` (both blocked by CSP everywhere else)

Communication is via `window.postMessage`:
```typescript
// From extension page to sandbox
sandboxFrame.contentWindow?.postMessage({ type: 'RUN', code }, '*')

// In sandbox
window.addEventListener('message', (event) => {
  if (event.data.type === 'RUN') {
    // eval(event.data.code) is allowed here
  }
})
```

## Content Scripts

**Files**: `entrypoints/content.ts` or `entrypoints/{name}.content.ts` or `entrypoints/{name}.content/index.ts`

```typescript
export default defineContentScript({
  // Required
  matches: ['*://*.example.com/*'],   // URL patterns to match

  // Optional
  runAt: 'document_idle',             // 'document_start' | 'document_end' | 'document_idle'
  world: 'ISOLATED',                  // 'ISOLATED' (default) | 'MAIN'
  allFrames: false,                   // Run in all iframes too
  matchAboutBlank: false,
  matchOriginAsFallback: false,
  cssInjectionMode: 'ui',             // 'manifest' | 'manual' | 'ui' (required for Shadow DOM)
  excludeMatches: ['*://sub.example.com/*'],
  includeGlobs: ['*://example.com/specific/*'],
  excludeGlobs: ['*://example.com/skip/*'],
  // Include only for specific browsers:
  include: ['chrome'],

  main(ctx) {
    // ctx.isValid — false if extension was reloaded
    // ctx.onInvalidated(cb) — fires when extension reloads  
    // ctx.addEventListener(target, event, cb) — auto-cleaned up on invalidation
    // ctx.setInterval / ctx.setTimeout — auto-cleaned up
  },
})
```

### Content Script UI Modes

| Mode | API | CSS Isolation | Use Case |
|------|-----|---------------|----------|
| `createShadowRootUi` | Full Vue component | Shadow DOM (complete) | Floating panels, overlays |
| `createIntegratedUi` | Full Vue component | None | Fit into page design |
| `createIframeUi` | Full Vue component | Full iframe | Complete isolation |

```typescript
// Shadow DOM (recommended for most overlays)
const ui = await createShadowRootUi(ctx, {
  name: 'my-ext-ui',
  position: 'inline',      // 'inline' | 'overlay' | 'modal'
  anchor: 'body',          // CSS selector or DOM element
  append: 'last',          // 'first' | 'last' | 'before' | 'after'
  zIndex: 999999,          // For overlay and modal positions
  onMount(container, shadow, shadowHost) {
    const app = createApp(MyApp)
    app.mount(container)
    return app
  },
  onRemove(app) { app?.unmount(); },
})

ui.mount()
// ui.remove();
// ui.autoMount(); — watches DOM, mounts/unmounts as anchor appears/disappears
```

### Dynamic Content Script Registration

Register content scripts at runtime (useful for user-defined patterns):

```typescript
// entrypoints/background.ts
await browser.scripting.registerContentScripts([{
  id: 'dynamic-script',
  matches: ['*://user-defined-site.com/*'],
  js: ['content-scripts/content.js'],
  runAt: 'document_idle',
}])

// Update later
await browser.scripting.updateContentScripts([{
  id: 'dynamic-script',
  matches: ['*://new-site.com/*'],
}])

// Remove
await browser.scripting.unregisterContentScripts({ ids: ['dynamic-script'] })
```

Requires `"scripting"` permission.

## Unlisted Pages

**Files**: `entrypoints/{name}.html` where `{name}` is not a reserved name

Not added to manifest, not accessible from UI — but reachable via URL.

```typescript
// Access from background or content:
const url = browser.runtime.getURL('/my-unlisted-page.html')
// Result: chrome-extension://{id}/my-unlisted-page.html
```

Use cases:
- DevTools panel pages (above)
- Welcome/onboarding page (open on install)
- Permission request pages

Opening on install:
```typescript
// entrypoints/background.ts
browser.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === 'install') {
    browser.tabs.create({ url: browser.runtime.getURL('/welcome.html') })
  }
})
```

## Unlisted Scripts

**Files**: `entrypoints/{name}.ts` where `{name}` is not a reserved name

Not bundled with any entrypoint. Used for:
- Main world injection scripts
- Shared workers
- Scripts loaded by unlisted pages

```typescript
// entrypoints/injected-main.ts
export default defineUnlistedScript(() => {
  // Runs in page context (main world)
  window.__MY_EXT__ = { version: '1.0', api: myApi }
})
```

```typescript
// entrypoints/content.ts
await injectScript('/injected-main.js', { keepInDom: true })
```

Required in manifest for web-accessible scripts:
```typescript
web_accessible_resources: [{
  resources: ['injected-main.js'],
  matches: ['<all_urls>'],
}]
```

## Unlisted CSS

**Files**: `entrypoints/{name}.css`

Not added to manifest. Can be:
- Injected via `browser.scripting.insertCSS`
- Used in unlisted pages
- Imported by content scripts

```typescript
// Inject CSS programmatically
await browser.scripting.insertCSS({
  target: { tabId: tab.id! },
  files: ['content-scripts/my-styles.css'],
})
```

## HTML Meta Options Reference

All HTML meta tags available in entrypoint HTML `<head>`:

| Meta name | Values | Applies to |
|-----------|--------|-----------|
| `manifest.default_icon` | JSON object `{"16": "path"}` | popup, sidepanel |
| `manifest.browser_style` | `"true"` / `"false"` | popup, options, sidepanel |
| `manifest.open_in_tab` | `"true"` / `"false"` | options |
| `manifest.chrome_style` | `"true"` / `"false"` | options |

Example:
```html
<meta name="manifest.default_icon" content='{"16": "icon/16.png", "48": "icon/48.png"}' />
<meta name="manifest.browser_style" content="false" />
```
