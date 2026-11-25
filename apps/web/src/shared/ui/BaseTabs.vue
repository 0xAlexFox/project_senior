<script setup>
defineProps({
  id: { type: String, required: true },
  label: { type: String, required: true },
  options: { type: Array, required: true },
  panelId: { type: String, default: '' },
})
const model = defineModel({ type: String, required: true })
const buttons = []
function move(event, index, options) {
  const keys = ['ArrowRight', 'ArrowLeft', 'Home', 'End']
  if (!keys.includes(event.key)) return
  event.preventDefault()
  const next =
    event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? options.length - 1
        : (index + (event.key === 'ArrowRight' ? 1 : -1) + options.length) %
          options.length
  model.value = options[next].value
  buttons[next]?.focus()
}
</script>

<template>
  <div class="base-tabs" role="tablist" :aria-label="label">
    <button
      v-for="(option, index) in options"
      :id="`${id}-${option.value}`"
      :key="option.value"
      :ref="(el) => (buttons[index] = el)"
      type="button"
      role="tab"
      :aria-selected="model === option.value"
      :aria-controls="panelId || undefined"
      :tabindex="model === option.value ? 0 : -1"
      @click="model = option.value"
      @keydown="move($event, index, options)"
    >
      {{ option.label }}
    </button>
  </div>
</template>
