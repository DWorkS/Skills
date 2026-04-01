# Messaging Patterns Reference

Cross-context communication patterns for Chrome extensions.

## Table of Contents

- [webext-bridge (Recommended)](#webext-bridge-recommended)
- [Communication Contexts](#communication-contexts)
- [One-Time Messages](#one-time-messages)
- [Long-Lived Connections](#long-lived-connections)
- [Content Script to Background](#content-script-to-background)
- [Background to Content Script](#background-to-content-script)
- [Protocol Design](#protocol-design)

---

## webext-bridge (Recommended)

`webext-bridge` is the recommended messaging library for WXT projects. It provides typed, context-aware messaging without manual listener setup.

```bash
pnpm i webext-bridge
```

### Setup

No configuration needed — just import from the correct context path:

```typescript
// Background
import { onMessage, sendMessage } from 'webext-bridge/background';

// Content script
import { onMessage, sendMessage } from 'webext-bridge/content-script';

// Popup
import { onMessage, sendMessage } from 'webext-bridge/popup';

// Side panel
import { onMessage, sendMessage } from 'webext-bridge/side-panel';

// Options page
import { onMessage, sendMessage } from 'webext-bridge/options';

// DevTools
import { onMessage, sendMessage } from 'webext-bridge/devtools';
```

### Type-Safe Protocol with webext-bridge

```typescript
// types/messages.ts
declare module 'webext-bridge' {
  export interface ProtocolMap {
    'get-settings': { data: void; response: Settings };
    'save-settings': { data: Settings; response: void };
    'extract-page': { data: { url: string }; response: { text: string } };
    'highlight-text': { data: { text: string; color: string }; response: void };
  }
}
```

```typescript
// entrypoints/background.ts
import { onMessage } from 'webext-bridge/background';

onMessage('get-settings', async () => {
  return await settingsStorage.getValue();
});

onMessage('extract-page', async ({ data }) => {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  const result = await sendMessage('do-extract', {}, `content-script@${tab.id}`);
  return { text: result.text };
});
```

```typescript
// entrypoints/sidepanel/App.vue
import { sendMessage } from 'webext-bridge/side-panel';

const settings = await sendMessage('get-settings', undefined);
// settings is typed as Settings
```

```typescript
// entrypoints/content.ts
import { onMessage, sendMessage } from 'webext-bridge/content-script';

onMessage('do-extract', async () => {
  return { text: document.body.innerText };
});

// Send to background
const result = await sendMessage('save-settings', newSettings);
```

### Sending to Specific Tabs

Content scripts are identified by `content-script@{tabId}`:

```typescript
// entrypoints/background.ts
import { sendMessage } from 'webext-bridge/background';

async function highlightInTab(tabId: number, text: string) {
  await sendMessage('highlight-text', { text, color: 'yellow' }, `content-script@${tabId}`);
}
```

---

## Communication Contexts

```
┌─────────────────────────────────────────────────────────────┐
│                     Extension Contexts                       │
├──────────────┬──────────────┬──────────────┬───────────────┤
│  Background  │   Popup/UI   │ Side Panel   │ Options Page  │
│  (Service    │              │              │               │
│   Worker)    │              │              │               │
└──────┬───────┴──────┬───────┴──────┬───────┴───────┬───────┘
       │              │              │               │
       │    runtime.sendMessage / runtime.connect    │
       │              │              │               │
       ▼              ▼              ▼               ▼
┌─────────────────────────────────────────────────────────────┐
│                    Content Scripts                           │
│              (Isolated world on web pages)                   │
└─────────────────────────────────────────────────────────────┘
       │
       │  tabs.sendMessage / scripting.executeScript
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│                      Web Pages                               │
│                  (MAIN world scripts)                        │
└─────────────────────────────────────────────────────────────┘
```

---

## One-Time Messages

Simple request-response pattern.

### Send Message

```typescript
// From any context to background
const response = await browser.runtime.sendMessage({
  type: 'GET_DATA',
  payload: { id: '123' },
});
console.log('Response:', response);
```

### Listen in Background

```typescript
// entrypoints/background.ts
export default defineBackground(() => {
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'GET_DATA') {
      // Sync response
      sendResponse({ success: true, data: [] });

      // For async: return true and call sendResponse later
      // handleAsync(message).then(sendResponse);
      // return true;
    }
    return false; // No async response
  });
});
```

### Async Handler Pattern

```typescript
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'FETCH_DATA') {
    (async () => {
      try {
        const data = await fetchData(message.payload);
        sendResponse({ success: true, data });
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true; // Keep message channel open
  }
});
```

---

## Long-Lived Connections

For continuous communication or streaming data.

### Content Script to Background

```typescript
// content/main.ts
export default defineContentScript({
  matches: ['https://example.com/*'],
  main(ctx) {
    const port = browser.runtime.connect({ name: 'content-channel' });

    port.onMessage.addListener((message) => {
      console.log('Received from background:', message);
    });

    port.postMessage({ type: 'HELLO', url: window.location.href });

    // Cleanup on invalidation
    ctx.onInvalidated(() => {
      port.disconnect();
    });
  },
});
```

### Background Handler

```typescript
// entrypoints/background.ts
export default defineBackground(() => {
  const connections = new Map<number, browser.Runtime.Port>();

  browser.runtime.onConnect.addListener((port) => {
    if (port.name === 'content-channel') {
      const tabId = port.sender?.tab?.id;
      if (tabId) connections.set(tabId, port);

      port.onMessage.addListener((message) => {
        console.log('From content script:', message);
        port.postMessage({ type: 'ACK', received: message.type });
      });

      port.onDisconnect.addListener(() => {
        if (tabId) connections.delete(tabId);
      });
    }
  });

  // Broadcast to all connected content scripts
  function broadcast(message: unknown) {
    connections.forEach((port) => port.postMessage(message));
  }
});
```

---

## Content Script to Background

### Simple Message

```typescript
// content/main.ts
const response = await browser.runtime.sendMessage({
  type: 'PAGE_DATA',
  data: { url: window.location.href, title: document.title },
});
```

### With Tab Information

Background automatically receives sender info:

```typescript
// background.ts
browser.runtime.onMessage.addListener((message, sender) => {
  console.log('From tab:', sender.tab?.id);
  console.log('From URL:', sender.tab?.url);
  console.log('Frame ID:', sender.frameId);
});
```

---

## Background to Content Script

### Send to Specific Tab

```typescript
// background.ts
async function sendToTab(tabId: number, message: unknown) {
  try {
    const response = await browser.tabs.sendMessage(tabId, message);
    return response;
  } catch (error) {
    // Content script may not be loaded
    console.error('Failed to send to tab:', error);
  }
}

// Usage
const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
if (tab?.id) {
  await sendToTab(tab.id, { type: 'UPDATE_UI', data: {} });
}
```

### Broadcast to All Matching Tabs

```typescript
async function broadcastToPattern(pattern: string, message: unknown) {
  const tabs = await browser.tabs.query({ url: pattern });
  const results = await Promise.allSettled(
    tabs.map((tab) =>
      tab.id ? browser.tabs.sendMessage(tab.id, message) : Promise.reject()
    )
  );
  return results;
}

// Usage
await broadcastToPattern('https://docs.google.com/*', {
  type: 'REFRESH',
});
```

### Listen in Content Script

```typescript
// content/main.ts
export default defineContentScript({
  matches: ['https://example.com/*'],
  main(ctx) {
    browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'GET_PAGE_DATA') {
        const data = extractPageData();
        sendResponse(data);
      }
      return false;
    });
  },
});
```

---

## Protocol Design

### Type-Safe Message Protocol

```typescript
// lib/protocol.ts
export const PROTOCOL_VERSION = '1.0.0';

// Request types
export type RequestMessage =
  | { type: 'DOC_OPEN'; doc: DocPayload }
  | { type: 'DOC_CHUNK'; docId: string; chunk: string; index: number; total: number }
  | { type: 'DOC_DONE'; docId: string }
  | { type: 'CANCEL'; docId: string };

// Response types
export type ResponseMessage =
  | { type: 'ACK'; requestType: string }
  | { type: 'PROGRESS'; docId: string; stage: string; percent: number }
  | { type: 'SUGGESTIONS'; docId: string; batchId: string; items: Suggestion[] }
  | { type: 'DONE'; docId: string }
  | { type: 'ERROR'; code: ErrorCode; message: string };

export type ErrorCode =
  | 'VERSION_MISMATCH'
  | 'INVALID_DOC'
  | 'PROCESSING_FAILED'
  | 'TIMEOUT';

// Payloads
export interface DocPayload {
  docId: string;
  title: string;
  source: { type: 'google-docs' | 'overleaf'; id: string; url: string };
  cursorContext?: { before: string; after: string };
  headings?: { text: string; start: number }[];
}

export interface Suggestion {
  id: string;
  title: string;
  category: string;
  suggestion: string;
  rationale: string;
  sources?: { label: string; url: string }[];
  confidence: number;
}

// Envelope wrapper
export interface MessageEnvelope<T> {
  protocolVersion: string;
  timestamp: number;
  message: T;
}

export function createMessage<T extends RequestMessage>(
  message: T
): MessageEnvelope<T> {
  return {
    protocolVersion: PROTOCOL_VERSION,
    timestamp: Date.now(),
    message,
  };
}
```

### Message Handler with Type Safety

```typescript
// lib/messageHandler.ts
import type { RequestMessage, ResponseMessage } from './protocol';

type Handler<T extends RequestMessage['type']> = (
  message: Extract<RequestMessage, { type: T }>
) => Promise<ResponseMessage>;

export class MessageRouter {
  private handlers = new Map<string, Handler<any>>();

  on<T extends RequestMessage['type']>(type: T, handler: Handler<T>): this {
    this.handlers.set(type, handler);
    return this;
  }

  async handle(message: RequestMessage): Promise<ResponseMessage> {
    const handler = this.handlers.get(message.type);
    if (!handler) {
      return { type: 'ERROR', code: 'INVALID_DOC', message: `Unknown type: ${message.type}` };
    }
    return handler(message);
  }
}

// Usage in background
const router = new MessageRouter()
  .on('DOC_OPEN', async (msg) => {
    await processDocument(msg.doc);
    return { type: 'ACK', requestType: 'DOC_OPEN' };
  })
  .on('DOC_CHUNK', async (msg) => {
    await storeChunk(msg.docId, msg.chunk, msg.index);
    return { type: 'ACK', requestType: 'DOC_CHUNK' };
  });
```

### Chunked Data Transfer

```typescript
// lib/chunker.ts
const CHUNK_SIZE = 200 * 1024; // 200 KB

export function* chunkText(text: string): Generator<{ chunk: string; index: number; total: number }> {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(text);
  const total = Math.ceil(bytes.length / CHUNK_SIZE);

  for (let i = 0; i < total; i++) {
    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, bytes.length);
    const chunkBytes = bytes.slice(start, end);
    const chunk = new TextDecoder().decode(chunkBytes);
    yield { chunk, index: i, total };
  }
}

// Usage
async function sendDocument(docId: string, text: string) {
  for (const { chunk, index, total } of chunkText(text)) {
    await sendMessage({
      type: 'DOC_CHUNK',
      docId,
      chunk,
      index,
      total,
    });
  }
  await sendMessage({ type: 'DOC_DONE', docId });
}
```

---

## Error Handling

### Connection Errors

```typescript
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message)
    .then(sendResponse)
    .catch((error) => {
      sendResponse({
        type: 'ERROR',
        code: 'PROCESSING_FAILED',
        message: error.message,
      });
    });
  return true;
});
```

### Timeout Handling

```typescript
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), ms)
    ),
  ]);
}

// Usage
try {
  const response = await withTimeout(
    browser.runtime.sendMessage({ type: 'GET_DATA' }),
    5000
  );
} catch (error) {
  if (error.message === 'Timeout') {
    // Handle timeout
  }
}
```

### Retry Logic

```typescript
async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  delay = 1000
): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxAttempts) throw error;
      await new Promise((r) => setTimeout(r, delay * attempt));
    }
  }
  throw new Error('Unreachable');
}
```
