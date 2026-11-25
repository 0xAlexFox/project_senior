import { test, expect } from '@playwright/test'
async function enter(page) {
  await page.goto('/')
  await page.getByRole('button', { name: 'Открыть учебный кабинет' }).click()
  await page.goto('/account/files')
  await expect(
    page.getByRole('button', { name: 'Вперёд', exact: true }),
  ).toBeEnabled()
}
test('поиск локален, фильтры в URL; скачивание и отказ удаления сохраняют строку', async ({
  page,
}) => {
  await enter(page)
  await page.getByLabel('Поиск по имени', { exact: true }).fill('каталог')
  await expect(page.getByRole('row')).toHaveCount(6)
  expect(page.url()).not.toContain('каталог')
  await page.getByLabel('Формат', { exact: true }).selectOption('jpg')
  await expect(page).toHaveURL(/format=jpg/)
  const row = page.getByRole('row').nth(1)
  const name = await row.getByRole('rowheader').textContent()
  const download = page.waitForEvent('download')
  await row
    .getByRole('button', { name: 'Скачать ' + name, exact: true })
    .click()
  expect((await download).suggestedFilename()).toContain('учебный-')
  await row
    .getByRole('button', { name: 'Удалить ' + name, exact: true })
    .click()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Отмена', exact: true })
    .click()
  await expect(
    row.getByRole('button', { name: 'Удалить ' + name, exact: true }),
  ).toBeFocused()
})
test('удаление последнего файла на странице: подтверждение, ошибка/повтор, предыдущая страница', async ({
  page,
}) => {
  await enter(page)
  await page.getByRole('button', { name: 'Вперёд', exact: true }).click()
  await expect(page).toHaveURL(/page=2/)
  await expect(page.getByRole('row')).toHaveCount(2)
  await page.getByText('Учебные ответы и состояния', { exact: true }).click()
  await page.getByLabel('Следующий учебный ответ').selectOption('NETWORK_ERROR')
  await page.getByRole('button', { name: /^Удалить / }).click()
  const dialog = page.getByRole('dialog')
  await dialog
    .getByRole('button', { name: 'Удалить файл', exact: true })
    .click()
  await expect(dialog.getByRole('alert')).toContainText('Нет связи')
  await expect(page.getByRole('row')).toHaveCount(2)
  await dialog
    .getByRole('button', { name: 'Удалить файл', exact: true })
    .click()
  await expect(dialog).not.toBeVisible()
  await expect(page).not.toHaveURL(/page=2/)
  await expect(page.getByRole('row')).toHaveCount(21)
  await expect(
    page.getByRole('heading', { name: 'Мои файлы', exact: true }),
  ).toBeFocused()
  await expect(
    page.getByRole('status').filter({ hasText: 'Учебный файл удалён' }),
  ).toBeVisible()
})
