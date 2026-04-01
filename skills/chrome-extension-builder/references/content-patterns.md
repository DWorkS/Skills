# Content Script Patterns Reference

Advanced patterns for content scripts: DOM manipulation, text insertion, SPA handling, page-specific extraction, and context management.

## SPA Navigation Handling

Content scripts only run once per full page load. SPAs (YouTube, Gmail, GitHub, Twitter) navigate via `history.pushState` without triggering a reload.

WXT fires `wxt:locationchange` when the URL changes within a tab:

```typescript
// entrypoints/youtube.content.ts
const watchPattern = new MatchPattern('*://*.youtube.com/watch*')

export default defineContentScript({
  matches: ['*://*.youtube.com/*'],

  main(ctx) {
    // Handle URL changes (SPA navigation)
    ctx.addEventListener(window, 'wxt:locationchange', ({ newUrl, oldUrl }) => {
      if (watchPattern.includes(newUrl)) {
        // New watch page loaded
        mountUi(ctx)
      } else if (watchPattern.includes(oldUrl)) {
        // Navigated away from watch page
      }
    })

    // Also run on initial load if matching
    if (watchPattern.includes(location.href)) {
      mountUi(ctx)
    }
  },
})
```

**Always use `ctx.addEventListener`** — not `window.addEventListener`. The ctx version uses `AbortSignal` internally and automatically removes the listener when the extension is reloaded, preventing stale handlers.

### Waiting for DOM Elements in SPAs

SPAs often render asynchronously after navigation. Use `waitForElement`:

```typescript
// utils/dom.ts
export function waitForElement(
  selector: string,
  timeout = 5000
): Promise<Element> {
  return new Promise((resolve, reject) => {
    const el = document.querySelector(selector)
    if (el) { resolve(el); return; }

    const observer = new MutationObserver(() => {
      const el = document.querySelector(selector)
      if (el) {
        observer.disconnect()
        resolve(el)
      }
    })

    observer.observe(document.body, { childList: true, subtree: true })
    setTimeout(() => {
      observer.disconnect()
      reject(new Error(`Element ${selector} not found within ${timeout}ms`))
    }, timeout)
  })
}
```

```typescript
// In content script
const container = await waitForElement('#video-title')
mountAdjacentUi(container)
```

## Context Invalidation

When an extension reloads (during development or after update), existing content scripts become invalid. WXT provides `ctx` to manage this lifecycle:

```typescript
export default defineContentScript({
  main(ctx) {
    // Register cleanup
    ctx.onInvalidated(() => {
      ui?.remove()
      observer?.disconnect()
      port?.disconnect()
    })

    // Check before async operations
    async function processPage() {
      if (!ctx.isValid) return

      const data = await fetchData()
      if (!ctx.isValid) return // Check again after async

      renderResults(data)
    }

    // Long-running poll loop
    async function startPolling() {
      while (ctx.isValid) {
        await processPage()
        await new Promise(r => ctx.setTimeout(r, 3000))
        // ctx.setTimeout auto-cancels on invalidation
      }
    }

    startPolling()
  },
})
```

### ctx API Reference

```typescript
interface ContentScriptContext {
  // State
  isValid: boolean               // False after extension reloads
  signal: AbortSignal            // Aborted when context is invalid

  // Event listening (auto-cleaned up)
  addEventListener(
    target: EventTarget,
    type: string,
    listener: EventListener,
    options?: boolean | AddEventListenerOptions
  ): void

  // Lifecycle
  onInvalidated(cb: () => void): void

  // Timer wrappers (auto-cancelled on invalidation)
  setTimeout(cb: () => void, ms: number): number
  setInterval(cb: () => void, ms: number): number
}
```

## DOM Extraction Patterns

### Generic Text Extraction

```typescript
// utils/extraction.ts
export function extractVisibleText(root: Element = document.body): string {
  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        const parent = node.parentElement
        if (!parent) return NodeFilter.FILTER_REJECT

        // Skip hidden elements
        const style = window.getComputedStyle(parent)
        if (style.display === 'none' || style.visibility === 'hidden') {
          return NodeFilter.FILTER_REJECT
        }

        // Skip scripts, styles, etc.
        const tag = parent.tagName.toLowerCase()
        if (['script', 'style', 'noscript'].includes(tag)) {
          return NodeFilter.FILTER_REJECT
        }

        return NodeFilter.FILTER_ACCEPT
      },
    }
  )

  const texts: string[] = []
  let node: Node | null
  while ((node = walker.nextNode())) {
    const text = node.textContent?.trim()
    if (text) texts.push(text)
  }

  return texts.join('\n')
}
```

### Google Docs Extraction

Google Docs renders content in `.kix-lineview` elements (Kix is the internal name):

