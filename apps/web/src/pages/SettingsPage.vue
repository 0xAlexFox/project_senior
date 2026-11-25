<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { onBeforeRouteLeave, useRouter } from 'vue-router'
import { demo, demoApi } from '../shared/api/demo-client.js'
import { useDemoResource } from '../shared/api/use-demo-resource.js'
import { nameProblem, passwordProblem } from '../features/auth/validation.js'
import { formatDate } from '../shared/lib/format.js'
import InputField from '../shared/ui/InputField.vue'
import SelectField from '../shared/ui/SelectField.vue'
import PasswordField from '../shared/ui/PasswordField.vue'
import BaseButton from '../shared/ui/BaseButton.vue'
import BaseDialog from '../shared/ui/BaseDialog.vue'
import NoticeMessage from '../shared/ui/NoticeMessage.vue'
import LoadingState from '../shared/ui/LoadingState.vue'
import StatusBadge from '../shared/ui/StatusBadge.vue'
import SensitiveActionDialog from '../features/auth/SensitiveActionDialog.vue'
import OneTimeCodes from '../features/auth/OneTimeCodes.vue'
const router = useRouter()
const { data, error, loading, load } = useDemoResource(demoApi.profile)
const name = ref(''),
  zone = ref('Europe/Moscow'),
  profileBusy = ref(false),
  profileError = ref(''),
  profileMessage = ref(''),
  nameError = ref('')
const currentPassword = ref(''),
  newPassword = ref(''),
  confirmation = ref(''),
  passwordBusy = ref(false),
  passwordError = ref(''),
  passwordMessage = ref(''),
  passwordSubmitted = ref(false)
const action = ref(''),
  securityError = ref(''),
  securityMessage = ref(''),
  codes = ref(null),
  deleteConfirmed = ref(false),
  telegramBusy = ref(false)
const now = ref(Date.now()),
  leaving = ref(false)
const controller = new AbortController(),
  options = { signal: controller.signal }
let initialized = false,
  clock,
  leaveAnswer
