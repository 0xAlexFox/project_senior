import { test, expect } from '@playwright/test'

const jpeg = {
  name: 'selected.jpg',
  mimeType: 'image/jpeg',
  buffer: Buffer.from('synthetic file'),
}

for (const key of ['Enter', 'Space']) {
  test(`форма конвертера: отправка с клавиатуры ${key}`, async ({ page }) => {
    const sent = []
    const navigations = []
    page.on('request', (request) => {
      if (request.method() !== 'GET') sent.push(request.url())
      if (request.isNavigationRequest()) navigations.push(request.url())
    })
    await page.goto('/')
    await page.getByLabel('Файл для конвертации').setInputFiles(jpeg)
    const form = page.getByRole('form', { name: 'Конвертер файлов' })
    const button = form.getByRole('button', { name: 'Войти и продолжить' })
    await expect(button).toHaveAttribute('type', 'submit')
    await button.focus()
    await button.press(key)
    await expect(page).toHaveURL('/auth/login')
    await expect(
      page.getByText('Выбранный файл «selected.jpg»', { exact: false }),
    ).toBeVisible()
    expect(sent).toEqual([])
    expect(navigations).toEqual(['http://127.0.0.1:5173/'])
  })
}

test('submit не обходит проверку отсутствующего или несовместимого файла', async ({
  page,
}) => {
  await page.goto('/')
  const form = page.getByRole('form', { name: 'Конвертер файлов' })
  const button = form.getByRole('button', { name: 'Войти и продолжить' })
  await expect(button).toBeDisabled()
  await form.evaluate((node) => node.requestSubmit())
  await expect(page).toHaveURL('/')
  await page.getByLabel('Файл для конвертации').setInputFiles(jpeg)
  await page.getByLabel('Направление конвертации').selectOption('png_to_jpg')
  await expect(button).toBeDisabled()
  await button.evaluate((node) => {
    node.disabled = false
  })
  await form.evaluate((node) => node.requestSubmit())
  await expect(page).toHaveURL('/')
  await expect(page.getByRole('alert')).toContainText('Замените файл')
})

test('вспомогательные кнопки формы не запускают отправку', async ({ page }) => {
  await page.goto('/')
  const form = page.getByRole('form', { name: 'Конвертер файлов' })
  const buttons = await form
    .locator('button')
    .evaluateAll((nodes) =>
      nodes.map((node) => ({ text: node.textContent.trim(), type: node.type })),
    )
  expect(buttons.filter((button) => button.type === 'submit')).toEqual([
    { text: 'Войти и продолжить', type: 'submit' },
  ])
  await page.getByLabel('Файл для конвертации').setInputFiles(jpeg)
  await form.getByRole('button', { name: 'Убрать', exact: true }).click()
  await expect(page).toHaveURL('/')
  await expect(
    form.getByRole('button', { name: 'Войти и продолжить' }),
  ).toBeDisabled()
  await form.getByRole('tab', { name: 'Документы', exact: true }).click()
  await expect(page).toHaveURL('/')
  await expect(
    page.getByText('DOCX · до 20 MiB', { exact: true }),
  ).toBeVisible()
})
