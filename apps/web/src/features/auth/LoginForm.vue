<script setup>
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import BaseButton from '../../shared/ui/BaseButton.vue'
import FormField from '../../shared/ui/FormField.vue'
import NoticeMessage from '../../shared/ui/NoticeMessage.vue'
const login = ref('')
const password = ref('')
const showPassword = ref(false)
const submitted = ref(false)
const message = ref('')
const loginError = computed(() =>
  !submitted.value
    ? ''
    : !login.value
      ? 'Введите логин.'
      : !/^[a-z0-9_]{3,32}$/.test(login.value)
        ? 'Логин: 3–32 символа a–z, 0–9 или _.'
        : '',
)
const passwordError = computed(() =>
  !submitted.value
    ? ''
    : !password.value
      ? 'Введите пароль.'
      : password.value.length < 15 || password.value.length > 128
        ? 'Пароль должен содержать от 15 до 128 символов.'
        : '',
)
function submit() {
  submitted.value = true
  message.value = ''
  if (loginError.value || passwordError.value) {
    document.getElementById(loginError.value ? 'login' : 'password')?.focus()
    return
  }
  // Deliberately no fetch, auth cookie, persistence, or simulated login.
  message.value = 'Вход пока не подключён. Логин и пароль никуда не отправлены.'
  password.value = ''
  submitted.value = false
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
        autocomplete="current-password"
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
      @click="showPassword = !showPassword"
    >
      {{ showPassword ? 'Скрыть пароль' : 'Показать пароль' }}
    </button>
    <NoticeMessage v-if="message">{{ message }}</NoticeMessage>
    <BaseButton class="full-width" type="submit">Войти</BaseButton>
    <RouterLink to="/auth/recover" class="secondary auth-recovery"
      >Забыли пароль? <span aria-hidden="true">→</span></RouterLink
    >
    <div class="auth-divider"></div>
    <RouterLink to="/auth/register" class="button button-secondary full-width"
      >Создать аккаунт</RouterLink
    >
  </form>
</template>
