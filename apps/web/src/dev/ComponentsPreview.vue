<script setup>
import { ref } from 'vue'
import BaseButton from '../shared/ui/BaseButton.vue'
import BaseDialog from '../shared/ui/BaseDialog.vue'
import BaseTabs from '../shared/ui/BaseTabs.vue'
import SwitchControl from '../shared/ui/SwitchControl.vue'
import InputField from '../shared/ui/InputField.vue'
import PasswordField from '../shared/ui/PasswordField.vue'
import SelectField from '../shared/ui/SelectField.vue'
import ProgressIndicator from '../shared/ui/ProgressIndicator.vue'
import QuotaDisplay from '../shared/ui/QuotaDisplay.vue'
import CopyText from '../shared/ui/CopyText.vue'
import LoadingState from '../shared/ui/LoadingState.vue'
import EmptyState from '../shared/ui/EmptyState.vue'
import StatusBadge from '../shared/ui/StatusBadge.vue'
import NoticeMessage from '../shared/ui/NoticeMessage.vue'
const name = ref('')
const password = ref('')
const tab = ref('images')
const format = ref('png')
const checked = ref(false)
const open = ref(false)
const error = ref('')
const fail = ref(false)
const message = ref('')
function openDialog() {
  open.value = true
  error.value = ''
}
function confirm() {
  if (fail.value) {
    error.value = 'Тестовый ответ: не удалось удалить. Попробуйте ещё раз.'
    return
  }
  open.value = false
  message.value = 'Учебный файл удалён.'
}
</script>
<template>
  <section class="component-preview container stack form-stack">
    <h1>Компоненты — тестовый стенд</h1>
    <NoticeMessage
      >Только разработка: учебные данные и состояния, без
      backend.</NoticeMessage
    >
    <BaseTabs
      id="preview-tabs"
      v-model="tab"
      label="Инструмент"
      panel-id="preview-panel"
      :options="[
        { value: 'images', label: 'Изображения' },
        { value: 'documents', label: 'Документы' },
      ]"
    />
    <div
      id="preview-panel"
      role="tabpanel"
      :aria-labelledby="`preview-tabs-${tab}`"
    >
      {{ tab === 'images' ? 'Изображения' : 'Документы' }}
    </div>
    <InputField
      id="preview-name"
      v-model="name"
      label="Имя"
      hint="Подсказка поля"
      :error="name === '!' ? 'Проверьте имя.' : ''"
    />
    <PasswordField id="preview-password" v-model="password" label="Пароль" />
    <SelectField
      id="preview-format"
      v-model="format"
      label="Формат"
      :options="[
        { value: 'png', label: 'PNG' },
        { value: 'pdf', label: 'PDF' },
      ]"
    />
    <SwitchControl
      id="preview-switch"
      label="Сохранять новые результаты"
      :checked="checked"
      @change="checked = $event"
    />
    <div class="actions">
      <BaseButton @click="openDialog">Открыть диалог</BaseButton
      ><BaseButton loading>Сохраняем…</BaseButton
      ><BaseButton disabled>Недоступно</BaseButton>
    </div>
    <ProgressIndicator label="Учебная загрузка" :value="62" />
    <ProgressIndicator label="Обработка — без процента" />
    <StatusBadge>В очереди</StatusBadge>
    <QuotaDisplay
      :quota="{
        usedFiles: 12,
        maxFiles: 100,
        reservedFiles: 1,
        usedBytes: 86 * 1024 ** 2,
        maxBytes: 500 * 1024 ** 2,
        reservedBytes: 50 * 1024 ** 2,
      }"
    />
    <CopyText value="ДЕМОНСТРАЦИЯ — НЕ ДЕЙСТВУЕТ" label="Учебный текст" />
    <LoadingState label="Загрузка учебного списка…" />
    <EmptyState
      title="Пока нет файлов"
      description="Учебное пустое состояние."
    />
    <NoticeMessage v-if="message">{{ message }}</NoticeMessage>
    <BaseDialog
      id="preview-dialog"
      :open="open"
      title="Удалить файл?"
      description="Доступ будет закрыт сразу. Вернуть файл через интерфейс нельзя."
      confirm-label="Удалить учебный файл"
      danger
      :error="error"
      @close="open = false"
      @confirm="confirm"
    >
      <label
        ><input v-model="fail" type="checkbox" /> Ошибка тестового ответа</label
      >
    </BaseDialog>
  </section>
</template>
