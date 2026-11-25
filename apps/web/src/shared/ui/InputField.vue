<script setup>
import FormField from './FormField.vue'
defineOptions({ inheritAttrs: false })
defineProps({
  id: { type: String, required: true },
  label: { type: String, required: true },
  error: { type: String, default: '' },
  hint: { type: String, default: '' },
  type: { type: String, default: 'text' },
})
const model = defineModel({ type: String, required: true })
</script>

<template>
  <FormField :id="id" :label="label" :error="error" :hint="hint" v-slot="field">
    <input
      v-bind="$attrs"
      :id="id"
      v-model="model"
      :type="type"
      class="control"
      :aria-invalid="field.invalid"
      :aria-describedby="field.describedBy"
    />
  </FormField>
</template>
