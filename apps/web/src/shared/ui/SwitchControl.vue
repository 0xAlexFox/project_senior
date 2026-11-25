<script setup>
defineProps({
  id: { type: String, required: true },
  label: { type: String, required: true },
  checked: { type: Boolean, default: false },
  busy: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  hint: { type: String, default: '' },
})
defineEmits(['change'])
</script>

<template>
  <div class="switch-control">
    <button
      :id="id"
      type="button"
      role="switch"
      :aria-label="label"
      :aria-checked="checked"
      :aria-describedby="hint ? `${id}-hint` : undefined"
      :aria-busy="busy || undefined"
      :disabled="disabled || busy"
      @click="$emit('change', !checked)"
    >
      <span>{{ label }}</span><span class="switch-track" aria-hidden="true"
        ><span
      /></span>
    </button>
    <p v-if="hint" :id="`${id}-hint`" class="caption">{{ hint }}</p>
    <p v-if="busy" role="status" class="caption">Сохраняем…</p>
  </div>
</template>
