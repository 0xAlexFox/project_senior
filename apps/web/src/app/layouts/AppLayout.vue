<script setup>
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import AppIcon from '../../shared/ui/AppIcon.vue'
import BaseButton from '../../shared/ui/BaseButton.vue'
const route = useRoute()
const auth = computed(() => route.path.startsWith('/auth/'))
const menuOpen = ref(false)
watch(
  () => route.fullPath,
  () => {
    menuOpen.value = false
  },
)
</script>

<template>
  <a class="skip-link" href="#main-content">К содержимому</a>
  <header class="site-header container" @keydown.esc="menuOpen = false">
    <RouterLink to="/" class="brand" aria-label="Конвертер — главная">
      <AppIcon name="arrow0" :size="24" /><span>Конвертер</span>
    </RouterLink>
    <nav v-if="!auth" class="desktop-nav" aria-label="Основная навигация">
      <RouterLink to="/">Конвертер</RouterLink>
      <RouterLink to="/api-docs">Документация API</RouterLink>
    </nav>
    <RouterLink
      v-if="auth"
      to="/"
      class="button button-secondary header-action"
    >
      <span class="desktop-back">К конвертеру</span
      ><span class="mobile-back">Назад</span>
    </RouterLink>
    <template v-else>
      <RouterLink to="/auth/login" class="button button-secondary desktop-login"
        >Войти</RouterLink
      >
      <BaseButton
        class="mobile-menu-button"
        variant="secondary"
        :aria-expanded="menuOpen"
        aria-controls="mobile-nav"
        @click="menuOpen = !menuOpen"
        >{{ menuOpen ? 'Закрыть' : 'Меню' }}</BaseButton
      >
      <nav
        v-if="menuOpen"
        id="mobile-nav"
        class="mobile-nav"
        aria-label="Мобильная навигация"
      >
        <RouterLink to="/">Конвертер</RouterLink>
        <RouterLink to="/api-docs">Документация API</RouterLink>
        <RouterLink to="/auth/login">Войти</RouterLink>
      </nav>
    </template>
  </header>
  <main id="main-content" tabindex="-1" :class="{ 'auth-main': auth }">
    <slot />
  </main>
  <footer v-if="!auth" class="site-footer container">
    <RouterLink to="/privacy">Конфиденциальность</RouterLink>
    <RouterLink to="/api-docs">Документация API</RouterLink>
  </footer>
  <aside class="preview-note container" aria-label="Состояние приложения">
    Предварительная версия интерфейса. Вход, конвертация и хранение файлов пока
    не подключены.
  </aside>
</template>
