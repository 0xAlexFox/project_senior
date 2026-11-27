import { test, expect } from '@playwright/test'
const selector = (page) =>
  page.getByRole('switch', { name: 'Тёмная тема', exact: true })
async function choose(page, value) {
  if (value === 'system') {
    if ((await page.locator('.theme-options').getAttribute('open')) === null)
      await page.locator('.theme-options > summary').click()
    await page
      .getByRole('button', { name: 'Следовать системе', exact: true })
      .click()
  } else if (
    (await selector(page).getAttribute('aria-checked')) !==
    String(value === 'dark')
  ) {
    await selector(page).click()
  }
}
const background = (page) =>
  page
    .locator('body')
    .evaluate((node) => getComputedStyle(node).backgroundColor)

test('системная тема меняется с ОС, ручная сохраняется после reload и перехода', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.goto('/')
  await expect(page.locator('html')).toHaveAttribute(
    'data-theme-preference',
    'system',
  )
  expect(await page.evaluate(() => localStorage.length)).toBe(0)
  expect(await background(page)).toBe('rgb(10, 10, 10)')
  await page.emulateMedia({ colorScheme: 'light' })
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await choose(page, 'dark')
  expect(await background(page)).toBe('rgb(10, 10, 10)')
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.emulateMedia({ colorScheme: 'light' })
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.getByRole('link', { name: 'Войти', exact: true }).click()
  await expect(page.locator('html')).toHaveAttribute(
    'data-theme-preference',
    'dark',
  )
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute(
    'data-theme-preference',
    'dark',
  )
  expect(await background(page)).toBe('rgb(10, 10, 10)')
  await choose(page, 'light')
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute(
    'data-theme-preference',
    'light',
  )
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
  await expect(page.locator('html')).toHaveAttribute(
    'data-theme-preference',
    'system',
  )
  await choose(page, 'dark')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(
    page.getByText('Тема изменена только в этой вкладке:', { exact: false }),
  ).toBeVisible()
  await choose(page, 'system')
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
    await choose(other, 'dark')
    await expect(page.locator('html')).toHaveAttribute(
      'data-theme-preference',
      'dark',
    )
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    await choose(page, 'system')
    await expect(other.locator('html')).toHaveAttribute(
      'data-theme-preference',
      'system',
    )
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
  await choose(page, 'light')
  await expect(page.locator('html')).toHaveAttribute(
    'data-theme-preference',
    'light',
  )
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true)
  await page.getByRole('button', { name: 'Открыть учебный кабинет' }).click()
  await expect(page).toHaveURL('/account')
  await expect(page.locator('html')).toHaveAttribute(
    'data-theme-preference',
    'light',
  )
  await page.getByRole('button', { name: 'Отключить учебные ответы' }).click()
  await expect(page.locator('html')).toHaveAttribute(
    'data-theme-preference',
    'light',
  )
})

test('переключатель в шапке слева от действий, без пересечений на основных ширинах', async ({
  page,
}) => {
  for (const width of [320, 360, 390, 430, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    for (const route of ['/', '/auth/login']) {
      await page.goto(route)
      const header = page.locator('.site-header')
      const control = await selector(page).boundingBox()
      const action = await header
        .locator(
          route === '/'
            ? width < 768
              ? '.mobile-menu-button'
              : '.desktop-login'
            : '.header-action',
        )
        .boundingBox()
      const box = await header.boundingBox()
      expect(control.x + control.width).toBeLessThanOrEqual(action.x)
      expect(
        Math.abs(
          control.y + control.height / 2 - (action.y + action.height / 2),
        ),
      ).toBeLessThan(2)
      expect(control.y).toBeGreaterThanOrEqual(box.y)
      expect(control.y + control.height).toBeLessThanOrEqual(box.y + box.height)
      await header.locator('.theme-options summary').click()
      const popup = await page.locator('.theme-popover').boundingBox()
      expect(popup.x).toBeGreaterThanOrEqual(0)
      expect(popup.x + popup.width).toBeLessThanOrEqual(width)
      await page.keyboard.press('Escape')
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true)
    }
  }
})

test('Space/Enter меняют тему; меню ОС закрывается Escape, вне меню и по переходу', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' })
  await page.goto('/')
  await selector(page).focus()
  await page.keyboard.press('Space')
  await expect(selector(page)).toBeChecked()
  await page.keyboard.press('Enter')
  await expect(selector(page)).not.toBeChecked()
  expect(
    await page
      .locator('.theme-thumb')
      .evaluate((n) => getComputedStyle(n).transitionDuration),
  ).toBe('0s')
  const summary = page.locator('.theme-options > summary')
  await summary.focus()
  await page.keyboard.press('Enter')
  await expect(
    page.getByRole('button', { name: 'Следовать системе' }),
  ).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(summary).toBeFocused()
  await expect(page.locator('.theme-options')).not.toHaveAttribute('open')
  await summary.click()
  await page.getByRole('heading', { level: 1 }).click()
  await expect(page.locator('.theme-options')).not.toHaveAttribute('open')
  await summary.click()
  await page.getByRole('link', { name: 'Войти', exact: true }).click()
  await expect(page.locator('.theme-options')).not.toHaveAttribute('open')
  await choose(page, 'system')
  await expect(page.locator('html')).toHaveAttribute(
    'data-theme-preference',
    'system',
  )
  await expect(summary).toBeFocused()
})