```typescript
// entrypoints/gdocs.content/index.ts
export default defineContentScript({
  matches: ['https://docs.google.com/document/*'],

  main(ctx) {
    ctx.addEventListener(window, 'wxt:locationchange', () => extractDoc())
    extractDoc()
  },
})

function extractDoc() {
  // Document ID from URL
  const match = window.location.href.match(/\/d\/([a-zA-Z0-9-_]+)/)
  const docId = match?.[1] ?? '';

  // Lines are rendered as .kix-lineview elements
  const lines = document.querySelectorAll('.kix-lineview')
  const text = Array.from(lines)
    .map(el => el.textContent ?? '')
    .filter(Boolean)
    .join('\n')

  // Headers are in .kix-lineview-text-block with specific heading styles
  const paragraphs = document.querySelectorAll('.kix-paragraphrenderer')
  const structured = Array.from(paragraphs).map(p => ({
    text: p.textContent ?? '',
    isHeading: p.querySelector('[class*="heading"]') !== null,
  }))

  browser.runtime.sendMessage({ type: 'DOC_EXTRACTED', docId, text, structured })
}
```

### Overleaf / CodeMirror Extraction

Overleaf uses CodeMirror editor. Content is in the CM EditorView instance:

```typescript
// entrypoints/overleaf.content.ts
export default defineContentScript({
  matches: ['https://www.overleaf.com/project/*'],

  main(ctx) {
    // Wait for CodeMirror to initialize
    waitForEditor().then(extractContent)
  },
})

async function waitForEditor(): Promise<void> {
  return new Promise((resolve) => {
    const check = () => {
      if (document.querySelector('.cm-editor')) resolve()
      else setTimeout(check, 500)
    }
    check()
  })
}

function extractContent() {
  // CodeMirror 6: get EditorView from the DOM element
  const editorEl = document.querySelector('.cm-editor') as any
  if (!editorEl?._editorView) {
    // Fallback: read from code lines directly
    const lines = document.querySelectorAll('.cm-line')
    const text = Array.from(lines).map(l => l.textContent ?? '').join('\n')
    browser.runtime.sendMessage({ type: 'LATEX_EXTRACTED', text })
    return
  }

  const view = editorEl._editorView
  const text = view.state.doc.toString()
  browser.runtime.sendMessage({ type: 'LATEX_EXTRACTED', text })
}
```

### Reading Page Selection

```typescript
export function getSelectedText(): string {
  return window.getSelection()?.toString() ?? '';
}

export function getSelectedHtml(): string {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0) return '';

  const range = selection.getRangeAt(0)
  const div = document.createElement('div')
  div.appendChild(range.cloneContents())
  return div.innerHTML
}
```

## Text Insertion Patterns

### Standard Cursor Insertion

Works in `<textarea>`, `<input>`, and plain `contenteditable` elements:

```typescript
// utils/insertion.ts
export function insertAtCursor(text: string): boolean {
  const active = document.activeElement
  if (!active) return false

  // Input / textarea
  if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) {
    const start = active.selectionStart ?? 0
    const end = active.selectionEnd ?? 0
    const current = active.value
    active.value = current.slice(0, start) + text + current.slice(end)
    active.selectionStart = active.selectionEnd = start + text.length
    active.dispatchEvent(new Event('input', { bubbles: true }))
    return true
  }

  // contenteditable
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0) return false

  const range = selection.getRangeAt(0)
  range.deleteContents()

  const textNode = document.createTextNode(text)
  range.insertNode(textNode)

  // Move cursor to end of inserted text
  range.setStartAfter(textNode)
  range.setEndAfter(textNode)
  selection.removeAllRanges()
  selection.addRange(range)

  // Trigger framework reactivity where applicable
  textNode.parentElement?.dispatchEvent(new Event('input', { bubbles: true }))
  return true
}
```

### Clipboard Insertion (Google Docs Workaround)

Some editors (Google Docs, Notion) intercept DOM mutations and don't reflect them properly. Use clipboard insertion:

```typescript
export async function insertViaClipboard(text: string): Promise<boolean> {
  // Save current clipboard
  let previousClipboard = '';
  try {
    previousClipboard = await navigator.clipboard.readText()
  } catch { /* ignore */ }

  try {
    await navigator.clipboard.writeText(text)
    const success = document.execCommand('paste')

    // Restore clipboard
    if (previousClipboard) {
      setTimeout(() => navigator.clipboard.writeText(previousClipboard), 100)
    }

    return success
  } catch {
    return false
  }
}

// Combo: try direct insertion first, fall back to clipboard
export async function smartInsert(text: string): Promise<boolean> {
  if (insertAtCursor(text)) return true
  return insertViaClipboard(text)
}
```

Note: `navigator.clipboard` requires either user gesture or `"clipboardRead"` / `"clipboardWrite"` permissions.

