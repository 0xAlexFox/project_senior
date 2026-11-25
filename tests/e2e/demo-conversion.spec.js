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
  const card = page.getByRole('region', { name: 'Задача конвертации' })
  await expect(card.getByRole('heading', { name: 'В очереди' })).toBeVisible()
  await expect(form).toHaveCount(0)
  expect(
    await page.evaluate(() => sessionStorage.getItem('converter.preview')),
  ).not.toContain('личное-имя')
  expect(writes).toEqual([])
})

test('учебная задача: очередь, обработка, скачивание и истечение без смены succeeded', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Открыть учебный кабинет' }).click()
  await page.getByRole('link', { name: 'Конвертер — главная' }).click()
  await page.getByLabel('Файл для конвертации').setInputFiles({
    name: 'sample.jpg',
    mimeType: 'image/jpeg',
    buffer: Buffer.from([1]),
  })
  await page
    .getByRole('button', { name: 'Конвертировать', exact: true })
    .click()
  const card = page.getByRole('region', { name: 'Задача конвертации' })
  await expect(card.getByRole('heading', { name: 'В очереди' })).toBeVisible()
  await page.getByText('Учебные ответы и состояния', { exact: true }).click()
  for (const status of ['running', 'succeeded']) {
    await page.getByLabel('Состояние учебной задачи').selectOption(status)
    await page
      .getByRole('button', { name: 'Применить состояние задачи' })
      .click()
    await card.getByRole('button', { name: 'Обновить статус' }).click()
    await expect(
      card.getByRole('heading', {
        name: status === 'running' ? 'Обработка' : 'Готово',
      }),
    ).toBeVisible()
  }
  const download = page.waitForEvent('download')
  await card.getByRole('button', { name: 'Скачать учебный образец' }).click()
  expect((await download).suggestedFilename()).toContain('учебный-пример.png')
  await page.getByLabel('Состояние учебной задачи').selectOption('expired')
  await page.getByRole('button', { name: 'Применить состояние задачи' }).click()
  await expect(
    card.getByRole('button', { name: 'Обновить статус' }),
  ).toBeEnabled()
  await card.getByRole('button', { name: 'Обновить статус' }).click()
  await expect(
    card.getByRole('button', { name: 'Скачать учебный образец' }),
  ).toBeDisabled()
  await expect(card.getByRole('heading', { name: 'Готово' })).toBeVisible()
  await page.reload()
  await expect(
    card.getByText('Исходный файл недоступен после перезагрузки'),
  ).toBeVisible()
  await expect(
    card.getByRole('button', { name: 'Скачать учебный образец' }),
  ).toBeDisabled()
})
