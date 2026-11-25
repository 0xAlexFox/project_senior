<script setup>
import { ref, watch } from 'vue'
import FormField from './FormField.vue'
import BaseButton from './BaseButton.vue'
defineOptions({ inheritAttrs: false })
defineProps({
  id: { type: String, required: true },
  label: { type: String, required: true },
  error: { type: String, default: '' },
  hint: { type: String, default: '' },
  autocomplete: { type: String, default: 'current-password' },
})
const model = defineModel({ type: String, required: true })
const visible = ref(false)
watch(model, (value) => {
  if (!value) visible.value = false
})
</script>

<template>
  <FormField :id="id" :label="label" :error="error" :hint="hint" v-slot="field">
    <input
      v-bind="$attrs"
      :id="id"
      v-model="model"
      :type="visible ? 'text' : 'password'"
      :autocomplete="autocomplete"
      autocapitalize="none"
      autocorrect="off"
      :spellcheck="false"
      class="control"
      :aria-invalid="field.invalid"
      :aria-describedby="field.describedBy"
    />
    <BaseButton
      variant="text"
      class="password-field-toggle"
      :aria-pressed="visible"
      :aria-controls="id"
      :aria-label="`${visible ? 'Скрыть' : 'Показать'} пароль: ${label}`"
      @click="visible = !visible"
      >{{ visible ? 'Скрыть пароль' : 'Показать пароль' }}</BaseButton
    >
  </FormField>
</template>
