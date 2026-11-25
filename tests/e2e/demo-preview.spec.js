import { test, expect } from '@playwright/test'

test('учебные ответы включаются явно; storage содержит только флаги и учебный job', async ({
  page,
}) => {
  await page.goto('/')
  expect(await page.evaluate(() => sessionStorage.length)).toBe(0)
  await page.getByRole('button', { name: 'Открыть учебный кабинет' }).click()
  await expect(page).toHaveURL('/account')
  await expect(
    page.getByText('Учебная версия. Данные вымышлены;', { exact: false }),
  ).toBeVisible()
  expect(
    await page.evaluate(() =>
      JSON.parse(sessionStorage.getItem('converter.preview')),
    ),
  ).toEqual({ enabled: true, viewer: true, job: null })
  await page.reload()
  await expect(
    page.getByText('Учебная версия. Данные вымышлены;', { exact: false }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Отключить учебные ответы' }).click()
  expect(await page.evaluate(() => sessionStorage.length)).toBe(0)
  await expect(page).toHaveURL('/')
})
