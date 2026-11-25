<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterLink, onBeforeRouteLeave, useRoute, useRouter } from 'vue-router'
import { demo, demoApi } from '../shared/api/demo-client.js'
import {
  loginProblem,
  nameProblem,
  passwordProblem,
} from '../features/auth/validation.js'
import InputField from '../shared/ui/InputField.vue'
import PasswordField from '../shared/ui/PasswordField.vue'
import BaseButton from '../shared/ui/BaseButton.vue'
import BaseTabs from '../shared/ui/BaseTabs.vue'
import NoticeMessage from '../shared/ui/NoticeMessage.vue'
import OneTimeCodes from '../features/auth/OneTimeCodes.vue'
import BaseDialog from '../shared/ui/BaseDialog.vue'
const props = defineProps({ mode: { type: String, required: true } })
const router = useRouter()
const route = useRoute()
const login = ref(''),
  name = ref(''),
  password = ref(''),
  confirmation = ref(''),
  code = ref('')
const submitted = ref(false),
  busy = ref(false),
  message = ref(''),
  failure = ref(''),
  codes = ref(null),
  acknowledged = ref(false)
const method = ref('telegram'),
  challenge = ref(false),
  done = ref(false),
  deadline = ref(0),
  resendAt = ref(0),
  now = ref(Date.now())
const leaving = ref(false)
const controller = new AbortController()
const options = { signal: controller.signal }
let attempts = 0
let leaveAnswer,
  clock,
  disposed = false
