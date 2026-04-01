# Chrome Extension Best Practices with WXT

Security, performance, and architecture recommendations.

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
});
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
    .replace(/'/g, '&#x27;');
}
```

Use DOMPurify for HTML content:

```typescript
import DOMPurify from 'dompurify';

const clean = DOMPurify.sanitize(html, {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a'],
  ALLOWED_ATTR: ['href'],
});
```

### Secure API Calls

Never hardcode API keys:

```typescript
// Store in browser.storage, not in code
const { apiKey } = await browser.storage.local.get('apiKey');

const response = await fetch(url, {
  headers: {
    'Authorization': `Bearer ${apiKey}`,
  },
});
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
    });

    // Unregister listeners when not needed
    let listener: any;

    function enable() {
      listener = (msg: any) => handleMessage(msg);
      browser.runtime.onMessage.addListener(listener);
    }

    function disable() {
      if (listener) {
        browser.runtime.onMessage.removeListener(listener);
        listener = null;
      }
    }
  },
});
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
      const { createApp } = await import('vue');
      const { default: App } = await import('./components/App.vue');
      const { default: nuxtUi } = await import('@nuxt/ui/vue-plugin');

      const container = document.getElementById('root')!;
      const app = createApp(App);
      app.use(nuxtUi);
      app.mount(container);
    });
  },
});
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
});
```

### Caching Strategy

Cache API responses appropriately:

```typescript
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

async function getCachedData(key: string) {
  const cached = await storage.getItem<{data: any, timestamp: number}>(`cache:${key}`);

  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

  const freshData = await fetchData(key);
  await storage.setItem(`cache:${key}`, {
    data: freshData,
    timestamp: Date.now(),
  });

  return freshData;
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
    request: { url: string };
    response: { data: any };
  };
  'save-settings': {
    request: { settings: Record<string, any> };
    response: { success: boolean };
  };
}

// utils/messaging.ts
export async function sendMessage<K extends keyof MessageMap>(
  type: K,
  payload: MessageMap[K]['request']
): Promise<MessageMap[K]['response']> {
  return await browser.runtime.sendMessage({ type, payload });
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
    super(message);
    this.name = 'ExtensionError';
  }
}

// Usage
try {
  await riskyOperation();
} catch (error) {
  if (error instanceof ExtensionError) {
    // Handle known error
    console.error(`Error ${error.code}:`, error.message, error.context);
  } else {
    // Handle unknown error
    console.error('Unexpected error:', error);
  }

  // Report to user
  await browser.notifications.create({
    type: 'basic',
    title: 'Error',
    message: 'Something went wrong',
  });
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
  notifications: boolean;
}

const settingsItem = storage.defineItem<UserSettings>('local:settings', {
  fallback: { theme: 'auto', notifications: true },
});

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<UserSettings>({ theme: 'auto', notifications: true });
  const isLoaded = ref(false);

  async function load() {
    settings.value = await settingsItem.getValue();
    // Keep in sync with storage changes
    settingsItem.watch((newValue) => {
      if (newValue) settings.value = newValue;
    });
    isLoaded.value = true;
  }

  async function update(updates: Partial<UserSettings>) {
    settings.value = { ...settings.value, ...updates };
    await settingsItem.setValue(settings.value);
  }

  return { settings, isLoaded, load, update };
});
```

Usage in Vue components — Pinia stores are auto-imported like composables:

```vue
<script setup lang="ts">
const store = useSettingsStore();
onMounted(() => store.load());
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
    setupFiles: ['./test/setup.ts'],
    globals: true,
  },
});

// test/setup.ts
import { vi } from 'vitest';

global.browser = {
  runtime: {
    sendMessage: vi.fn(),
  },
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
    },
  },
} as any;
```

### E2E Tests

```typescript
// e2e/extension.spec.ts
import { test, expect } from '@playwright/test';

test('popup loads correctly', async ({ page, extensionId }) => {
  await page.goto(`chrome-extension://${extensionId}/popup.html`);
  await expect(page.locator('h1')).toHaveText('My Extension');
});
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
