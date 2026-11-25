<script setup>
import { computed } from 'vue'
const props = defineProps({
  label: { type: String, required: true },
  value: { type: Number, default: null },
})
const progress = computed(() =>
  props.value === null ? undefined : Math.min(100, Math.max(0, props.value)),
)
</script>

<template>
  <div class="progress-indicator">
    <p>
      {{ label }}<span v-if="progress !== undefined"> · {{ progress }}%</span>
    </p>
    <progress :value="progress" max="100" :aria-label="label" />
  </div>
</template>
