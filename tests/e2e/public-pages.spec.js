import { readFile } from 'node:fs/promises'
import { test, expect } from '@playwright/test'

test('API: действительный OpenAPI, контракт и инертные примеры без отправки', async ({
  page,
}) => {
  const writes = []
  page.on('request', (request) => {
    if (request.method() !== 'GET') writes.push(request.url())
  })
  await page.goto('/api-docs')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'API конвертации файлов',
  )
  await expect(page.getByLabel('Node.js: создать задачу')).toContainText(
    'process.env.CONVERTER_API_KEY',
  )
  await expect(page.getByLabel('curl: создать задачу')).toContainText(
    'Idempotency-Key: $CONVERTER_IDEMPOTENCY_KEY',
  )
  const download = page.waitForEvent('download')
  await page.getByRole('link', { name: 'Скачать OpenAPI', exact: true }).click()
  const downloaded = await download
  expect(downloaded.suggestedFilename()).toBe('openapi.json')
  const actual = JSON.parse(await readFile(await downloaded.path(), 'utf8'))
  const source = JSON.parse(
    await readFile(new URL('../../api/openapi.json', import.meta.url), 'utf8'),
  )
  expect(actual).toEqual(source)
  expect(actual.openapi).toBe('3.1.1')
  expect(writes).toEqual([])
})

test('обработка данных и 404 дают понятный путь к конвертеру', async ({
  page,
}) => {
  await page.goto('/privacy')
  await expect(
    page.getByRole('heading', { name: 'О файлах и конфиденциальности' }),
  ).toBeVisible()
  await expect(
    page.getByText('Доступ закрывается сразу. Физическое удаление', {
      exact: false,
    }),
  ).toContainText('до 7 суток')
  await page.goto('/missing/path?value=%3Csvg%3E')
  await expect(
    page.getByRole('heading', { name: 'Страница не найдена' }),
  ).toBeVisible()
  await expect(page.locator('main svg')).toHaveCount(0)
  await page.getByRole('link', { name: 'К конвертеру', exact: true }).click()
  await expect(page).toHaveURL('/')
})
