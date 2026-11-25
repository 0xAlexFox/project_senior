import { test, expect } from '@playwright/test'
async function enable(page, path) {
  await page.goto(path)
  await page
    .getByRole('button', { name: 'Включить учебные ответы для форм' })
    .click()
}
test('регистрация: одноразовые коды, отдельное подтверждение и отсутствие секретов в storage', async ({
  page,
}) => {
  await enable(page, '/auth/register')
  await page.getByLabel('Имя', { exact: true }).fill('Учебное имя')
  await page.getByLabel('Логин', { exact: true }).fill('DEMO_USER')
  await page.getByLabel('Пароль', { exact: true }).fill('🔒'.repeat(15))
  await page
    .getByLabel('Подтверждение пароля', { exact: true })
    .fill('🔒'.repeat(15))
  await page
    .getByRole('button', { name: 'Создать аккаунт', exact: true })
    .click()
  await expect(
    page.getByRole('heading', { name: 'Сохраните резервные коды' }),
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Продолжить', exact: true }),
  ).toBeDisabled()
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Скачать коды', exact: true }).click()
  expect((await download).suggestedFilename()).toContain('резервные-коды')
  await expect(
    page.getByRole('button', { name: 'Продолжить', exact: true }),
  ).toBeDisabled()
  await page.getByRole('link', { name: 'К конвертеру', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: 'Отмена', exact: true }).click()
  await page.getByLabel('Я сохранил резервные коды').check()
  await page.getByRole('button', { name: 'Продолжить', exact: true }).click()
  await expect(page).toHaveURL('/account')
  const storage = await page.evaluate(() =>
    JSON.stringify({ ...sessionStorage, ...localStorage }),
  )
  expect(storage).not.toContain('DEMO-1-')
  expect(storage).not.toContain('🔒')
  await page.goto('/auth/register')
  await expect(
    page.getByRole('heading', { name: 'Сохраните резервные коды' }),
  ).toHaveCount(0)
})
test('резервное восстановление: ограниченный reset, очистка полей, без автоматического входа', async ({
  page,
}) => {
  await enable(page, '/auth/recover')
  await page.getByRole('tab', { name: 'Резервный код', exact: true }).click()
  await page.getByLabel('Логин', { exact: true }).fill('demo_user')
  await page.getByLabel('Резервный код', { exact: true }).fill('DEMO-NOT-VALID')
  await page.getByRole('button', { name: 'Проверить код', exact: true }).click()
  await expect(page).toHaveURL('/auth/reset')
  await page.getByLabel('Пароль', { exact: true }).fill('учебный пароль 123')
  await page
    .getByLabel('Подтверждение пароля', { exact: true })
    .fill('учебный пароль 123')
  await page.getByRole('button', { name: 'Сохранить новый пароль' }).click()
  await expect(
    page.getByRole('heading', { name: 'Пароль изменён' }),
  ).toBeVisible()
  expect(
    await page.evaluate(
      () => JSON.parse(sessionStorage.getItem('converter.preview')).viewer,
    ),
  ).toBe(false)
  await page.reload()
  await expect(page).toHaveURL(/\/auth\/recover\?reason=expired/)
})
