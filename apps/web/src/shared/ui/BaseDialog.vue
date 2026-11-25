<script setup>
import { nextTick, onMounted, onBeforeUnmount, ref, watch } from 'vue'
import BaseButton from './BaseButton.vue'
import NoticeMessage from './NoticeMessage.vue'
const props = defineProps({
  open: { type: Boolean, default: false },
  id: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  confirmLabel: { type: String, default: 'Подтвердить' },
  busy: { type: Boolean, default: false },
  danger: { type: Boolean, default: false },
  confirmDisabled: { type: Boolean, default: false },
  error: { type: String, default: '' },
})
const emit = defineEmits(['close', 'confirm'])
const dialog = ref(null)
let previousFocus = null
function restoreFocus() {
  if (previousFocus?.isConnected) previousFocus.focus()
  else {
    const heading = document.querySelector('main h1')
    if (heading) {
      heading.tabIndex = -1
      heading.focus()
    }
  }
}
async function sync() {
  await nextTick()
  if (!dialog.value) return
  if (props.open && !dialog.value.open) {
    previousFocus = document.activeElement
    dialog.value.showModal()
  } else if (!props.open && dialog.value.open) {
    dialog.value.close()
    restoreFocus()
  }
}
watch(() => props.open, sync, { flush: 'post' })
onMounted(sync)
onBeforeUnmount(() => {
  if (dialog.value?.open) {
    dialog.value.close()
    restoreFocus()
  }
})
function cancel() {
  if (!props.busy) emit('close')
}
function confirm() {
  if (!props.busy && !props.confirmDisabled) emit('confirm')
}
</script>

<template>
  <dialog
    ref="dialog"
    class="base-dialog"
    :aria-labelledby="`${id}-title`"
    :aria-describedby="description ? `${id}-description` : undefined"
    @cancel.prevent="cancel"
  >
    <form class="stack form-stack" @submit.prevent="confirm">
      <h2 :id="`${id}-title`" class="panel-title">{{ title }}</h2>
      <p v-if="description" :id="`${id}-description`">{{ description }}</p>
      <slot />
      <NoticeMessage v-if="error" tone="danger">{{ error }}</NoticeMessage>
      <div class="actions">
        <BaseButton
          autofocus
          variant="secondary"
          :disabled="busy"
          @click="cancel"
          >Отмена</BaseButton
        >
        <BaseButton
          type="submit"
          :variant="danger ? 'danger' : 'primary'"
          :loading="busy"
          :disabled="confirmDisabled"
          >{{ confirmLabel }}</BaseButton
        >
      </div>
    </form>
  </dialog>
</template>
