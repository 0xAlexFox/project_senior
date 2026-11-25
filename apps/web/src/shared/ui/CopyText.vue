<script setup>
import { ref, watch } from 'vue'
import BaseButton from './BaseButton.vue'
const props = defineProps({
  value: { type: String, required: true },
  label: { type: String, default: 'Текст' },
})
const message = ref('')
watch(
  () => props.value,
  () => {
    message.value = ''
  },
)
async function copy() {
  try {
    await navigator.clipboard.writeText(props.value)
    message.value = 'Скопировано.'
  } catch {
    message.value =
      'Не удалось скопировать. Выделите текст и скопируйте вручную.'
  }
}
</script>

<template>
  <div class="copy-text stack">
    <pre tabindex="0" :aria-label="label"><code>{{ value }}</code></pre>
    <BaseButton variant="secondary" @click="copy">Копировать</BaseButton>
    <p v-if="message" role="status" class="caption">{{ message }}</p>
  </div>
</template>