## DOM Observation Patterns

### MutationObserver with Cleanup

```typescript
export default defineContentScript({
  main(ctx) {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node instanceof HTMLElement && node.matches('.target-class')) {
            processElement(node)
          }
        }
      }
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    })

    // Clean up when extension reloads
    ctx.onInvalidated(() => observer.disconnect())
  },
})
```

### IntersectionObserver for Lazy Processing

```typescript
export default defineContentScript({
  main(ctx) {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            processVisibleElement(entry.target as HTMLElement)
            observer.unobserve(entry.target)
          }
        }
      },
      { threshold: 0.1 }
    )

    document.querySelectorAll('.lazy-target').forEach(el => observer.observe(el))
    ctx.onInvalidated(() => observer.disconnect())
  },
})
```

## Communication with Background / Side Panel

### One-time Message

```typescript
// From content script
const response = await browser.runtime.sendMessage({
  type: 'PROCESS_DATA',
  payload: { text: extractedText },
})
```

### Long-lived Port Connection

```typescript
// entrypoints/content.ts
let port: browser.Runtime.Port | null = null

export default defineContentScript({
  main(ctx) {
    port = browser.runtime.connect({ name: 'content-stream' })

    port.onMessage.addListener((msg) => {
      if (msg.type === 'HIGHLIGHT') highlightText(msg.text)
    })

    port.onDisconnect.addListener(() => {
      port = null
    })

    ctx.onInvalidated(() => {
      port?.disconnect()
      port = null
    })
  },
})
```

### Receiving Messages from Side Panel

```typescript
// entrypoints/sidepanel/App.vue
async function sendCommandToPage(command: string) {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true })
  if (!tab.id) return

  const response = await browser.tabs.sendMessage(tab.id, {
    type: 'EXECUTE_COMMAND',
    command,
  })
  return response
}
```

```typescript
// entrypoints/content.ts
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'EXECUTE_COMMAND') {
    executeCommand(message.command)
    sendResponse({ success: true })
  }
})
```

## Shadow DOM UI Isolation

Shadow DOM completely isolates the extension's CSS from the page's CSS:

```typescript
export default defineContentScript({
  cssInjectionMode: 'ui',   // Required! Injects CSS inside shadow root

  async main(ctx) {
    const { mount, remove } = await createShadowRootUi(ctx, {
      name: 'my-ext',           // Used as custom element tag name
      position: 'overlay',      // 'inline' | 'overlay' | 'modal'
      zIndex: 2147483647,       // Max z-index for overlay/modal
      anchor: '#toolbar',       // Where to insert (CSS selector or Element)
      append: 'after',          // 'first' | 'last' | 'before' | 'after'

      onMount(container, shadow, shadowHost) {
        // container — the mounting point inside shadow root
        // shadow — the ShadowRoot itself
        // shadowHost — the custom element in the page DOM
        const app = createApp(MyComponent)
        app.mount(container)
        return app
      },

      onRemove(app) {
        app?.unmount()
      },
    })

    mount()
  },
})
```

### Adding Fonts to Shadow DOM

Custom fonts don't work inside shadow DOM by default:

```typescript
onMount(container, shadow) {
  // Inject font stylesheet into shadow root
  const link = document.createElement('link')
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap';
  shadow.appendChild(link)

  const app = createApp(MyComponent)
  app.mount(container)
  return app
}
```

## Integrated UI (No Isolation)

When you want your UI to look like part of the page:

```typescript
const ui = createIntegratedUi(ctx, {
  position: 'inline',
  anchor: '.page-header',
  append: 'last',
  onMount(container) {
    const app = createApp(MyWidget)
    app.mount(container)
    return app
  },
  onRemove(app) { app?.unmount(); },
})

// Auto-mount: watches for anchor element, mounts when it appears
ui.autoMount()
```

## Page-Specific Detection

Detect what page the user is on and adapt behavior:

```typescript
// utils/page-detection.ts
export type PageType = 'article' | 'search' | 'profile' | 'unknown';

export function detectPageType(): PageType {
  const { pathname, hostname } = location

  if (hostname === 'news.ycombinator.com') {
    if (pathname === '/') return 'search';
    if (pathname.startsWith('/item')) return 'article';
  }

  // Check meta tags
  const ogType = document.querySelector('meta[property="og:type"]')?.getAttribute('content')
  if (ogType === 'article') return 'article';

  // Check JSON-LD
  const scripts = document.querySelectorAll('script[type="application/ld+json"]')
  for (const script of scripts) {
    try {
      const data = JSON.parse(script.textContent ?? '')
      if (data['@type'] === 'Article') return 'article';
    } catch { /* ignore */ }
  }

  return 'unknown';
}
```
