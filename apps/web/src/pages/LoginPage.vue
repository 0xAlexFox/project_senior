<script setup>
import LoginForm from '../features/auth/LoginForm.vue'
import { useConversionDraft } from '../features/conversion/model.js'
import NoticeMessage from '../shared/ui/NoticeMessage.vue'
const { selectedFile } = useConversionDraft()
</script>

<template>
  <section class="auth-card panel" aria-labelledby="login-title">
    <h1 id="login-title">Войти</h1>
    <p class="secondary auth-intro">Вернитесь к своим файлам и задачам.</p>
    <NoticeMessage v-if="selectedFile" class="draft-notice"
      >Выбранный файл «{{ selectedFile.name }}» остаётся в этой вкладке. После
      перезагрузки его нужно выбрать снова.</NoticeMessage
    >
    <LoginForm />
  </section>
</template>
