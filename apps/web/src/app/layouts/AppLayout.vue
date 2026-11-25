<script setup>
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import AppIcon from '../../shared/ui/AppIcon.vue'
import BaseButton from '../../shared/ui/BaseButton.vue'
import AccountLayout from './AccountLayout.vue'
import { accountLinks } from '../../shared/config/navigation.js'
import PreviewControls from '../preview/PreviewControls.vue'
import NoticeMessage from '../../shared/ui/NoticeMessage.vue'
import { demo, demoApi } from '../../shared/api/demo-client.js'
import { clearConversionDraft } from '../../features/conversion/model.js'
const route = useRoute()
const auth = computed(() => route.path.startsWith('/auth/'))
const account = computed(() => /^\/account(?:\/|$)/.test(route.path))
const menuOpen = ref(false)
watch(
  () => demo.viewer,
  (viewer, previous) => {
    if (previous && !viewer) clearConversionDraft()
  },
)
function signOut() {
  demoApi.signOut()
  menuOpen.value = false
}
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
      <RouterLink
        :to="demo.enabled && demo.viewer ? '/account' : '/auth/login'"
        class="button button-secondary desktop-login"
        >{{ demo.enabled && demo.viewer ? 'Кабинет' : 'Войти' }}</RouterLink
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
        <template v-if="account">
          <RouterLink
            v-for="link in accountLinks"
            :key="link.to"
            :to="link.to"
            :aria-current="route.path === link.to ? 'page' : undefined"
            >{{ link.label }}</RouterLink
          >
        </template>
        <RouterLink v-if="!demo.viewer" to="/auth/login">Войти</RouterLink>
        <template v-else
          ><RouterLink to="/account">Кабинет</RouterLink
          ><BaseButton variant="text" @click="signOut"
            >Выйти из учебного кабинета</BaseButton
          ></template
        >
      </nav>
    </template>
  </header>
  <NoticeMessage v-if="demo.enabled" class="preview-banner container"
    >Учебная версия. Данные вымышлены; сервер, авторизация и конвертация не
    подключены.</NoticeMessage
  >
  <main id="main-content" tabindex="-1" :class="{ 'auth-main': auth }">
    <AccountLayout v-if="account"><slot /></AccountLayout>
    <slot v-else />
  </main>
  <footer v-if="!auth" class="site-footer container">
    <RouterLink to="/privacy">Конфиденциальность</RouterLink>
    <RouterLink to="/api-docs">Документация API</RouterLink>
  </footer>
  <PreviewControls />
</template>
