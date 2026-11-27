import { test, expect } from '@playwright/test'
const selector = (page) =>
  page.getByRole('combobox', { name: 'Тема оформления', exact: true })
const background = (page) =>
  page
    .locator('body')
    .evaluate((node) => getComputedStyle(node).backgroundColor)

test('системная тема меняется с ОС, ручная сохраняется после reload и перехода', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.goto('/')
  await expect(selector(page)).toHaveValue('system')
  expect(await page.evaluate(() => localStorage.length)).toBe(0)
  expect(await background(page)).toBe('rgb(10, 10, 10)')
  await page.emulateMedia({ colorScheme: 'light' })
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await selector(page).selectOption('dark')
  expect(await background(page)).toBe('rgb(10, 10, 10)')
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.emulateMedia({ colorScheme: 'light' })
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.getByRole('link', { name: 'Войти', exact: true }).click()
  await expect(selector(page)).toHaveValue('dark')
  await page.reload()
  await expect(selector(page)).toHaveValue('dark')
  expect(await background(page)).toBe('rgb(10, 10, 10)')
  await selector(page).selectOption('light')
  await page.reload()
  await expect(selector(page)).toHaveValue('light')
  expect(await background(page)).toBe('rgb(245, 246, 248)')
})

test('выбор применяется до Vue, повреждённое значение не интерпретируется как HTML', async ({
  browser,
}) => {
  for (const [stored, expected] of [
    ['light', 'light'],
    ['<img src=x onerror=alert(1)>', 'dark'],
  ]) {
    const context = await browser.newContext({ colorScheme: 'dark' })
    try {
      await context.addInitScript(
        (value) => localStorage.setItem('converter.theme', value),
        stored,
      )
      const page = await context.newPage()
      await page.route('**/src/app/main.js*', (route) => route.abort())
      await page.goto('http://127.0.0.1:5173/')
      await expect(page.locator('html')).toHaveAttribute('data-theme', expected)
      await expect(page.locator('#app')).toBeEmpty()
      expect(await page.locator('img').count()).toBe(0)
    } finally {
      await context.close()
    }
  }
})

test('отказ хранилища не мешает изменению темы и выбору системной', async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new DOMException('Blocked', 'SecurityError')
      },
    }),
  )
  await page.emulateMedia({ colorScheme: 'light' })
  await page.goto('/auth/login')
  await expect(selector(page)).toHaveValue('system')
  await selector(page).selectOption('dark')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(
    page.getByText('Тема изменена только в этой вкладке:', { exact: false }),
  ).toBeVisible()
  await selector(page).selectOption('system')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
})

test('вкладки синхронизируются, системный режим удаляет только свой ключ', async ({
  page,
  context,
}) => {
  await page.emulateMedia({ colorScheme: 'light' })
  await page.goto('/')
  await page.evaluate(() => localStorage.setItem('other.preference', 'keep'))
  const other = await context.newPage()
  try {
    await other.emulateMedia({ colorScheme: 'light' })
    await other.goto('/')
    await selector(other).selectOption('dark')
    await expect(selector(page)).toHaveValue('dark')
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    await selector(page).selectOption('system')
    await expect(selector(other)).toHaveValue('system')
    await expect(other.locator('html')).toHaveAttribute('data-theme', 'light')
    expect(
      await page.evaluate(() => ({
        theme: localStorage.getItem('converter.theme'),
        other: localStorage.getItem('other.preference'),
      })),
    ).toEqual({ theme: null, other: 'keep' })
  } finally {
    await other.close()
  }
})

test('Tab-фокус, 360 px/200% и тема после учебного выхода', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 900 })
  await page.goto('/')
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%'
  })
  await page.locator('.skip-link').focus()
  for (
    let i = 0;
    i < 8 &&
    !(await selector(page).evaluate((node) => node === document.activeElement));
    i++
  )
    await page.keyboard.press('Tab')
  await expect(selector(page)).toBeFocused()
  expect(
    await selector(page).evaluate(
      (node) => getComputedStyle(node).outlineStyle,
    ),
  ).not.toBe('none')
  await selector(page).selectOption('light')
  await expect(selector(page)).toHaveValue('light')
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true)
  await page.getByRole('button', { name: 'Открыть учебный кабинет' }).click()
  await expect(page).toHaveURL('/account')
  await expect(selector(page)).toHaveValue('light')
  await page.getByRole('button', { name: 'Отключить учебные ответы' }).click()
  await expect(selector(page)).toHaveValue('light')
})
