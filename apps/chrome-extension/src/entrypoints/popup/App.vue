<script setup lang="ts">
import type { Snippet } from '../../utils/storage'
import { sendMessage } from 'webext-bridge/popup'
import logoUrl from '../../assets/icon.png'
import { useAppI18n } from '../../composables/useAppI18n'
import { colorClass, formatRelativeDate, truncate } from '../../utils/helpers'

const { t } = useAppI18n()

// ── State ──────────────────────────────────────────────────────────────────
const snippets = ref<Snippet[]>([])
const count = ref(0)
const loading = ref(true)

// ── Load recent snippets from background ───────────────────────────────────
onMounted(async () => {
  try {
    const all = await sendMessage('get-snippets', {}, 'background')
    snippets.value = all.slice(0, 5) // show only 5 most recent
    count.value = all.length
  }
  finally {
    loading.value = false
  }
})

// ── Actions ────────────────────────────────────────────────────────────────
async function openSidePanel() {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true })
  if (tab?.id != null) {
    await browser.sidePanel.open({ tabId: tab.id })
    window.close()
  }
}

function openOptions() {
  browser.runtime.openOptionsPage()
  window.close()
}

async function deleteSnippet(id: string) {
  await sendMessage('delete-snippet', { id }, 'background')
  snippets.value = snippets.value.filter(s => s.id !== id)
  count.value = Math.max(0, count.value - 1)
}
</script>

<template>
  <UApp>
    <div class="w-80 flex flex-col">
      <!-- Header -->
      <div class="flex items-center justify-between px-4 py-3 border-b border-default">
        <div class="flex items-center gap-2">
          <img :src="logoUrl" class="size-5 rounded" :alt="t('extName')">
          <span class="font-semibold text-sm">{{ t('extName') }}</span>
        </div>
        <div class="flex items-center gap-1">
          <UBadge v-if="count > 0" :label="String(count)" color="primary" variant="subtle" size="xs" />
          <UButton size="xs" color="neutral" variant="ghost" icon="i-lucide-settings" @click="openOptions" />
        </div>
      </div>

      <!-- Snippet list -->
      <div class="px-3 py-2 space-y-2 max-h-96 overflow-y-auto">
        <!-- Loading skeleton -->
        <template v-if="loading">
          <USkeleton v-for="n in 3" :key="n" class="h-16 rounded-lg" />
        </template>

        <!-- Empty state -->
        <EmptyState v-else-if="!snippets.length" :message="t('noSnippets')" icon="i-lucide-bookmark-plus" />

        <!-- Recent snippets -->
        <template v-else>
          <div
            v-for="snippet in snippets" :key="snippet.id" class="group rounded-lg border px-3 py-2 text-xs space-y-1"
            :class="colorClass(snippet.color)"
          >
            <p class="text-default leading-snug line-clamp-2">
              {{ truncate(snippet.text, 120) }}
            </p>
            <div class="flex items-center justify-between">
              <span class="text-dimmed">
                {{ snippet.domain }} · {{ formatRelativeDate(snippet.createdAt) }}
              </span>
              <UButton
                size="xs" color="error" variant="ghost" icon="i-lucide-x"
                class="opacity-0 group-hover:opacity-100 transition-opacity -mr-1" @click="deleteSnippet(snippet.id)"
              />
            </div>
          </div>

          <!-- "more" indicator -->
          <p v-if="count > 5" class="text-center text-xs text-dimmed py-1">
            {{ t('moreInLibrary', count - 5) }}
          </p>
        </template>
      </div>

      <!-- Footer actions -->
      <div class="border-t border-default p-3">
        <UButton block color="primary" size="sm" icon="i-lucide-panel-right" @click="openSidePanel">
          {{ t('openSidePanel') }}
        </UButton>
      </div>
    </div>
  </UApp>
</template>
