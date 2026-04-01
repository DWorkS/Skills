<script setup lang="ts">
import type { Snippet } from '../../utils/storage'
import logoUrl from '../../assets/icon.png'
import { useAppI18n } from '../../composables/useAppI18n'
import { useSnippetsStore } from '../../stores/snippets'
import { groupByDomain } from '../../utils/helpers'

const { t } = useAppI18n()

// ── Store ──────────────────────────────────────────────────────────────────
const store = useSnippetsStore()
onMounted(() => store.init())

// ── Search + filter ────────────────────────────────────────────────────────
const searchQuery = ref('')
const selectedDomain = ref<string | null>(null)

const filteredSnippets = computed<Snippet[]>(() => {
  let items = store.sortedSnippets

  if (selectedDomain.value) {
    items = items.filter(s => s.domain === selectedDomain.value)
  }

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    items = items.filter(
      s =>
        s.text.toLowerCase().includes(q)
        || s.note.toLowerCase().includes(q)
        || s.title.toLowerCase().includes(q)
        || s.domain.toLowerCase().includes(q),
    )
  }

  return items
})

const groupedByDomain = computed(() => groupByDomain(filteredSnippets.value))

// group-view vs flat-view toggle
const groupView = ref(true)

// ── Domain filter options ──────────────────────────────────────────────────
const domainOptions = computed(() => [
  { label: t('allDomains'), value: null },
  ...store.domains.map(d => ({ label: d, value: d })),
])

// ── Actions ────────────────────────────────────────────────────────────────
async function handleDelete(id: string) {
  await store.remove(id)
}

async function handleUpdateNote(id: string, note: string) {
  await store.updateNote(id, note)
}

function openOptions() {
  browser.runtime.openOptionsPage()
}
</script>

<template>
  <UApp>
    <div class="h-screen flex flex-col">
      <!-- Header -->
      <div class="flex items-center justify-between px-4 py-3 border-b border-default shrink-0">
        <div class="flex items-center gap-2">
          <img :src="logoUrl" class="size-4 rounded" :alt="t('extName')">
          <span class="font-semibold text-sm">{{ t('extName') }}</span>
          <UBadge
            v-if="store.snippets.length" :label="String(store.snippets.length)" color="primary" variant="subtle"
            size="xs"
          />
        </div>
        <div class="flex items-center gap-1">
          <UButton
            size="xs" color="neutral" variant="ghost"
            :icon="groupView ? 'i-lucide-layout-list' : 'i-lucide-layers'" @click="groupView = !groupView"
          />
          <UButton size="xs" color="neutral" variant="ghost" icon="i-lucide-settings" @click="openOptions" />
        </div>
      </div>

      <!-- Search + domain filter -->
      <div class="px-3 pt-3 pb-2 space-y-2 shrink-0">
        <UInput
          v-model="searchQuery" :placeholder="t('searchPlaceholder')" icon="i-lucide-search" size="sm"
          class="w-full"
        />
        <USelect v-model="selectedDomain" :items="domainOptions" size="sm" :placeholder="t('domainFilter')" />
      </div>

      <!-- Loading state -->
      <div v-if="store.loading" class="flex-1 px-3 py-2 space-y-2">
        <USkeleton v-for="n in 4" :key="n" class="h-24 rounded-lg" />
      </div>

      <!-- Empty states -->
      <EmptyState
        v-else-if="!store.snippets.length" :message="t('noSnippets')" icon="i-lucide-bookmark-plus"
        class="flex-1"
      />
      <EmptyState
        v-else-if="!filteredSnippets.length" :message="t('noResults')" icon="i-lucide-search-x"
        class="flex-1"
      />

      <!-- Snippet list — flat view -->
      <div v-else-if="!groupView" class="flex-1 overflow-y-auto px-3 py-2 space-y-2">
        <SnippetCard
          v-for="snippet in filteredSnippets" :key="snippet.id" :snippet="snippet" @delete="handleDelete"
          @update-note="handleUpdateNote"
        />
      </div>

      <!-- Snippet list — grouped by domain view -->
      <div v-else class="flex-1 overflow-y-auto px-3 py-2 space-y-4">
        <div v-for="(items, domain) in groupedByDomain" :key="domain" class="space-y-2">
          <!-- Domain header -->
          <div class="flex items-center gap-2">
            <span class="text-xs font-medium text-muted">
              {{ domain }}
            </span>
            <span class="text-xs text-dimmed">
              ({{ items.length }})
            </span>
            <div class="flex-1 h-px bg-default" />
          </div>

          <SnippetCard
            v-for="snippet in items" :key="snippet.id" :snippet="snippet" @delete="handleDelete"
            @update-note="handleUpdateNote"
          />
        </div>
      </div>
    </div>
  </UApp>
</template>
