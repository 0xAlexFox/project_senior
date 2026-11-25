<script setup>
import { onBeforeUnmount, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { demo, demoApi } from '../shared/api/demo-client.js'
import { useDemoResource } from '../shared/api/use-demo-resource.js'
import { formatDate } from '../shared/lib/format.js'
import SensitiveActionDialog from '../features/auth/SensitiveActionDialog.vue'
import BaseButton from '../shared/ui/BaseButton.vue'
import CopyText from '../shared/ui/CopyText.vue'
import LoadingState from '../shared/ui/LoadingState.vue'
import NoticeMessage from '../shared/ui/NoticeMessage.vue'
import StatusBadge from '../shared/ui/StatusBadge.vue'
const { data, error, loading, load, retryIn } = useDemoResource(demoApi.key)
const action = ref(''),
  secret = ref(''),
  message = ref('')
let disposed = false
function request(value) {
  secret.value = ''
  message.value = ''
  action.value = value
}
function execute(options) {
  return action.value === 'revoke'
    ? demoApi.revokeKey(options)
    : demoApi.createKey(options)
}
function complete(response) {
  if (disposed) return
  if (action.value === 'revoke') {
    data.value = response
    message.value = 'Учебный ключ отозван.'
  } else {
    data.value = response.key
    secret.value = response.secret
    message.value = 'Учебный ключ выпущен. Сохраните его сейчас.'
  }
  action.value = ''
}
async function failure(error) {
  if (
    error.stage === 'action' &&
    ['KEY_RESPONSE_LOST', 'RESPONSE_LOST'].includes(error.code)
  ) {
    action.value = ''
    secret.value = ''
    await load()
    if (!disposed)
      message.value =
        'Ответ на выпуск потерян. Проверьте маску: секрет повторно не показывается. Для получения нового выполните явную замену.'
  }
}
watch(
  () => demo.viewer,
  (viewer) => {
    if (!viewer) {
      secret.value = ''
      action.value = ''
    }
  },
)
onBeforeUnmount(() => {
  disposed = true
  secret.value = ''
  action.value = ''
})
</script>
<template>
  <section class="stack api-key-page">
    <h1>API-ключ</h1>
    <p class="secondary">Подключите конвертацию к своим программам.</p>
    <NoticeMessage v-if="!demo.enabled || !demo.viewer"
      >API пока не подключён. Включите учебные ответы.</NoticeMessage
    >
    <LoadingState v-if="loading" />
    <NoticeMessage v-if="error" tone="danger"
      >{{ error }}
      <BaseButton variant="text" :disabled="!!retryIn" @click="load"
        >Повторить загрузку ключа</BaseButton
      ></NoticeMessage
    >
    <section v-if="data" class="panel workspace-panel stack">
      <h2 class="panel-title">Ваш персональный ключ</h2>
      <StatusBadge>{{
        { none: 'Нет ключа', active: 'Активен', revoked: 'Отозван' }[
          data.status
        ]
      }}</StatusBadge>
      <p v-if="data.mask" class="key-mask">{{ data.mask }}</p>
      <p class="caption">
        {{
          data.createdAt
            ? 'Выпущен ' + formatDate(data.createdAt, demo.profile.timeZone)
            : 'Ключ ещё не выпускался.'
        }}<br />{{
          data.lastUsedAt
            ? 'Последнее использование: ' +
              formatDate(data.lastUsedAt, demo.profile.timeZone)
            : 'Ещё не использовался.'
        }}
      </p>
      <NoticeMessage v-if="message">{{ message }}</NoticeMessage>
      <template v-if="secret">
        <NoticeMessage tone="warning"
          >Полный ключ показывается один раз. Это строка DEMO, она не
          предоставляет доступ к API. Храните реальные ключи вне исходников, URL
          и переписки.</NoticeMessage
        >
        <CopyText :value="secret" label="Полный учебный API-ключ" />
        <BaseButton variant="text" @click="secret = ''"
          >Я сохранил ключ — скрыть</BaseButton
        >
      </template>
      <NoticeMessage v-else-if="data.status === 'active'"
        >Полный ключ больше не показывается. При необходимости выпустите новый.
        Старые интеграции потеряют доступ.</NoticeMessage
      >
      <BaseButton
        :variant="data.status === 'active' ? 'secondary' : 'primary'"
        :disabled="loading"
        @click="request('issue')"
        >{{
          data.status === 'active' ? 'Заменить ключ' : 'Выпустить ключ'
        }}</BaseButton
      >
      <BaseButton
        v-if="data.status === 'active'"
        variant="danger"
        :disabled="loading"
        @click="request('revoke')"
        >Отозвать ключ</BaseButton
      >
    </section>
    <section class="panel workspace-panel stack">
      <h2 class="panel-title">Как использовать API</h2>
      <p>
        Ключ нужен только внешней программе. Для работы через сайт он не
        требуется.
      </p>
      <RouterLink to="/api-docs" class="button button-secondary"
        >Открыть документацию API</RouterLink
      >
    </section>
    <SensitiveActionDialog
      :open="!!action"
      id="key-action"
      :title="
        action === 'revoke'
          ? 'Отозвать ключ?'
          : data?.status === 'active'
            ? 'Заменить ключ?'
            : 'Выпустить ключ?'
      "
      :description="
        action === 'revoke'
          ? 'Текущие интеграции сразу потеряют доступ. Для продолжения понадобится новый ключ.'
          : data?.status === 'active'
            ? 'Прежний ключ перестанет работать сразу после замены. Новый секрет будет показан один раз.'
            : 'Новый секрет будет показан один раз. Требуется повторная проверка пароля.'
      "
      :confirm-label="
        action === 'revoke'
          ? 'Отозвать ключ'
          : data?.status === 'active'
            ? 'Заменить ключ'
            : 'Выпустить ключ'
      "
      :danger="action === 'revoke'"
      :execute="execute"
      @close="action = ''"
      @complete="complete"
      @failure="failure"
    />
  </section>
</template>
<style scoped>
.api-key-page {
  gap: 24px;
}
.key-mask {
  font-size: 24px;
  overflow-wrap: anywhere;
}
</style>
