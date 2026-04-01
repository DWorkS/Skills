<script setup lang="ts">
import type { Snippet } from '../utils/storage'
import { useAppI18n } from '../composables/useAppI18n'
import { colorClass, formatRelativeDate, truncate } from '../utils/helpers'

const props = defineProps<{
  snippet: Snippet
}>()

const emit = defineEmits<{
  'update:modelValue': [id: string, note: string]
  'delete': [id: string]
}>()

const { t } = useAppI18n()

const editingNote = ref(false)
const noteInput = ref(props.snippet.note)
const justCopied = ref(false)

async function copyText() {
  await navigator.clipboard.writeText(props.snippet.text)
  justCopied.value = true
  setTimeout(() => {
    justCopied.value = false
  }, 1500)
}

function startEditNote() {
  noteInput.value = props.snippet.note
  editingNote.value = true
}

function saveNote() {
  emit('update:modelValue', props.snippet.id, noteInput.value)
  editingNote.value = false
}
</script>

<template>
  <div class="rounded-lg border p-3 text-sm space-y-2 transition-colors" :class="colorClass(snippet.color)">
    <!-- Snippet text -->
    <p class="leading-snug text-default">
      {{ truncate(snippet.text, 240) }}
    </p>

    <!-- Source link -->
    <a
      :href="snippet.url" target="_blank" rel="noopener noreferrer"
      class="text-xs text-primary-600 dark:text-primary-400 hover:underline truncate block"
    >
      {{ snippet.domain }} · {{ formatRelativeDate(snippet.createdAt) }}
    </a>

    <!-- Note (display or edit) -->
    <template v-if="editingNote">
      <UInput
        v-model="noteInput" size="xs" autofocus :placeholder="t('addNote')" @keydown.enter="saveNote"
        @keydown.escape="editingNote = false"
      />
      <div class="flex gap-1">
        <UButton size="xs" color="primary" @click="saveNote">
          {{ t('saveNote') }}
        </UButton>
        <UButton size="xs" color="neutral" variant="ghost" @click="editingNote = false">
          {{ t('cancel') }}
        </UButton>
      </div>
    </template>
    <p v-else-if="snippet.note" class="text-xs text-muted italic">
      {{ snippet.note }}
    </p>

    <!-- Actions -->
    <div class="flex items-center gap-1 pt-1">
      <UButton
        size="xs" color="neutral" variant="ghost" :icon="justCopied ? 'i-lucide-check' : 'i-lucide-copy'"
        :label="justCopied ? t('copied') : t('copyToClipboard')" @click="copyText"
      />
      <UButton
        size="xs" color="neutral" variant="ghost" icon="i-lucide-pencil" :label="t('editNote')"
        @click="startEditNote"
      />
      <div class="flex-1" />
      <UButton
        size="xs" color="error" variant="ghost" icon="i-lucide-trash-2" :label="t('delete')"
        @click="emit('delete', snippet.id)"
      />
    </div>
  </div>
</template>
