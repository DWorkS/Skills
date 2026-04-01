/**
 * Content script — runs on every page.
 *
 * Mounts a shadow DOM overlay (PageNote widget) that appears when the
 * user selects text. The widget floats near the selection and lets
 * users save the snippet with an optional note.
 *
 * Key patterns demonstrated:
 *  - createShadowRootUi with Vue + Nuxt UI inside shadow DOM
 *  - ctx.addEventListener for safe event listeners (auto-cleaned up)
 *  - ctx.onInvalidated for explicit cleanup
 *  - SPA navigation via wxt:locationchange
 *  - webext-bridge/content-script messaging
 *  - Keyboard shortcut handling (toggle-widget from background)
 */

import nuxtUi from '@nuxt/ui/vue-plugin'
import { createApp } from 'vue'
// Re-export storage item so the content script can access settings
// without importing the whole utils/storage module (tree-shaken by Vite)
import { settingsStorage } from '../../utils/storage'
import SelectionWidget from './SelectionWidget.vue'

import '../../assets/main.css'

// Import must be side-effect only — lets webext-bridge know
// this is a content-script context.
import 'webext-bridge/content-script'

export default defineContentScript({
  // Run on all URLs — the widget handles showing/hiding itself
  matches: ['<all_urls>'],
  cssInjectionMode: 'ui', // Required: injects CSS into shadow DOM

  async main(ctx) {
    // Read the initial widget setting from storage
    let widgetEnabled = (await settingsStorage.getValue()).showSelectionWidget

    // Mount the shadow DOM UI
    const ui = await createShadowRootUi(ctx, {
      name: 'pagenote-widget',
      position: 'inline',
      anchor: 'body',
      append: 'after', // appended AFTER </body> — does not affect layout

      onMount(container) {
        const app = createApp(SelectionWidget, {
          // Pass initial enabled state and a callback the widget
          // can use to report that the user saved a snippet.
          enabled: widgetEnabled,
        })
        app.use(nuxtUi)
        app.mount(container)
        return app
      },

      onRemove(app) {
        app?.unmount()
      },
    })

    ui.mount()

    // ── Listen for toggle-widget message from background ──────────────────
    // (fired when the user presses Ctrl/Cmd+Shift+H)
    const { onMessage } = await import('webext-bridge/content-script')
    onMessage('toggle-widget', ({ data }) => {
      widgetEnabled = data.visible
      // Re-mount with new prop (simplest approach — unmount + remount)
      ui.remove()
      createShadowRootUi(ctx, {
        name: 'pagenote-widget',
        position: 'inline',
        anchor: 'body',
        append: 'after',
        onMount(container) {
          const app = createApp(SelectionWidget, { enabled: widgetEnabled })
          app.use(nuxtUi)
          app.mount(container)
          return app
        },
        onRemove(app) { app?.unmount() },
      }).then(newUi => newUi.mount())
    })

    // ── SPA navigation support ────────────────────────────────────────────
    // Fires on every URL change in SPAs (YouTube, GitHub, etc.)
    // Use ctx.addEventListener so the listener is cleaned up automatically.
    ctx.addEventListener(window, 'wxt:locationchange', () => {
      // The widget mounts to body and manages its own position reactively,
      // so no action needed here — just log in debug mode.
      if (import.meta.env.VITE_DEBUG === 'true') {
        console.debug('[PageNote] SPA navigation detected:', location.href)
      }
    })

    // ── Context invalidation cleanup ──────────────────────────────────────
    ctx.onInvalidated(() => {
      ui.remove()
    })
  },
})