let zones
try {
  zones = ['UTC', ...Intl.supportedValuesOf('timeZone')]
} catch {
  zones = ['UTC', 'Europe/Moscow']
}
const zoneOptions = zones.map((value) => ({
  value,
  label: value === 'Europe/Moscow' ? value + ' · МСК' : value,
}))
const dirty = computed(
  () =>
    initialized &&
    !!data.value &&
    (name.value !== data.value.displayName ||
      zone.value !== data.value.timeZone),
)
const expired = computed(
  () =>
    demo.telegram.status === 'pending' && now.value >= demo.telegram.expiresAt,
)
const passwordErrors = computed(() =>
  passwordSubmitted.value
    ? {
        current: passwordProblem(currentPassword.value),
        next: passwordProblem(newPassword.value),
        confirm:
          confirmation.value !== newPassword.value
            ? 'Пароли не совпадают.'
            : '',
      }
    : {},
)
function resetProfile() {
  if (!data.value) return
  name.value = data.value.displayName
  zone.value = data.value.timeZone
  profileError.value = ''
  nameError.value = ''
}
watch(data, (value) => {
  if (value && !initialized) {
    resetProfile()
    initialized = true
  }
})
async function saveProfile() {
  if (profileBusy.value || !dirty.value || !data.value) return
  nameError.value = nameProblem(name.value)
  if (nameError.value) {
    document.getElementById('settings-name')?.focus()
    return
  }
  profileBusy.value = true
  profileError.value = ''
  profileMessage.value = ''
  const draft = { displayName: name.value, timeZone: zone.value }
  try {
    const profile = await demoApi.updateProfile(
      draft,
      data.value.version,
      options,
    )
    if (!controller.signal.aborted) {
      data.value = profile
      resetProfile()
      profileMessage.value = 'Учебный профиль сохранён.'
    }
  } catch (failure) {
    if (!controller.signal.aborted) {
      profileError.value = failure.message
      if (failure.code === 'SETTINGS_CONFLICT') {
        await load()
        profileError.value =
          'Версия профиля изменилась. Ваш ввод сохранён. Сверьте актуальные данные и повторите сохранение либо отмените изменения.'
      }
    }
  } finally {
    if (!controller.signal.aborted) profileBusy.value = false
  }
}
function clearPasswords() {
  currentPassword.value = ''
  newPassword.value = ''
  confirmation.value = ''
  passwordSubmitted.value = false
}
async function changePassword() {
  if (passwordBusy.value) return
  passwordSubmitted.value = true
  passwordError.value = ''
  passwordMessage.value = ''
  if (Object.values(passwordErrors.value).some(Boolean)) {
    await nextTick()
    document.querySelector('#password-settings [aria-invalid="true"]')?.focus()
    return
  }
  passwordBusy.value = true
  try {
    await demoApi.reauth(options)
    await demoApi.changePassword(options)
    if (!controller.signal.aborted)
      passwordMessage.value =
        'Учебный ответ: пароль изменён, остальные сессии завершены. Текущая сессия продолжается.'
  } catch (failure) {
    if (!controller.signal.aborted) passwordError.value = failure.message
  } finally {
    if (!controller.signal.aborted) {
      passwordBusy.value = false
      clearPasswords()
    }
  }
}
function request(value) {
  action.value = value
  deleteConfirmed.value = false
  securityError.value = ''
  securityMessage.value = ''
}
function execute(requestOptions) {
  return {
    telegram: demoApi.startTelegram,
    disconnect: demoApi.disconnectTelegram,
    codes: demoApi.regenerateCodes,
    delete: demoApi.deleteAccount,
  }[action.value](requestOptions)
}
async function complete(response) {
  if (controller.signal.aborted) return
  const completed = action.value
  action.value = ''
  if (completed === 'codes') {
    codes.value = response.recoveryCodes
    securityMessage.value = 'Прежние резервные коды аннулированы.'
  } else if (completed === 'delete') {
    initialized = false
    codes.value = null
    clearPasswords()
    await router.push('/')
  } else
    securityMessage.value =
      completed === 'disconnect'
        ? 'Учебная привязка отключена.'
        : 'Учебный challenge создан. Настоящее сообщение боту не отправлялось.'
}
async function failure(failure) {
  if (
    action.value === 'codes' &&
    failure.stage === 'action' &&
    failure.code === 'RESPONSE_LOST'
  ) {
    action.value = ''
    codes.value = null
    securityError.value =
      'Новый комплект выпущен, но ответ потерян. Прежние коды недействительны. Выпустите новый набор явно.'
  }
}
async function confirmTelegram() {
  if (telegramBusy.value || expired.value) return
  telegramBusy.value = true
  securityError.value = ''
  try {
    await demoApi.confirmTelegram(options)
    if (!controller.signal.aborted)
      securityMessage.value = 'Учебная привязка подтверждена с обеих сторон.'
  } catch (failure) {
    if (!controller.signal.aborted) securityError.value = failure.message
  } finally {
    if (!controller.signal.aborted) telegramBusy.value = false
  }
}
async function cancelTelegram() {
  if (telegramBusy.value) return
  telegramBusy.value = true
  securityError.value = ''
  try {
    await demoApi.cancelTelegram(options)
    if (!controller.signal.aborted)
      securityMessage.value =
        'Учебный challenge отменён. Прежняя привязка сохранена, если она была.'
  } catch (failure) {
    if (!controller.signal.aborted) securityError.value = failure.message
  } finally {
    if (!controller.signal.aborted) telegramBusy.value = false
  }
}
async function acknowledgeCodes() {
  if (telegramBusy.value) return
  telegramBusy.value = true
  securityError.value = ''
  try {
    await demoApi.confirmCodes(options)
    if (!controller.signal.aborted) {
      codes.value = null
      securityMessage.value = 'Получение учебных кодов подтверждено.'
    }
  } catch (failure) {
    if (!controller.signal.aborted) securityError.value = failure.message
  } finally {
    if (!controller.signal.aborted) telegramBusy.value = false
  }
}
function answerLeave(answer) {
  leaving.value = false
  leaveAnswer?.(answer)
  leaveAnswer = null
}
onBeforeRouteLeave(() =>
  demo.viewer && (dirty.value || codes.value)
    ? new Promise((resolve) => {
        leaveAnswer = resolve
        leaving.value = true
      })
    : true,
)
function beforeUnload(event) {
  if (dirty.value || codes.value) {
    event.preventDefault()
    event.returnValue = ''
  }
}
watch(
  () => demo.viewer,
  (viewer) => {
    if (!viewer) {
      codes.value = null
      clearPasswords()
      if (action.value !== 'delete' || demo.enabled) action.value = ''
    }
  },
)
onMounted(() => {
  clock = setInterval(() => {
    now.value = Date.now()
  }, 1000)
  window.addEventListener('beforeunload', beforeUnload)
})
onBeforeUnmount(() => {
  controller.abort()
  clearInterval(clock)
  window.removeEventListener('beforeunload', beforeUnload)
  clearPasswords()
  codes.value = null
  leaveAnswer?.(false)
})
</script>
<template>
  <section class="stack settings-page">
    <h1>Настройки</h1>
    <p class="secondary">Профиль, пароль и способы восстановления</p>
    <NoticeMessage v-if="!demo.enabled || !demo.viewer"
      >Настройки пока не подключены. Включите учебные ответы.</NoticeMessage
    >
    <LoadingState v-if="loading" />
    <NoticeMessage v-if="error" tone="danger"
      >{{ error }}
      <BaseButton variant="text" @click="load"
        >Повторить загрузку настроек</BaseButton
      ></NoticeMessage
    >
    <template v-if="data">
      <form
        class="panel workspace-panel stack form-stack"
        novalidate
        @submit.prevent="saveProfile"
      >
        <h2 class="panel-title">Личные данные</h2>
        <InputField
          id="settings-name"
          v-model="name"
          label="Имя"
          :error="nameError"
          :disabled="profileBusy"
          autocomplete="nickname"
          hint="1–80 символов; внешние пробелы удаляются."
        />
        <p class="caption">Логин: {{ data.login }} · изменить нельзя</p>
        <SelectField
          id="settings-zone"
          v-model="zone"
          label="Часовой пояс"
          :disabled="profileBusy"
          :options="zoneOptions"
        />
        <p class="caption">
          Пример даты: {{ formatDate('2026-11-19T11:30:00Z', zone) }}
        </p>
        <NoticeMessage v-if="profileError" tone="danger"
          >{{ profileError }} Актуальный профиль: {{ data.displayName }} ·
          {{ data.timeZone }}.</NoticeMessage
        >
        <p v-if="profileMessage" role="status">{{ profileMessage }}</p>
        <BaseButton
          type="submit"
          :disabled="!dirty || profileBusy || loading"
          :loading="profileBusy"
          >Сохранить изменения</BaseButton
        >
        <BaseButton
          variant="text"
          :disabled="!dirty || profileBusy"
          @click="resetProfile"
          >Отменить изменения</BaseButton
        >
      </form>
      <form
        id="password-settings"
        class="panel workspace-panel stack form-stack"
        novalidate
        @submit.prevent="changePassword"
      >
        <h2 class="panel-title">Пароль</h2>
        <p class="secondary">
          После смены пароля другие сессии завершатся. Не вводите настоящий
          пароль: это учебная проверка.
        </p>
        <PasswordField
          id="settings-current"
          v-model="currentPassword"
          label="Текущий пароль"
          :error="passwordErrors.current"
          :disabled="passwordBusy"
        />
        <PasswordField
          id="settings-new"
          v-model="newPassword"
          label="Новый пароль"
          autocomplete="new-password"
          hint="15–128 символов, пробелы допустимы"
          :error="passwordErrors.next"
          :disabled="passwordBusy"
        />
        <PasswordField
          id="settings-confirm"
          v-model="confirmation"
          label="Подтверждение пароля"
          autocomplete="new-password"
          :error="passwordErrors.confirm"
          :disabled="passwordBusy"
        />
        <NoticeMessage v-if="passwordError" tone="danger">{{
          passwordError
        }}</NoticeMessage>
        <p v-if="passwordMessage" role="status">{{ passwordMessage }}</p>
        <BaseButton type="submit" variant="secondary" :loading="passwordBusy"
          >Изменить пароль</BaseButton
        >
      </form>
      <section class="panel workspace-panel stack">
        <h2 class="panel-title">Telegram</h2>
        <p class="secondary">Дополнительный способ восстановления доступа.</p>
        <StatusBadge>{{
          {
            connected: 'Подключён',
            disconnected: 'Не подключён',
            pending: 'Ожидает подтверждения',
          }[demo.telegram.status]
        }}</StatusBadge>
        <p>Открыть бота → Подтвердить в боте → Подтвердить здесь</p>
        <template v-if="demo.telegram.status === 'pending'">
          <p v-if="demo.telegram.previousConnected">
            Прежняя привязка продолжает действовать до подтверждения новой.
          </p>
          <NoticeMessage :tone="expired ? 'warning' : 'info'">{{
            expired
              ? 'Срок challenge истёк. Начните подключение заново.'
              : 'Учебный challenge действует до ' +
                formatDate(
                  new Date(demo.telegram.expiresAt).toISOString(),
                  demo.profile.timeZone,
                ) +
                '.'
          }}</NoticeMessage>
          <p>
            Это тестовый сценарий: подтвердите ответ учебного бота в панели
            «Учебные ответы и состояния». Внешний бот не открывается, сообщения
            не отправляются.
          </p>
          <p class="caption">
            Со стороны бота:
            {{ demo.telegram.botConfirmed ? 'подтверждено' : 'ожидается' }}
          </p>
          <BaseButton
            :disabled="telegramBusy || expired"
            :loading="telegramBusy"
            @click="confirmTelegram"
            >Подтвердить здесь</BaseButton
          >
          <BaseButton
            variant="text"
            :disabled="telegramBusy"
            @click="cancelTelegram"
            >Отменить подключение</BaseButton
          >
        </template>
        <BaseButton
          variant="secondary"
          :disabled="telegramBusy"
          @click="request('telegram')"
          >{{
            demo.telegram.status === 'connected'
              ? 'Сменить Telegram'
              : demo.telegram.status === 'pending'
                ? 'Начать подключение заново'
                : 'Подключить Telegram'
          }}</BaseButton
        >
        <BaseButton
          v-if="
            demo.telegram.status === 'connected' ||
            demo.telegram.previousConnected
          "
          variant="text"
          :disabled="!demo.codeCount || !demo.codesConfirmed"
          @click="request('disconnect')"
          >Отключить Telegram</BaseButton
        >
        <p v-if="!demo.codeCount || !demo.codesConfirmed" class="caption">
          Для отключения получите и подтвердите резервные коды.
        </p>
      </section>
      <section class="panel workspace-panel stack">
        <h2 class="panel-title">Резервные коды</h2>
        <p>
          Осталось {{ demo.codeCount }} из 8 кодов. Новый набор аннулирует
          прежний.
        </p>
        <OneTimeCodes v-if="codes" :codes="codes" @done="acknowledgeCodes" />
        <BaseButton v-else variant="secondary" @click="request('codes')"
          >Выпустить новый набор</BaseButton
        >
      </section>
      <NoticeMessage v-if="securityError" tone="danger">{{
        securityError
      }}</NoticeMessage>
      <p v-if="securityMessage" role="status">{{ securityMessage }}</p>
      <section class="panel workspace-panel stack danger-zone">
        <h2 class="panel-title">Удаление аккаунта</h2>
        <p>
          Файлы станут недоступны сразу. Ключ и сессии будут отозваны,
          незавершённые задачи отменены.
        </p>
        <p class="caption">
          Физическая очистка файлов — до 24 часов, резервных копий — до 7 суток.
          В учебной версии удаляются только синтетические данные вкладки.
        </p>
        <BaseButton variant="danger" @click="request('delete')"
          >Удалить аккаунт</BaseButton
        >
      </section>
    </template>
    <SensitiveActionDialog
      :open="!!action"
      id="settings-action"
      :title="
        {
          telegram: 'Подключить Telegram?',
          disconnect: 'Отключить Telegram?',
          codes: 'Выпустить новый набор?',
          delete: 'Удалить аккаунт?',
        }[action] || 'Подтверждение'
      "
      :description="
        {
          telegram:
            'Прежняя привязка сохранится до подтверждения новой с обеих сторон.',
          disconnect:
            'Восстановление через Telegram станет недоступно. Убедитесь, что сохранили резервные коды.',
          codes:
            'Прежние резервные коды сразу аннулируются. Новый набор будет показан один раз.',
          delete:
            'Файлы, ключ и сессии станут недоступны. Отменить удаление через интерфейс нельзя.',
        }[action] || ''
      "
      :confirm-label="
        {
          telegram: 'Начать подключение',
          disconnect: 'Отключить Telegram',
          codes: 'Выпустить набор',
          delete: 'Удалить аккаунт',
        }[action] || 'Подтвердить'
      "
      :danger="action === 'delete' || action === 'disconnect'"
      :confirm-disabled="action === 'delete' && !deleteConfirmed"
      :execute="execute"
      @close="action = ''"
      @complete="complete"
      @failure="failure"
    >
      <label v-if="action === 'delete'"
        ><input v-model="deleteConfirmed" type="checkbox" /> Подтверждаю
        удаление аккаунта и файлов</label
      >
    </SensitiveActionDialog>
    <BaseDialog
      :open="leaving"
      id="unsaved-settings"
      title="Покинуть настройки?"
      description="Несохранённые изменения и показанные один раз коды будут потеряны."
      confirm-label="Покинуть"
      @close="answerLeave(false)"
      @confirm="answerLeave(true)"
    />
  </section>
</template>
<style scoped>
.settings-page {
  gap: 24px;
}
.danger-zone {
  border-color: var(--color-danger);
}
</style>
