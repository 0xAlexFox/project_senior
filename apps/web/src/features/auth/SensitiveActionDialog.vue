<script setup>
import { onBeforeUnmount, ref, watch } from 'vue'
import { demoApi } from '../../shared/api/demo-client.js'
import { passwordProblem } from './validation.js'
import BaseDialog from '../../shared/ui/BaseDialog.vue'
import PasswordField from '../../shared/ui/PasswordField.vue'
const props = defineProps({
  open: { type: Boolean, required: true },
  id: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  confirmLabel: { type: String, default: 'Подтвердить' },
  danger: { type: Boolean, default: false },
  execute: { type: Function, required: true },
})
const emit = defineEmits(['close', 'complete', 'failure'])
const password = ref(''),
  error = ref(''),
  fieldError = ref(''),
  busy = ref(false)
let controller,
  generation = 0,
  disposed = false
function clear() {
  generation++
  controller?.abort()
  password.value = ''
  error.value = ''
  fieldError.value = ''
  busy.value = false
}
watch(() => props.open, clear)
async function confirm() {
  if (busy.value || !props.open) return
  fieldError.value = passwordProblem(password.value)
  if (fieldError.value) {
    document.getElementById(props.id + '-password')?.focus()
    return
  }
  busy.value = true
  error.value = ''
  const current = ++generation
  controller = new AbortController()
  const options = { signal: controller.signal }
  let stage = 'reauth'
  try {
    await demoApi.reauth(options)
    stage = 'action'
    const response = await props.execute(options)
    if (!disposed && current === generation && props.open)
      emit('complete', response)
  } catch (failure) {
    if (!disposed && current === generation && props.open) {
      error.value = failure.message
      failure.stage = stage
      emit('failure', failure)
    }
  } finally {
    if (!disposed && current === generation) {
      busy.value = false
      password.value = ''
    }
  }
}
onBeforeUnmount(() => {
  disposed = true
  clear()
})
</script>
<template>
  <BaseDialog
    :open="open"
    :id="id"
    :title="title"
    :description="description"
    :confirm-label="confirmLabel"
    :danger="danger"
    :busy="busy"
    :error="error"
    @close="$emit('close')"
    @confirm="confirm"
  >
    <p class="caption">Учебная проверка. Не вводите настоящий пароль.</p>
    <PasswordField
      :id="id + '-password'"
      v-model="password"
      label="Текущий пароль"
      :error="fieldError"
      :disabled="busy"
    />
  </BaseDialog>
</template>
