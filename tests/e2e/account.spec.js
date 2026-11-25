import { test, expect } from '@playwright/test'
test('сохранение подтверждается ответом; ошибка откатывает, конфликт перечитывает версию', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Открыть учебный кабинет' }).click()
  const setting = page.getByRole('switch', {
    name: 'Сохранять новые результаты в профиле',
  })
  await expect(setting).toHaveAttribute('aria-checked', 'false')
  await setting.click()
  await expect(setting).toHaveAttribute('aria-checked', 'true')
  await page.getByText('Учебные ответы и состояния', { exact: true }).click()
  await page.getByLabel('Следующий учебный ответ').selectOption('NETWORK_ERROR')
  await setting.click()
  await expect(page.getByRole('alert')).toContainText('Нет связи')
  await expect(setting).toHaveAttribute('aria-checked', 'true')
  await page
    .getByLabel('Следующий учебный ответ')
    .selectOption('SETTINGS_CONFLICT')
  await setting.click()
  await expect(page.getByRole('alert')).toContainText(
    'Показано актуальное значение',
  )
  await expect(setting).toHaveAttribute('aria-checked', 'false')
  await setting.click()
  await expect(setting).toHaveAttribute('aria-checked', 'true')
  await expect(page.getByRole('heading', { name: 'Хранилище' })).toBeVisible()
})