const errors = computed(() =>
  submitted.value
    ? {
        login: props.mode === 'reset' ? '' : loginProblem(login.value),
        name: props.mode === 'register' ? nameProblem(name.value) : '',
        password:
          props.mode !== 'recover' ? passwordProblem(password.value) : '',
        confirmation:
          props.mode !== 'recover' && confirmation.value !== password.value
            ? 'Пароли не совпадают.'
            : '',
        code:
          props.mode === 'recover' &&
          (method.value === 'backup' || challenge.value) &&
          (method.value === 'telegram'
            ? !/^\d{8}$/.test(code.value)
            : !code.value || code.value.length > 128)
            ? method.value === 'telegram'
              ? 'Введите 8 цифр.'
              : 'Введите резервный код, не более 128 символов.'
            : '',
      }
    : {},
)
const title = computed(() =>
  done.value
    ? 'Пароль изменён'
    : codes.value
      ? 'Сохраните резервные коды'
      : {
          register: 'Создать аккаунт',
          recover: 'Восстановить доступ',
          reset: 'Новый пароль',
        }[props.mode],
)
function clearSecrets() {
  password.value = ''
  confirmation.value = ''
  code.value = ''
}
function changeMethod() {
  challenge.value = false
  code.value = ''
  submitted.value = false
  message.value = ''
  failure.value = ''
}
async function submit() {
  if (busy.value) return
  submitted.value = true
  failure.value = ''
  message.value = ''
  if (Object.values(errors.value).some(Boolean)) {
    await nextTick()
    document.querySelector('.auth-card [aria-invalid="true"]')?.focus()
    return
  }
  if (!demo.enabled) {
    message.value = 'Учебные ответы выключены. Данные никуда не отправлены.'
    clearSecrets()
    submitted.value = false
    return
  }
  busy.value = true
  try {
    if (props.mode === 'register') {
      const response = await demoApi.register(options)
      if (!disposed) codes.value = response.recoveryCodes
    } else if (props.mode === 'reset') {
      await demoApi.resetPassword(options)
      if (!disposed) done.value = true
    } else if (method.value === 'telegram' && !challenge.value) {
      const response = await demoApi.requestRecovery(options)
      if (!disposed) {
        attempts = 0
        challenge.value = true
        message.value =
          response.message +
          ' Учебный ответ: настоящее сообщение не отправлялось.'
        deadline.value = Date.parse(response.expiresAt)
        resendAt.value = Date.now() + response.retryAfter * 1000
      }
    } else {
      if (method.value === 'telegram' && now.value >= deadline.value)
        throw new Error('Срок кода истёк. Запросите новый.')
      attempts += 1
      await (method.value === 'backup'
        ? demoApi.verifyBackup(options)
        : demoApi.verifyRecovery(options))
      if (!disposed) await router.push('/auth/reset')
    }
  } catch (error) {
    if (!disposed) {
      failure.value = error.message
      if (method.value === 'telegram' && attempts >= 5) {
        challenge.value = false
        failure.value =
          'Попытки исчерпаны. Запросите новый код или используйте резервный.'
      }
      if (error.retryAfter)
        resendAt.value = Date.now() + error.retryAfter * 1000
    }
  } finally {
    if (!disposed) {
      busy.value = false
      clearSecrets()
      submitted.value = false
    }
  }
}
async function finish() {
  if (busy.value) return
  busy.value = true
  try {
    await demoApi.confirmCodes(options)
    await demoApi.signIn(options)
    if (!disposed) {
      acknowledged.value = true
      codes.value = null
      await router.push('/account')
    }
  } catch (error) {
    if (!disposed) failure.value = error.message
  } finally {
    if (!disposed) busy.value = false
  }
}
function resend() {
  if (now.value < resendAt.value || busy.value) return
  challenge.value = false
  code.value = ''
  submitted.value = false
  submit()
}
function answerLeave(answer) {
  leaving.value = false
  leaveAnswer?.(answer)
  leaveAnswer = null
}
onBeforeRouteLeave(() =>
  codes.value && !acknowledged.value
    ? new Promise((resolve) => {
        leaveAnswer = resolve
        leaving.value = true
      })
    : true,
)
onMounted(() => {
  if (props.mode === 'recover' && route.query.reason === 'expired')
    message.value = 'Срок восстановления истёк. Подтвердите доступ заново.'
  clock = setInterval(() => {
    now.value = Date.now()
  }, 1000)
  if (
    props.mode === 'reset' &&
    (!demo.enabled || !demo.resetUntil || demo.resetUntil <= Date.now())
  )
    router.replace('/auth/recover?reason=expired')
})
onBeforeUnmount(() => {
  controller.abort()
  disposed = true
  clearInterval(clock)
  clearSecrets()
  codes.value = null
  leaveAnswer?.(false)
})
</script>
<template>
  <section class="auth-card panel stack" aria-labelledby="auth-title">
    <h1 id="auth-title">{{ title }}</h1>
    <NoticeMessage
      >Формы работают на учебных ответах. Не вводите настоящие пароли и
      коды.</NoticeMessage
    >
    <NoticeMessage v-if="failure" tone="danger">{{ failure }}</NoticeMessage>
    <NoticeMessage v-if="message">{{ message }}</NoticeMessage>
    <template v-if="done"
      ><p>
        Учебный ответ: сессии, ключ и прежние резервные коды отозваны. Войдите
        заново и выпустите новые коды.
      </p>
      <RouterLink to="/auth/login" class="button button-primary"
        >Войти</RouterLink
      ></template
    >
    <OneTimeCodes v-else-if="codes" :codes="codes" @done="finish" />
    <form v-else class="stack form-stack" novalidate @submit.prevent="submit">
      <BaseTabs
        v-if="mode === 'recover'"
        id="recovery-method"
        v-model="method"
        label="Способ восстановления"
        :disabled="busy"
        :options="[
          { value: 'telegram', label: 'Telegram' },
          { value: 'backup', label: 'Резервный код' },
        ]"
        @update:model-value="changeMethod"
      />
      <InputField
        v-if="mode === 'register'"
        id="display-name"
        v-model="name"
        label="Имя"
        :error="errors.name"
        :disabled="busy"
        autocomplete="nickname"
        hint="1–80 символов"
      />
      <InputField
        v-if="mode !== 'reset'"
        id="auth-login"
        v-model="login"
        label="Логин"
        :error="errors.login"
        :disabled="busy || challenge"
        autocomplete="username"
        autocapitalize="none"
        :spellcheck="false"
        hint="3–32 символа: a–z, 0–9, _. Регистр не важен."
      />
      <template v-if="mode !== 'recover'">
        <PasswordField
          id="new-password"
          v-model="password"
          label="Пароль"
          :error="errors.password"
          :disabled="busy"
          autocomplete="new-password"
          hint="15–128 символов, пробелы допустимы"
        />
        <PasswordField
          id="confirm-password"
          v-model="confirmation"
          label="Подтверждение пароля"
          :error="errors.confirmation"
          :disabled="busy"
          autocomplete="new-password"
        />
      </template>
      <template v-else-if="challenge || method === 'backup'">
        <InputField
          id="recovery-code"
          v-model="code"
          :label="method === 'telegram' ? 'Код Telegram' : 'Резервный код'"
          :error="errors.code"
          :disabled="busy"
          :inputmode="method === 'telegram' ? 'numeric' : 'text'"
          autocomplete="one-time-code"
          :spellcheck="false"
          autocapitalize="none"
        />
        <p v-if="challenge" class="caption">
          {{
            now >= deadline
              ? 'Срок кода истёк.'
              : 'Код действует ещё ' +
                Math.max(0, Math.ceil((deadline - now) / 1000)) +
                ' с.'
          }}
          Не получили код? Используйте резервный.
        </p>
        <BaseButton
          v-if="challenge"
          variant="text"
          :disabled="busy || now < resendAt"
          @click="resend"
          >Получить новый код{{
            now < resendAt
              ? ' через ' + Math.ceil((resendAt - now) / 1000) + ' с.'
              : ''
          }}</BaseButton
        >
      </template>
      <p v-if="mode === 'recover'" class="caption">
        Telegram должен быть подключён заранее. Нового получателя указать
        нельзя. При потере обоих способов автоматического восстановления нет.
      </p>
      <RouterLink v-if="mode === 'register'" to="/privacy"
        >О файлах и конфиденциальности →</RouterLink
      >
      <BaseButton
        type="submit"
        :loading="busy"
        :disabled="busy || (challenge && now >= deadline)"
        >{{
          mode === 'register'
            ? 'Создать аккаунт'
            : mode === 'reset'
              ? 'Сохранить новый пароль'
              : challenge || method === 'backup'
                ? 'Проверить код'
                : 'Получить код'
        }}</BaseButton
      >
      <RouterLink to="/auth/login">Уже есть аккаунт? Войти →</RouterLink>
    </form>
    <BaseDialog
      :open="leaving"
      id="leave-codes"
      title="Покинуть экран кодов?"
      description="Учебные коды исчезнут. Их нельзя будет показать повторно."
      confirm-label="Покинуть"
      @close="answerLeave(false)"
      @confirm="answerLeave(true)"
    />
  </section>
</template>
