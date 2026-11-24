<script setup>
defineProps({
  id: { type: String, required: true },
  label: { type: String, required: true },
  error: { type: String, default: '' },
})
</script>

<template>
  <div class="form-field">
    <label :for="id">{{ label }}</label>
    <slot
      :described-by="error ? `${id}-error` : undefined"
      :invalid="!!error"
    />
    <p v-if="error" :id="`${id}-error`" class="field-error">{{ error }}</p>
  </div>
</template>
