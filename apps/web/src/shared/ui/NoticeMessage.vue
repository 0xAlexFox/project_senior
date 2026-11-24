<script setup>
defineProps({
  tone: { type: String, default: 'info' },
  live: { type: String, default: 'polite' },
})
</script>

<template>
  <div
    class="notice"
    :class="`notice-${tone}`"
    :role="tone === 'danger' ? 'alert' : 'status'"
    :aria-live="live"
  >
    <slot />
  </div>
</template>
