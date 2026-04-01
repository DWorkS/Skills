# PageNote Pro

A full-featured browser extension for saving and organising text snippets from any webpage. Built with **WXT + Vue 3 + Nuxt UI 4** to demonstrate every feature of the `chrome-extension-builder` skill.

---

## Prerequisites

- Node.js ≥ 18
- Yarn (`yarn.lock` is committed)

## Getting started

```bash
# Install dependencies (also runs wxt prepare via postinstall)
yarn install

# Start dev server with HMR (Chrome)
yarn dev
```

Load in Chrome:
1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** → select `.output/chrome-mv3/`

---

## Available scripts

| Script | Description |
|---|---|
| `yarn dev` | Chrome dev server with HMR |
| `yarn dev:firefox` | Firefox dev server |
| `yarn build` | Lint + test + Chrome production build |
| `yarn build:firefox` | Lint + test + Firefox production build |
| `yarn zip` | Lint + test + Chrome store-ready ZIP |
| `yarn zip:all` | Lint + test + Chrome & Firefox ZIPs |
| `yarn compile` | Type-check without building |
| `yarn test` | Vitest unit tests |
| `yarn test:watch` | Vitest watch mode |
| `yarn test:e2e` | Playwright E2E tests |
| `yarn lint` | ESLint |
| `yarn lint:fix` | ESLint auto-fix |

> `build`, `zip`, and their variants automatically run lint and tests first.

---

## Project structure

```
app/
├── src/                          # All source (WXT srcDir: 'src')
│   ├── entrypoints/
│   │   ├── background.ts         # Service worker hub
│   │   ├── content/              # Content script + shadow DOM widget
│   │   │   ├── index.ts
│   │   │   └── SelectionWidget.vue
│   │   ├── popup/                # Toolbar popup
│   │   ├── sidepanel/            # Full library side panel
│   │   └── options/              # Settings page (full tab)
│   ├── components/               # Auto-imported Vue components
│   │   ├── SnippetCard.vue
│   │   └── EmptyState.vue
│   ├── composables/              # Auto-imported composables
│   │   └── useSnippets.ts
│   ├── stores/                   # Pinia stores (import manually)
│   │   └── snippets.ts
│   ├── utils/                    # Auto-imported utilities
│   │   ├── storage.ts            # Typed WXT storage + data models
│   │   ├── helpers.ts            # generateId, getDomain, truncate, etc.
│   │   └── insertion.ts          # insertAtCursor, smartInsert
│   ├── assets/
│   │   ├── icon.png              # Source icon — auto-icons generates all sizes
│   │   └── main.css              # @import "tailwindcss"; @import "@nuxt/ui"
│   ├── locales/
│   │   ├── en.json               # English translations (@wxt-dev/i18n)
│   │   └── de.json               # German translations
│   ├── types/
│   │   └── messages.d.ts         # webext-bridge ProtocolMap declarations
│   └── test/
│       ├── setup.ts              # Vitest browser API mocks
│       ├── utils/helpers.test.ts
│       └── stores/snippets.test.ts
├── wxt.config.ts                 # WXT + modules + Nuxt UI configuration
├── vitest.config.ts
├── eslint.config.js              # @antfu/eslint-config (Vue + TS flat config)
├── tsconfig.json
└── package.json
```

---

## Features

| WXT Feature | Where |
|---|---|
| Service worker, context menus, alarms | `src/entrypoints/background.ts` |
| Toolbar popup (Vue + Nuxt UI) | `src/entrypoints/popup/` |
| Side panel (Pinia + search + filter) | `src/entrypoints/sidepanel/` |
| Options page (full tab, export, clear all) | `src/entrypoints/options/` |
| Content script + Shadow DOM widget | `src/entrypoints/content/` |
| SPA navigation (`wxt:locationchange`) | `src/entrypoints/content/index.ts` |
| Context invalidation cleanup | `src/entrypoints/content/index.ts` |
| `@wxt-dev/auto-icons` | `src/assets/icon.png` → all sizes |
| `@wxt-dev/i18n` (JSON, EN + DE) | `src/locales/` |
| `@wxt-dev/module-vue` | `wxt.config.ts` |
| Versioned storage with migration | `src/utils/storage.ts` |
| Keyboard shortcuts + commands | `wxt.config.ts` + background |
| webext-bridge typed messaging | `src/types/messages.d.ts` |
| Pinia store (storage-synced, watched) | `src/stores/snippets.ts` |
| Text insertion utilities | `src/utils/insertion.ts` |
| Unit tests (Vitest) | `src/test/` |

---

## How it works

**Three ways to save a snippet:**
1. Select text on any page → floating "Save" button → add note + colour → save
2. Right-click selected text → "Save to PageNote Pro"
3. `Cmd/Ctrl+Shift+S` opens the side panel; `Cmd/Ctrl+Shift+H` toggles the widget

**Access your library:**
- **Popup** — 5 most recent snippets + badge count
- **Side panel** — full library with full-text search, domain filter, group-by-domain
- **Options** — theme, limit, language, JSON export, clear all

**Messaging architecture:**
```
content / popup / sidepanel / options
         ↕  webext-bridge
        background (single source of truth)
             ↕  WXT storage
       local:snippets   sync:settings
```

---

## Environment variables

| Variable | Dev | Prod |
|---|---|---|
| `VITE_API_BASE` | `http://localhost:3000` | `https://api.pagenote.pro` |
| `VITE_DEBUG` | `true` | `false` |
| `VITE_ENABLE_WIDGET` | `true` | `true` |
