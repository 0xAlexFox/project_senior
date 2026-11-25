<script setup>
import { ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import {
  demo,
  demoApi,
  disablePreview,
  enablePreview,
  setDemoJobStatus,
} from '../../shared/api/demo-client.js'
import { demoErrors } from '../../shared/api/demo-fixtures.js'
import BaseButton from '../../shared/ui/BaseButton.vue'
import NoticeMessage from '../../shared/ui/NoticeMessage.vue'
import SelectField from '../../shared/ui/SelectField.vue'
const router = useRouter()
const status = ref('running')
const message = ref('')
const failureOptions = [
  { value: '', label: 'Успешный ответ' },
  ...Object.entries(demoErrors)
    .filter(
      ([code]) =>
        ![
          'NOT_FOUND',
          'JOB_ALREADY_FINISHED',
          'RESULT_EXPIRED',
          'PREVIEW_DISABLED',
        ].includes(code),
    )
    .map(([value, [label]]) => ({ value, label: `${value}: ${label}` })),
]
const statusOptions = [
  ['queued', 'В очереди'],
  ['running', 'Обработка'],
  ['succeeded', 'Готово'],
  ['failed', 'Ошибка'],
  ['cancelled', 'Отменено'],
  ['expired', 'Срок истёк'],
  ['deleted', 'Файл удалён'],
].map(([value, label]) => ({ value, label }))
async function enter() {
  enablePreview()
  await router.push('/account')
}
function enableForms() {
  enablePreview()
  demoApi.signOut()
}
async function reset() {
  disablePreview()
  message.value = ''
  await router.push('/')
}
function changeJob() {
  try {
    setDemoJobStatus(status.value)
    message.value = 'Учебный ответ изменён. Обновите статус задачи.'
  } catch (error) {
    message.value = error.message
  }
}
</script>
<template>
  <aside class="preview-note container stack" aria-label="Состояние приложения">
    <p>
      Предварительная версия интерфейса. Вход, конвертация и хранение файлов
      пока не подключены.
    </p>
    <div class="actions">
      <BaseButton v-if="!demo.enabled" variant="text" @click="enableForms"
        >Включить учебные ответы для форм</BaseButton
      >
      <BaseButton
        v-if="!demo.enabled || !demo.viewer"
        variant="secondary"
        @click="enter"
        >Открыть учебный кабинет</BaseButton
      >
      <template v-else
        ><RouterLink to="/account" class="button button-secondary"
          >Учебный кабинет</RouterLink
        ><BaseButton variant="text" @click="reset"
          >Отключить учебные ответы</BaseButton
        ></template
      >
    </div>
    <NoticeMessage v-if="demo.message">{{ demo.message }}</NoticeMessage>
    <details v-if="demo.enabled" class="preview-controls">
      <summary>Учебные ответы и состояния</summary>
      <div class="stack">
        <p>
          Это управление тестовыми ответами, а не работа сервера. Пароли, коды и
          выбранный файл никуда не отправляются.
        </p>
        <SelectField
          id="preview-next-error"
          v-model="demo.nextError"
          label="Следующий учебный ответ"
          :options="failureOptions"
        />
        <label
          >Задержка учебного ответа
          <select v-model.number="demo.latencyMs" class="control">
            <option :value="150">Обычная</option>
            <option :value="2000">2 секунды</option>
          </select>
        </label>
        <label
          ><input v-model="demo.online" type="checkbox" /> Связь с учебным
          сервисом</label
        >
        <SelectField
          id="preview-job-status"
          v-model="status"
          label="Состояние учебной задачи"
          :options="statusOptions"
          :disabled="!demo.job"
        />
        <BaseButton :disabled="!demo.job" variant="secondary" @click="changeJob"
          >Применить состояние задачи</BaseButton
        >
        <BaseButton
          v-if="demo.telegram.status === 'pending'"
          variant="secondary"
          @click="demo.telegram.botConfirmed = true"
          >Подтвердить со стороны учебного бота</BaseButton
        >
        <p v-if="message" role="status">{{ message }}</p>
      </div>
    </details>
  </aside>
</template>
