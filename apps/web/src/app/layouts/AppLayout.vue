<script setup>
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import ThemeSelector from '../../features/appearance/ThemeSelector.vue'
import AppIcon from '../../shared/ui/AppIcon.vue'
import BaseButton from '../../shared/ui/BaseButton.vue'
import AccountLayout from './AccountLayout.vue'
import { accountLinks } from '../../shared/config/navigation.js'
import PreviewControls from '../preview/PreviewControls.vue'
import NoticeMessage from '../../shared/ui/NoticeMessage.vue'
import { demo, demoApi } from '../../shared/api/demo-client.js'
import { clearConversionDraft } from '../../features/conversion/model.js'
const route = useRoute()
const router = useRouter()
const profileMenu = ref(null)
const auth = computed(() => route.path.startsWith('/auth/'))
const account = computed(() => /^\/account(?:\/|$)/.test(route.path))
const menuOpen = ref(false)
watch(
  () => demo.viewer,
  (viewer, previous) => {
    if (previous && !viewer) {
      clearConversionDraft()
      if (demo.enabled && /^\/account(?:\/|$)/.test(route.path))
        router.replace({ path: '/auth/login', query: { next: route.path } })
    }
  },
)
function closeProfile() {
  if (profileMenu.value) {
    profileMenu.value.open = false
    profileMenu.value.querySelector('summary')?.focus()
  }
}
function signOut() {
  demoApi.signOut()
  menuOpen.value = false
  if (profileMenu.value) profileMenu.value.open = false
  router.push('/auth/login')
}
watch(
  () => route.fullPath,
  () => {
    menuOpen.value = false
    if (profileMenu.value) profileMenu.value.open = false
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
      <details
        v-if="demo.enabled && demo.viewer"
        ref="profileMenu"
        class="desktop-profile"
        @keydown.esc="closeProfile"
      >
        <summary class="button button-secondary">Кабинет</summary>
        <div class="panel stack profile-menu">
          <p>{{ demo.profile.displayName }}</p>
          <RouterLink to="/account">Обзор</RouterLink
          ><RouterLink to="/account/settings">Настройки</RouterLink
          ><BaseButton variant="text" @click="signOut">Выйти</BaseButton>
        </div>
      </details>
      <RouterLink
        v-else
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
  <ThemeSelector />
  <NoticeMessage v-if="demo.enabled" class="preview-banner container"
    >Учебная версия. Данные вымышлены; сервер, авторизация и конвертация не
    подключены.</NoticeMessage
  >
  <NoticeMessage
    v-if="demo.sessionReason === 'expired'"
    tone="warning"
    class="preview-banner container"
    >Учебная сессия истекла. Войдите снова. Пароли, коды и выбранный исходник
    очищены; принятую задачу можно открыть из кабинета.</NoticeMessage
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
