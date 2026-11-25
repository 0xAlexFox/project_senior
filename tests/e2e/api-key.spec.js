import { test, expect } from '@playwright/test'
async function enter(page) {
  await page.goto('/')
  await page.getByRole('button', { name: 'Открыть учебный кабинет' }).click()
  await page.goto('/account/api-key')
  await expect(
    page.getByRole('button', { name: 'Выпустить ключ', exact: true }),
  ).toBeVisible()
}
async function confirm(page, action) {
  const dialog = page.getByRole('dialog')
  await dialog
    .getByLabel('Текущий пароль', { exact: true })
    .fill('учебный пароль 123')
  await dialog.getByRole('button', { name: action, exact: true }).click()
}
test('ключ: пароль до первого выпуска, одноразовый секрет и отзыв', async ({
  page,
}) => {
  await enter(page)
  await page
    .getByRole('button', { name: 'Выпустить ключ', exact: true })
    .click()
  const dialog = page.getByRole('dialog')
  await dialog
    .getByRole('button', { name: 'Выпустить ключ', exact: true })
    .click()
  await expect(
    dialog.getByLabel('Текущий пароль', { exact: true }),
  ).toHaveAttribute('aria-invalid', 'true')
  await confirm(page, 'Выпустить ключ')
  await expect(
    page.getByLabel('Полный учебный API-ключ', { exact: true }),
  ).toContainText('DEMO-NOT-A-VALID')
  expect(
    await page.evaluate(() =>
      JSON.stringify({ ...sessionStorage, ...localStorage }),
    ),
  ).not.toContain('DEMO-NOT-A-VALID')
  await page.getByRole('link', { name: 'Открыть документацию API' }).click()
  await page.goBack()
  await expect(
    page.getByLabel('Полный учебный API-ключ', { exact: true }),
  ).toHaveCount(0)
  await page.getByRole('button', { name: 'Отозвать ключ', exact: true }).click()
  await expect(dialog).toContainText('интеграции сразу потеряют доступ')
  await confirm(page, 'Отозвать ключ')
  await expect(page.getByText('Отозван', { exact: true })).toBeVisible()
})
test('потеря ответа выпуска: только метаданные и явная замена', async ({
  page,
}) => {
  await enter(page)
  await page.getByText('Учебные ответы и состояния', { exact: true }).click()
  await page
    .getByLabel('Следующий учебный ответ')
    .selectOption('KEY_RESPONSE_LOST')
  await page
    .getByRole('button', { name: 'Выпустить ключ', exact: true })
    .click()
  await confirm(page, 'Выпустить ключ')
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Заменить ключ', exact: true }),
  ).toBeVisible()
  await expect(
    page.getByLabel('Полный учебный API-ключ', { exact: true }),
  ).toHaveCount(0)
  await expect(
    page.getByText('Ответ на выпуск потерян.', { exact: false }),
  ).toBeVisible()
})
