import { test, expect } from '@playwright/test'

test('компоненты: клавиатура, диалог, ошибка и возврат фокуса', async ({
  page,
}) => {
  await page.goto('/preview/components')
  const tab = page.getByRole('tab', { name: 'Изображения' })
  await tab.focus()
  await page.keyboard.press('ArrowRight')
  await expect(page.getByRole('tab', { name: 'Документы' })).toBeFocused()
  await expect(page.getByRole('tabpanel')).toHaveText('Документы')
  const toggle = page.getByRole('switch', {
    name: 'Сохранять новые результаты',
  })
  await toggle.focus()
  await page.keyboard.press('Space')
  await expect(toggle).toHaveAttribute('aria-checked', 'true')
  await page.getByLabel('Пароль', { exact: true }).fill('  учебный пароль 😀  ')
  await page.getByRole('button', { name: 'Показать пароль: Пароль' }).click()
  await expect(page.getByLabel('Пароль', { exact: true })).toHaveAttribute(
    'spellcheck',
    'false',
  )
  await expect(page.getByLabel('Пароль', { exact: true })).toHaveValue(
    '  учебный пароль 😀  ',
  )
  const trigger = page.getByRole('button', { name: 'Открыть диалог' })
  await trigger.click()
  const dialog = page.getByRole('dialog', { name: 'Удалить файл?' })
  await expect(dialog).toBeVisible()
  await expect(
    dialog.getByRole('button', { name: 'Отмена', exact: true }),
  ).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(dialog).not.toBeVisible()
  await expect(trigger).toBeFocused()
  await trigger.click()
  await dialog.getByLabel('Ошибка тестового ответа').check()
  await dialog.getByRole('button', { name: 'Удалить учебный файл' }).click()
  await expect(dialog.getByRole('alert')).toContainText('не удалось удалить')
  await expect(dialog).toBeVisible()
  await dialog.getByLabel('Ошибка тестового ответа').uncheck()
  await dialog.getByRole('button', { name: 'Удалить учебный файл' }).click()
  await expect(dialog).not.toBeVisible()
  await expect(trigger).toBeFocused()
  await expect(
    page.getByText('Учебный файл удалён.', { exact: true }),
  ).toBeVisible()
})

test('ошибка буфера обмена не изображает успех', async ({ page }) => {
  await page.goto('/preview/components')
  await page.evaluate(() =>
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: () => Promise.reject(new Error('denied')) },
      configurable: true,
    }),
  )
  await page.getByRole('button', { name: 'Копировать', exact: true }).click()
  await expect(
    page.getByRole('status').filter({ hasText: 'Не удалось скопировать.' }),
  ).toBeVisible()
  await expect(page.getByText('Скопировано.', { exact: true })).toHaveCount(0)
})
