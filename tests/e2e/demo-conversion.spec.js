import { test, expect } from '@playwright/test'

test('учебный запуск использует File только в памяти, блокирует повтор и изменение направления', async ({
  page,
}) => {
  const writes = []
  page.on('request', (request) => {
    if (request.method() !== 'GET') writes.push(request.url())
  })
  await page.goto('/')
  await page.getByLabel('Файл для конвертации').setInputFiles({
    name: 'личное-имя.jpg',
    mimeType: 'application/octet-stream',
    buffer: Buffer.from([1, 2, 3]),
  })
  await page.getByRole('button', { name: 'Открыть учебный кабинет' }).click()
  await page.getByRole('link', { name: 'Конвертер — главная' }).click()
  const form = page.getByRole('form', { name: 'Конвертер файлов' })
  await expect(form.getByText('личное-имя.jpg', { exact: true })).toBeVisible()
  const submit = form.getByRole('button', {
    name: 'Конвертировать',
    exact: true,
  })
  await expect(submit).toBeEnabled()
  await submit.dblclick()
  await expect(
    form.getByText('Учебный ответ: задача принята, в очереди.', {
      exact: false,
    }),
  ).toBeVisible()
  await expect(submit).toBeDisabled()
  await expect(form.getByRole('tab', { name: 'Документы' })).toBeDisabled()
  expect(
    await page.evaluate(() => sessionStorage.getItem('converter.preview')),
  ).not.toContain('личное-имя')
  expect(writes).toEqual([])
})
