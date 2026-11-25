<script setup>
defineProps({
  title: { type: String, required: true },
  description: { type: String, default: '' },
})
</script>
<template>
  <section class="panel workspace-panel stack">
    <h2 class="panel-title">{{ title }}</h2>
    <p v-if="description" class="secondary">{{ description }}</p>
    <div class="actions"><slot /></div>
  </section>
</template>
