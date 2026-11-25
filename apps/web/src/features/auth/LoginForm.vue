<script setup>
import { computed, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import BaseButton from '../../shared/ui/BaseButton.vue'
import FormField from '../../shared/ui/FormField.vue'
import NoticeMessage from '../../shared/ui/NoticeMessage.vue'
import { demo, demoApi } from '../../shared/api/demo-client.js'
import { onBeforeUnmount } from 'vue'
import { safeReturnPath } from '../../shared/config/return-path.js'
import { useConversionDraft } from '../conversion/model.js'
import { useRetryDelay } from '../../shared/api/use-retry-delay.js'
const { remaining: retryIn, apply: delayRetry } = useRetryDelay()
const { selectedFile } = useConversionDraft()
const route = useRoute()
const router = useRouter()
const busy = ref(false)
let controller
let disposed = false
onBeforeUnmount(() => {
  controller?.abort()
  disposed = true
  password.value = ''
  showPassword.value = false
})
const login = ref('')
const password = ref('')
const showPassword = ref(false)
const submitted = ref(false)
const edited = ref({ login: false, password: false })
const touched = ref({ login: false, password: false })
const message = ref('')
const loginError = computed(() =>
  !submitted.value && !touched.value.login
    ? ''
    : !login.value
      ? 'Введите логин.'
      : login.value.length < 3 ||
          login.value.length > 32 ||
          /[^a-z0-9_]/i.test(login.value)
        ? 'Логин: 3–32 латинские буквы, цифры или _. Регистр не важен.'
        : '',
)
// REQ-08 counts Unicode code points, not UTF-16 code units.
// Bound the scan: any value above 128 is invalid; never trim/normalize the secret.
const passwordLength = computed(() => {
  let length = 0
  for (const _character of password.value) {
    length += 1
    if (length > 128) break
  }
  return length
})
const passwordError = computed(() =>
  !submitted.value && !touched.value.password
    ? ''
    : !password.value
      ? 'Введите пароль.'
      : passwordLength.value < 15 || passwordLength.value > 128
        ? 'Пароль должен содержать от 15 до 128 символов.'
        : '',
)
function onFieldBlur(event) {
  // Let a button receive its click before validation can move it in the layout.
  if (event.relatedTarget instanceof HTMLButtonElement) return
  touched.value = { ...edited.value }
}
function togglePassword() {
  showPassword.value = !showPassword.value
  touched.value = { ...edited.value }
}
async function submit() {
  if (busy.value || retryIn.value) return
  submitted.value = true
  message.value = ''
  if (loginError.value || passwordError.value) {
    document.getElementById(loginError.value ? 'login' : 'password')?.focus()
    return
  }
  if (demo.enabled) {
    busy.value = true
    try {
      controller = new AbortController()
      await demoApi.signIn({ signal: controller.signal })
      if (!disposed)
        await router.push(
          safeReturnPath(
            route.query.next,
            selectedFile.value ? '/' : '/account',
          ),
        )
    } catch (error) {
      if (!disposed) {
        message.value = error.message
        delayRetry(error)
      }
    } finally {
      if (!disposed) {
        busy.value = false
        password.value = ''
        showPassword.value = false
        submitted.value = false
        edited.value = { login: false, password: false }
        touched.value = { login: false, password: false }
      }
    }
    return
  }
  // No real transport or persistence.
  message.value = 'Вход пока не подключён. Логин и пароль никуда не отправлены.'
  password.value = ''
  showPassword.value = false
  submitted.value = false
  edited.value = { login: false, password: false }
  touched.value = { login: false, password: false }
}
</script>

<template>
  <form class="login-form" novalidate @submit.prevent="submit">
    <FormField id="login" label="Логин" :error="loginError" v-slot="field">
      <input
        id="login"
        v-model="login"
        name="username"
        class="control"
        @input="edited.login = true"
        @blur="onFieldBlur"
        autocomplete="username"
        autocapitalize="none"
        :spellcheck="false"
        required
        :aria-invalid="field.invalid"
        :aria-describedby="field.describedBy"
      />
    </FormField>
    <FormField
      id="password"
      label="Пароль"
      :error="passwordError"
      v-slot="field"
    >
      <input
        id="password"
        v-model="password"
        name="password"
        class="control"
        :type="showPassword ? 'text' : 'password'"
        @input="edited.password = true"
        @blur="onFieldBlur"
        autocomplete="current-password"
        autocapitalize="none"
        autocorrect="off"
        :spellcheck="false"
        required
        :aria-invalid="field.invalid"
        :aria-describedby="field.describedBy"
      />
    </FormField>
    <button
      class="password-toggle"
      type="button"
      :aria-pressed="showPassword"
      aria-controls="password"
      @click="togglePassword"
      @blur="onFieldBlur"
    >
      {{ showPassword ? 'Скрыть пароль' : 'Показать пароль' }}
    </button>
    <p v-if="retryIn" role="status">Повтор через {{ retryIn }} с.</p>
    <NoticeMessage v-if="message">{{ message }}</NoticeMessage>
    <BaseButton
      class="full-width"
      type="submit"
      :disabled="busy || !!retryIn"
      :loading="busy"
      >Войти</BaseButton
    >
    <RouterLink to="/auth/recover" class="secondary auth-recovery"
      >Забыли пароль? <span aria-hidden="true">→</span></RouterLink
    >
    <div class="auth-divider"></div>
    <RouterLink to="/auth/register" class="button button-secondary full-width"
      >Создать аккаунт</RouterLink
    >
  </form>
</template>
