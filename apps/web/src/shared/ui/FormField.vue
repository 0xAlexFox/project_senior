<script setup>
defineProps({
  id: { type: String, required: true },
  label: { type: String, required: true },
  error: { type: String, default: '' },
  hint: { type: String, default: '' },
})
</script>

<template>
  <div class="form-field">
    <label :for="id">{{ label }}</label>
    <slot
      :described-by="
        [hint && `${id}-hint`, error && `${id}-error`]
          .filter(Boolean)
          .join(' ') || undefined
      "
      :invalid="!!error"
    />
    <p v-if="hint" :id="`${id}-hint`" class="caption">{{ hint }}</p>
    <p v-if="error" :id="`${id}-error`" class="field-error">{{ error }}</p>
  </div>
</template>
