<script setup>
import { RouterLink } from 'vue-router'
</script>
<template>
  <section class="container public-prose stack not-found">
    <p class="not-found-code">404</p>
    <h1>Страница не найдена</h1>
    <p>Проверьте адрес или вернитесь к конвертеру.</p>
    <RouterLink to="/" class="button button-primary document-download"
      >К конвертеру</RouterLink
    >
  </section>
</template>
<style scoped>
.not-found {
  max-width: 560px;
  margin-top: 168px;
  gap: 24px;
}
.not-found-code {
  font-size: 72px;
  line-height: 1.3;
  color: var(--color-text-muted);
}
.not-found .button {
  min-width: 240px;
  max-width: 100%;
}
@media (max-width: 767px) {
  .not-found {
    margin-top: 64px;
  }
  .not-found-code {
    font-size: 64px;
  }
}
</style>
