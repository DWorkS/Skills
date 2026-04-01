<script setup lang="ts">
/**
 * SelectionWidget
 *
 * Floats near the user's text selection.
 * On click it expands to a mini-form with an optional note field.
 * Submits via webext-bridge to the background service worker.
 *
 * Rendered inside a shadow DOM — styles are fully isolated from the host page.
 */

import type { SnippetColor } from '../../utils/storage'
import { sendMessage } from 'webext-bridge/content-script'
import { useAppI18n } from '../../composables/useAppI18n'

// ── Props ──────────────────────────────────────────────────────────────────
const props = defineProps<{
  enabled?: boolean
}>()

// ── Regex patterns ─────────────────────────────────────────────────────────────
const WWW_PREFIX_REGEX = /^www\./

const { t } = useAppI18n()

// ── State ──────────────────────────────────────────────────────────────────
const visible = ref(false)
const expanded = ref(false)
const saving = ref(false)
const saved = ref(false)

const selectedText = ref('')
const note = ref('')
const color = ref<SnippetColor>('yellow')

// Position of the button (fixed, relative to viewport)
const position = ref({ top: 0, left: 0 })

// ── Color palette for quick selection ─────────────────────────────────────
const COLORS: { value: SnippetColor, bg: string, ring: string }[] = [
  { value: 'yellow', bg: 'bg-yellow-300', ring: 'ring-yellow-500' },
  { value: 'green', bg: 'bg-green-300', ring: 'ring-green-500' },
  { value: 'blue', bg: 'bg-blue-300', ring: 'ring-blue-500' },
  { value: 'pink', bg: 'bg-pink-300', ring: 'ring-pink-500' },
  { value: 'purple', bg: 'bg-purple-300', ring: 'ring-purple-600' },
]

// ── Selection tracking ─────────────────────────────────────────────────────
function handleMouseUp() {
  if (!props.enabled)
    return

  // Wait a tick for the selection to finalise
  setTimeout(() => {
    const selection = window.getSelection()
    const text = selection?.toString().trim() ?? ''

    if (!selection || selection.isCollapsed || text.length < 3) {
      // Don't hide immediately — user might be clicking the widget
      return
    }

    const range = selection.getRangeAt(0)
    const rect = range.getBoundingClientRect()

    selectedText.value = text
    position.value = {
      top: rect.bottom + 8,
      left: Math.min(rect.left, window.innerWidth - 220),
    }

    visible.value = true
    expanded.value = false
    saved.value = false
    note.value = ''
  }, 10)
}

function handleMouseDown(event: MouseEvent) {
  // Check if the click is inside our shadow root widget
  const path = event.composedPath() as Element[]
  const inWidget = path.some(
    el => (el as HTMLElement).tagName?.toLowerCase() === 'pagenote-widget',
  )
  if (!inWidget && expanded.value) {
    visible.value = false
    expanded.value = false
  }
}

function handleKeyDown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    visible.value = false
    expanded.value = false
  }
}

// ── Actions ────────────────────────────────────────────────────────────────
async function saveSnippet() {
  if (!selectedText.value)
    return
  saving.value = true
  try {
    await sendMessage(
      'save-snippet',
      {
        text: selectedText.value,
        url: location.href,
        domain: location.hostname.replace(WWW_PREFIX_REGEX, ''),
        title: document.title,
        note: note.value.trim(),
        color: color.value,
      },
      'background',
    )
    saved.value = true
    setTimeout(() => {
      visible.value = false
    }, 1200)
  }
  finally {
    saving.value = false
  }
}

// ── Lifecycle ─────────────────────────────────────────────────────────────
onMounted(() => {
  document.addEventListener('mouseup', handleMouseUp)
  document.addEventListener('mousedown', handleMouseDown)
  document.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  document.removeEventListener('mouseup', handleMouseUp)
  document.removeEventListener('mousedown', handleMouseDown)
  document.removeEventListener('keydown', handleKeyDown)
})
</script>

<template>
  <!-- Portal to fixed position — no layout impact -->
  <Teleport to="body">
    <Transition name="widget-fade">
      <div
        v-if="visible && enabled !== false" class="fixed z-[2147483647] select-none"
        :style="{ top: `${position.top}px`, left: `${position.left}px` }"
      >
        <!-- Saved feedback -->
        <div
          v-if="saved"
          class="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-500 text-white text-xs font-medium shadow-lg"
        >
          <span class="i-lucide-check size-3.5" />
          {{ t('snippetSaved') }}
        </div>

        <!-- Collapsed: single "Save" button -->
        <button
          v-else-if="!expanded"
          class="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white text-xs font-semibold shadow-lg transition-colors"
          @click="expanded = true"
        >
          <span class="i-lucide-bookmark-plus size-3.5" />
          {{ t('save') }}
        </button>

        <!-- Expanded: note input + color picker -->
        <div v-else class="w-52 rounded-xl bg-elevated shadow-xl border border-default p-3 space-y-3">
          <!-- Selected text preview -->
          <p class="text-xs text-muted line-clamp-2 italic">
            "{{ selectedText.slice(0, 80) }}{{ selectedText.length > 80 ? '…' : '' }}"
          </p>

          <!-- Note field -->
          <textarea
            v-model="note" :placeholder="i18n.t('addNote')" rows="2"
            class="w-full text-xs rounded-md border border-default bg-transparent px-2 py-1.5 resize-none focus:outline-none focus:ring-2 focus:ring-primary-400"
          />

          <!-- Color picker -->
          <div class="flex items-center gap-1.5">
            <span class="text-xs text-muted">{{ i18n.t('colorLabel') }}:</span>
            <button
              v-for="c in COLORS" :key="c.value" class="size-4 rounded-full transition-transform hover:scale-110"
              :class="[c.bg, color === c.value ? `ring-2 ring-offset-1 ${c.ring}` : '']" @click="color = c.value"
            />
          </div>

          <!-- Actions -->
          <div class="flex gap-2">
            <button
              class="flex-1 text-xs px-2 py-1.5 rounded-md bg-primary-600 hover:bg-primary-700 text-white font-medium transition-colors disabled:opacity-60"
              :disabled="saving" @click="saveSnippet"
            >
              {{ saving ? i18n.t('saving') : i18n.t('saveSnippet') }}
            </button>
            <button
              class="text-xs px-2 py-1.5 rounded-md border border-default text-muted hover:bg-elevated transition-colors"
              @click="visible = false; expanded = false"
            >
              &#x2715;
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.widget-fade-enter-active,
.widget-fade-leave-active {
  transition: opacity 0.12s ease, transform 0.12s ease;
}

.widget-fade-enter-from,
.widget-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
