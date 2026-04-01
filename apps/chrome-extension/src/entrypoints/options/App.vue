<script setup lang="ts">
import type { Settings } from '../../utils/storage'
import { sendMessage } from 'webext-bridge/options'
import logoUrl from '../../assets/icon.png'
import { useAppI18n } from '../../composables/useAppI18n'
import { useSnippetsStore } from '../../stores/snippets'

// ── i18n ───────────────────────────────────────────────────────────────────
const { t, locale, setLocale, availableLocales } = useAppI18n()

// ── Store ──────────────────────────────────────────────────────────────────
const store = useSnippetsStore()

// ── Local form state ──────────────────────────────────────────────────────
const form = ref<Omit<Settings, 'theme' | 'language'>>({
  maxSnippets: 500,
  showSelectionWidget: true,
})

// Load stored settings into form once store has initialised
onMounted(async () => {
  await store.init()
  if (store.settings) {
    form.value.maxSnippets = store.settings.maxSnippets
    form.value.showSelectionWidget = store.settings.showSelectionWidget
  }
})

// ── Save ───────────────────────────────────────────────────────────────────
const saving = ref(false)
const savedToast = ref(false)

async function save() {
  saving.value = true
  try {
    await sendMessage('update-settings', { ...form.value }, 'background')
    savedToast.value = true
    setTimeout(() => {
      savedToast.value = false
    }, 2000)
  }
  finally {
    saving.value = false
  }
}

// ── Export ─────────────────────────────────────────────────────────────────
function exportData() {
  const json = JSON.stringify(store.snippets, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `pagenote-export-${new Date().toISOString().split('T')[0]}.json`
  a.click()
  URL.revokeObjectURL(url)
}

// ── Clear all ──────────────────────────────────────────────────────────────
const showClearModal = ref(false)
const clearing = ref(false)

async function confirmClear() {
  clearing.value = true
  try {
    await store.clearAll()
    showClearModal.value = false
  }
  finally {
    clearing.value = false
  }
}
</script>

<template>
  <UApp>
    <UMain>
      <div class="min-h-screen py-10 px-4">
        <div class="max-w-xl mx-auto space-y-10">
          <!-- Page title -->
          <div class="flex items-center gap-3">
            <img :src="logoUrl" class="size-8 rounded-xl" :alt="t('extName')">
            <h1 class="text-2xl font-bold">
              {{ t('extName') }}
            </h1>
            <UBadge :label="t('settings')" color="neutral" variant="subtle" />
          </div>

          <!-- Appearance section -->
          <section class="space-y-4">
            <h2 class="text-sm font-semibold text-muted uppercase tracking-wider">
              {{ t('appearance') }}
            </h2>
            <UCard>
              <div class="space-y-4">
                <UFormField :label="t('theme')" :description="t('themeDesc')">
                  <UColorModeSelect />
                </UFormField>

                <UFormField :label="t('language')">
                  <!-- ULocaleSelect requires :locales and v-model to populate -->
                  <ULocaleSelect
                    :model-value="locale" :locales="availableLocales"
                    @update:model-value="(v) => setLocale(v as 'en' | 'de')"
                  />
                </UFormField>
              </div>
            </UCard>
          </section>

          <!-- Behaviour section -->
          <section class="space-y-4">
            <h2 class="text-sm font-semibold text-muted uppercase tracking-wider">
              {{ t('behaviour') }}
            </h2>
            <UCard>
              <div class="space-y-5">
                <UFormField :label="t('maxSnippets')" :description="t('maxSnippetsDesc')">
                  <UInput
                    v-model.number="form.maxSnippets" type="number" :min="10" :max="5000" :step="10"
                    class="w-32"
                  />
                </UFormField>

                <UFormField :label="t('showWidget')" :description="t('showWidgetDesc')">
                  <USwitch v-model="form.showSelectionWidget" />
                </UFormField>
              </div>
            </UCard>
          </section>

          <!-- Save button -->
          <UButton
            :loading="saving" :color="savedToast ? 'success' : 'primary'"
            :icon="savedToast ? 'i-lucide-check' : 'i-lucide-save'" size="md" @click="save"
          >
            {{ savedToast ? t('saved') : t('saveSettings') }}
          </UButton>

          <!-- Danger zone -->
          <section class="space-y-4">
            <h2 class="text-sm font-semibold text-red-500 uppercase tracking-wider">
              {{ t('dangerZone') }}
            </h2>
            <UCard class="border-red-200 dark:border-red-800">
              <div class="flex flex-col sm:flex-row sm:items-center gap-3">
                <div class="flex-1">
                  <p class="text-sm font-medium">
                    {{ t('exportData') }}
                  </p>
                  <p class="text-xs text-muted mt-1">
                    {{ t('exportCountDesc', store.snippets.length) }}
                  </p>
                </div>
                <UButton
                  color="neutral" variant="outline" icon="i-lucide-download" size="sm"
                  :disabled="!store.snippets.length" @click="exportData"
                >
                  {{ t('exportAction') }}
                </UButton>
              </div>

              <UDivider class="my-4" />

              <div class="flex flex-col sm:flex-row sm:items-center gap-3">
                <div class="flex-1">
                  <p class="text-sm font-medium text-red-600 dark:text-red-400">
                    {{ t('clearAll') }}
                  </p>
                  <p class="text-xs text-muted mt-1">
                    {{ t('clearCountDesc', store.snippets.length) }}
                  </p>
                </div>
                <UButton
                  color="error" variant="outline" icon="i-lucide-trash-2" size="sm"
                  :disabled="!store.snippets.length" @click="showClearModal = true"
                >
                  {{ t('clearAllAction') }}
                </UButton>
              </div>
            </UCard>
          </section>
        </div>
      </div>
    </UMain>

    <!-- Confirm clear modal -->
    <UModal v-model:open="showClearModal" :title="t('clearAll')">
      <template #body>
        <p class="text-sm text-muted">
          {{ t('clearAllConfirm', store.snippets.length) }}
        </p>
      </template>

      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton color="neutral" variant="ghost" @click="showClearModal = false">
            {{ t('cancel') }}
          </UButton>
          <UButton color="error" :loading="clearing" @click="confirmClear">
            {{ t('confirmDelete') }}
          </UButton>
        </div>
      </template>
    </UModal>
  </UApp>
</template>
