import { createRouter, createWebHistory } from 'vue-router'
import HomePage from '../pages/HomePage.vue'
import LoginPage from '../pages/LoginPage.vue'
import PlaceholderPage from '../pages/PlaceholderPage.vue'

const pending = [
  ['/auth/register', 'Создать аккаунт'],
  ['/auth/recover', 'Восстановить доступ'],
  ['/auth/reset', 'Новый пароль'],
  ['/account', 'Личный кабинет'],
  ['/account/files', 'Мои файлы'],
  ['/account/api-key', 'API-ключ'],
  ['/account/settings', 'Настройки'],
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
