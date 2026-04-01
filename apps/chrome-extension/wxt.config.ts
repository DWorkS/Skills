import ui from '@nuxt/ui/vite'
import { defineConfig } from 'wxt'

export default defineConfig({
  // All source lives under src/ — WXT discovers entrypoints, components,
  // composables, utils, assets, and locales relative to this directory.
  srcDir: 'src',

  modules: [
    '@wxt-dev/module-vue',
    '@wxt-dev/auto-icons',
    '@wxt-dev/i18n/module',
  ],

  vite: () => ({
    plugins: [
      ui({
        router: false, // Extensions do not use vue-router
        colorMode: true, // Enable dark/light mode (uses @vueuse/core)

        // ── Theme configuration ────────────────────────────────────────────
        // Set the semantic color aliases. Change these to match your brand.
        // Use any Tailwind default color name OR a custom color defined in
        // @theme in assets/main.css.
        ui: {
          colors: {
            primary: 'rose', // Customise: 'blue' | 'violet' | 'rose' | …
            neutral: 'neutral', // Customise: 'zinc' | 'gray' | 'stone' | …
          },
        },
      }),
    ],
  }),

  manifest: {
    name: '__MSG_extName__',
    description: '__MSG_extDescription__',
    default_locale: 'en',
    version: '1.0.0',

    permissions: [
      'storage',
      'activeTab',
      'contextMenus',
      'alarms',
      'sidePanel',
      'scripting',
      'clipboardWrite',
    ],

    host_permissions: ['<all_urls>'],

    side_panel: {
      default_path: 'sidepanel.html',
    },

    commands: {
      // _execute_action fires on toolbar icon click (opens side panel)
      '_execute_action': {
        suggested_key: {
          default: 'Ctrl+Shift+S',
          mac: 'Command+Shift+S',
        },
        description: 'Open PageNote Pro',
      },
      'toggle-widget': {
        suggested_key: {
          default: 'Ctrl+Shift+H',
          mac: 'Command+Shift+H',
        },
        description: 'Toggle selection widget on this page',
      },
    },
  },

  // @wxt-dev/auto-icons: place icon at assets/icon.svg or icon.png
  autoIcons: {
    developmentIndicator: 'grayscale',
  },
})
