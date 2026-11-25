<script setup>
import FormField from './FormField.vue'
defineOptions({ inheritAttrs: false })
defineProps({
  id: { type: String, required: true },
  label: { type: String, required: true },
  error: { type: String, default: '' },
  hint: { type: String, default: '' },
  options: { type: Array, required: true },
})
const model = defineModel({ type: String, required: true })
</script>

<template>
  <FormField :id="id" :label="label" :error="error" :hint="hint" v-slot="field">
    <select
      v-bind="$attrs"
      :id="id"
      v-model="model"
      class="control"
      :aria-invalid="field.invalid"
      :aria-describedby="field.describedBy"
    >
      <option
        v-for="option in options"
        :key="option.value"
        :value="option.value"
        :disabled="option.disabled"
      >
        {{ option.label }}
      </option>
    </select>
  </FormField>
</template>
