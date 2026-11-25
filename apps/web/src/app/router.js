import { createRouter, createWebHistory } from 'vue-router'
import HomePage from '../pages/HomePage.vue'
import LoginPage from '../pages/LoginPage.vue'
import PlaceholderPage from '../pages/PlaceholderPage.vue'

const pending = [
  ['/api-docs', 'Документация API'],
  ['/privacy', 'Конфиденциальность'],
]

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
    ...pending.map(([path, title]) => ({
      path,
      component: PlaceholderPage,
      meta: { title, pending: true },
    })),
    {
      path: '/:pathMatch(.*)*',
      component: PlaceholderPage,
      meta: { title: 'Страница не найдена' },
    },
  ],
  scrollBehavior: () => ({ top: 0 }),
})

router.afterEach((to) => {
  document.title =
    to.path === '/' ? to.meta.title : `${to.meta.title} — Конвертер`
})
