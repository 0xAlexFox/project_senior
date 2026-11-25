<script setup>
defineProps({ label: { type: String, default: 'Загрузка…' } })
</script>
<template>
  <div class="stack" role="status">
    <p>{{ label }}</p>
    <div class="skeleton" aria-hidden="true">
      <span class="skeleton-line" /><span class="skeleton-line" /><span
        class="skeleton-line"
      />
    </div>
  </div>
</template>
