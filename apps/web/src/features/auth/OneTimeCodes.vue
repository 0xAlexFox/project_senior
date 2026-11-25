<script setup>
import { ref } from 'vue'
import CopyText from '../../shared/ui/CopyText.vue'
import BaseButton from '../../shared/ui/BaseButton.vue'
import NoticeMessage from '../../shared/ui/NoticeMessage.vue'
const props = defineProps({ codes: { type: Array, required: true } })
defineEmits(['done'])
const acknowledged = ref(false)
const downloaded = ref(false)
function download() {
  const url = URL.createObjectURL(
    new Blob(['DEMO — НЕ НАСТОЯЩИЕ КОДЫ\n' + props.codes.join('\n')], {
      type: 'text/plain;charset=utf-8',
    }),
  )
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = 'учебные-резервные-коды.txt'
  anchor.click()
  URL.revokeObjectURL(url)
  downloaded.value = true
}
</script>
<template>
  <div class="stack">
    <NoticeMessage tone="warning"
      >Сохраните коды сейчас. Повторного показа не будет. Это учебные строки,
      для восстановления настоящего аккаунта они не подходят.</NoticeMessage
    >
    <CopyText :value="codes.join('\n')" label="Учебные резервные коды" />
    <BaseButton variant="secondary" @click="download">Скачать коды</BaseButton>
    <p v-if="downloaded" role="status">
      Скачивание передано браузеру. Подтвердите получение отдельно.
    </p>
    <label
      ><input v-model="acknowledged" type="checkbox" /> Я сохранил резервные
      коды</label
    >
    <BaseButton :disabled="!acknowledged" @click="$emit('done')"
      >Продолжить</BaseButton
    >
  </div>
</template>
