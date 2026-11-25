import { test, expect } from '@playwright/test'

test('оболочка кабинета: активный раздел и мобильная навигация', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Открыть учебный кабинет' }).click()
  await page.goto('/account/files')
  const sidebar = page.getByRole('navigation', { name: 'Разделы кабинета' })
  await expect(
    sidebar.getByRole('link', { name: 'Мои файлы' }),
  ).toHaveAttribute('aria-current', 'page')
  await sidebar.getByRole('link', { name: 'API-ключ' }).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('API-ключ')
  await expect(sidebar.getByRole('link', { name: 'API-ключ' })).toHaveAttribute(
    'aria-current',
    'page',
  )
  await page.setViewportSize({ width: 390, height: 900 })
  await expect(sidebar).toBeHidden()
  const menu = page.getByRole('button', { name: 'Меню', exact: true })
  await menu.click()
  const navigation = page.getByRole('navigation', {
    name: 'Мобильная навигация',
  })
  await navigation.getByRole('link', { name: 'Настройки', exact: true }).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Настройки')
  await expect(navigation).toHaveCount(0)
  await menu.click()
  await page.keyboard.press('Escape')
  await expect(menu).toHaveAttribute('aria-expanded', 'false')
})
