<script setup lang="ts">
defineProps<{
  message?: string
  icon?: string
}>()
</script>

<template>
  <div class="flex flex-col items-center justify-center gap-3 py-12 text-center">
    <UIcon :name="icon ?? 'i-lucide-bookmark'" class="size-10 text-dimmed" />
    <p class="text-sm text-muted max-w-48 leading-relaxed">
      {{ message ?? 'Nothing here yet.' }}
    </p>
  </div>
</template>
