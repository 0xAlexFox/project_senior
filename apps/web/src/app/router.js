import { nextTick } from 'vue'
import { demo } from '../shared/api/demo-client.js'
import { safeReturnPath } from '../shared/config/return-path.js'
import { createRouter, createWebHistory } from 'vue-router'
import HomePage from '../pages/HomePage.vue'
import LoginPage from '../pages/LoginPage.vue'
export const router = createRouter({
  history: createWebHistory(),
  routes: [
    ...(import.meta.env.DEV
      ? [
          {
            path: '/preview/components',
            component: () => import('../dev/ComponentsPreview.vue'),
            meta: { title: 'Компоненты — тестовый стенд' },
          },
        ]
      : []),
    { path: '/', component: HomePage, meta: { title: 'Конвертер файлов' } },
    { path: '/auth/login', component: LoginPage, meta: { title: 'Войти' } },
    {
      path: '/account',
      component: () => import('../pages/AccountPage.vue'),
      meta: { title: 'Личный кабинет' },
    },
    {
      path: '/account/files',
      component: () => import('../pages/FilesPage.vue'),
      meta: { title: 'Мои файлы' },
    },
    {
      path: '/account/api-key',
      component: () => import('../pages/ApiKeyPage.vue'),
      meta: { title: 'API-ключ' },
    },
    {
      path: '/account/settings',
      component: () => import('../pages/SettingsPage.vue'),
      meta: { title: 'Настройки' },
    },
    ...[
      ['register', 'Создать аккаунт'],
      ['recover', 'Восстановить доступ'],
      ['reset', 'Новый пароль'],
    ].map(([mode, title]) => ({
      path: '/auth/' + mode,
      component: () => import('../pages/AuthPage.vue'),
      props: { mode },
      meta: { title },
    })),
    {
      path: '/api-docs',
      component: () => import('../pages/ApiDocsPage.vue'),
      meta: { title: 'Документация API' },
    },
    {
      path: '/privacy',
      component: () => import('../pages/PrivacyPage.vue'),
      meta: { title: 'Конфиденциальность' },
    },
    {
      path: '/:pathMatch(.*)*',
      component: () => import('../pages/NotFoundPage.vue'),
      meta: { title: 'Страница не найдена' },
    },
  ],
  scrollBehavior: (to, from, saved) =>
    saved ||
    (/^#[a-z][a-z0-9-]{0,60}$/i.test(to.hash) ? { el: to.hash } : { top: 0 }),
})

// This is a preview navigation boundary, never server authorization.
router.beforeEach((to) => {
  if (/^\/account(?:\/|$)/.test(to.path) && !demo.viewer)
    return { path: '/auth/login', query: { next: to.path } }
  if (demo.viewer && ['/auth/login', '/auth/register'].includes(to.path))
    return safeReturnPath(to.query.next)
  if (
    to.path === '/auth/reset' &&
    (!demo.enabled || !demo.resetUntil || demo.resetUntil <= Date.now())
  )
    return { path: '/auth/recover', query: { reason: 'expired' } }
})
router.afterEach(async (to, from, failure) => {
  if (failure) return
  document.title =
    to.path === '/' ? to.meta.title : `${to.meta.title} — Конвертер`
  if (to.path !== from.path) {
    await nextTick()
    const heading = document.querySelector('main h1')
    heading?.setAttribute('tabindex', '-1')
    heading?.focus({ preventScroll: true })
  }
})
