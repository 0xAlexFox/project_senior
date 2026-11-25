import { test, expect } from '@playwright/test'
async function login(page) {
  await page.getByLabel('Логин', { exact: true }).fill('demo_user')
  await page.getByLabel('Пароль', { exact: true }).fill('учебный пароль 123')
  await page.getByRole('button', { name: 'Войти', exact: true }).click()
}
test('guard и allowlist возврата; учебная сессия истекает с очисткой и повторным входом', async ({
  page,
}) => {
  await page.goto('/account/files')
  await expect(page).toHaveURL(/\/auth\/login\?next=/)
  await page
    .getByRole('button', { name: 'Включить учебные ответы для форм' })
    .click()
  await login(page)
  await expect(page).toHaveURL('/account/files')
  await page.getByText('Учебные ответы и состояния', { exact: true }).click()
  await page
    .getByLabel('Следующий учебный ответ')
    .selectOption('SESSION_EXPIRED')
  await page.getByLabel('Формат', { exact: true }).selectOption('pdf')
  await expect(page).toHaveURL(/\/auth\/login\?next=/)
  await expect(
    page.getByText('Учебная сессия истекла.', { exact: false }),
  ).toBeVisible()
  await expect(page.getByLabel('Пароль', { exact: true })).toHaveValue('')
  await login(page)
  await expect(page).toHaveURL('/account/files')
})
test('внешний next не принимается; Retry-After блокирует повтор входа', async ({
  page,
}) => {
  await page.goto('/auth/login?next=https%3A%2F%2Fexample.invalid')
  await page
    .getByRole('button', { name: 'Включить учебные ответы для форм' })
    .click()
  await page.getByText('Учебные ответы и состояния', { exact: true }).click()
  await page.getByLabel('Следующий учебный ответ').selectOption('RATE_LIMITED')
  await login(page)
  const button = page.getByRole('button', { name: 'Войти', exact: true })
  await expect(button).toBeDisabled()
  await expect(button).toBeEnabled({ timeout: 5000 })
  await login(page)
  await expect(page).toHaveURL('/account')
})
test('reload незагруженного файла предлагает повторный выбор; поздний вход после ухода отменяется', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByLabel('Файл для конвертации').setInputFiles({
    name: 'draft.jpg',
    mimeType: 'image/jpeg',
    buffer: Buffer.from([1]),
  })
  await page.reload()
  await expect(
    page.getByText('После перезагрузки исходный файл нужно выбрать заново.'),
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Войти и продолжить' }),
  ).toBeDisabled()
  await page.getByRole('link', { name: 'Войти', exact: true }).click()
  await page
    .getByRole('button', { name: 'Включить учебные ответы для форм' })
    .click()
  await page.getByText('Учебные ответы и состояния', { exact: true }).click()
  await page.getByLabel('Задержка учебного ответа').selectOption('2000')
  await login(page)
  await page.getByRole('link', { name: 'К конвертеру', exact: true }).click()
  await expect(
    page.getByRole('link', { name: 'Войти', exact: true }),
  ).toBeVisible()
  await page.waitForTimeout(2200)
  expect(
    await page.evaluate(
      () => JSON.parse(sessionStorage.getItem('converter.preview')).viewer,
    ),
  ).toBe(false)
})

test('сброшенная завершённая задача не подменяет новый File после SPA-перехода', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Открыть учебный кабинет' }).click()
  await page.getByRole('link', { name: 'Конвертер — главная' }).click()
  await page.getByLabel('Файл для конвертации').setInputFiles({
    name: 'old.jpg',
    mimeType: 'image/jpeg',
    buffer: Buffer.from([1]),
  })
  await page
    .getByRole('button', { name: 'Конвертировать', exact: true })
    .click()
  await page
    .getByRole('button', { name: 'Отменить задачу', exact: true })
    .click()
  await page
    .getByRole('button', { name: 'Конвертировать другой файл', exact: true })
    .click()
  await page.getByLabel('Файл для конвертации').setInputFiles({
    name: 'new.jpg',
    mimeType: 'image/jpeg',
    buffer: Buffer.from([2]),
  })
  await page.getByRole('link', { name: 'Учебный кабинет', exact: true }).click()
  await page.getByRole('link', { name: 'Конвертер — главная' }).click()
  await expect(
    page.getByRole('form', { name: 'Конвертер файлов' }),
  ).toContainText('new.jpg')
  await expect(
    page.getByRole('region', { name: 'Задача конвертации' }),
  ).toHaveCount(0)
})
