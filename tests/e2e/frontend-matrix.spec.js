import { mkdir, writeFile } from 'node:fs/promises'
import { test, expect } from '@playwright/test'
const publicRoutes = [
  '/',
  '/auth/login',
  '/auth/register',
  '/auth/recover',
  '/api-docs',
  '/privacy',
  '/missing',
]
const accountRoutes = [
  '/account',
  '/account/files',
  '/account/api-key',
  '/account/settings',
]
for (const theme of ['dark', 'light']) {
  test(`все страницы: ${theme}, 360/390/768/1440, текст 200%, клавиатура и reduced-motion`, async ({
    page,
  }) => {
    test.setTimeout(150000)
    if (process.env.FRONTEND_QA)
      await mkdir('.local/frontend-completion/final-visual', {
        recursive: true,
      })
    const errors = [],
      rows = []
    page.on('pageerror', (error) => errors.push(error.message))
    page.on('console', (message) => {
      if (['error', 'warning'].includes(message.type()))
        errors.push(message.text())
    })
    await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' })
    for (const width of [360, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 1000 })
      for (const mode of ['public', 'account']) {
        if (mode === 'account') {
          await page.goto('/')
          await page
            .getByRole('button', { name: 'Открыть учебный кабинет' })
            .click()
          await expect(page).toHaveURL('/account')
        }
        for (const route of mode === 'public' ? publicRoutes : accountRoutes) {
          await page.goto(route)
          await page.evaluate(() => document.fonts.ready)
          await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
          await expect(page.locator('.skeleton')).toHaveCount(0)
          for (const zoom of [100, 200]) {
            await page.evaluate((size) => {
              document.documentElement.style.fontSize = size + '%'
            }, zoom)
            const layout = await page.evaluate(() => ({
              width: innerWidth,
              scroll: document.documentElement.scrollWidth,
              overlays: document.querySelectorAll('vite-error-overlay').length,
              animations: document
                .getAnimations()
                .filter((animation) => animation.playState === 'running')
                .length,
            }))
            expect(
              layout.scroll,
              `${theme} ${width} ${route} ${zoom}%`,
            ).toBeLessThanOrEqual(layout.width)
            expect(layout.overlays).toBe(0)
            expect(layout.animations).toBe(0)
            if (
              process.env.FRONTEND_QA &&
              zoom === 200 &&
              width === 360 &&
              ['/auth/recover', '/account/files', '/api-docs'].includes(route)
            ) {
              await page.evaluate(() => window.scrollTo(0, 0))
              await page.screenshot({
                path: `.local/frontend-completion/final-visual/text200-${route.replaceAll('/', '_')}-${theme}-360.png`,
                fullPage: true,
                animations: 'disabled',
              })
            }
            rows.push({ theme, width, route, textPercent: zoom, ...layout })
          }
          await page.evaluate(() => {
            document.documentElement.style.fontSize = ''
            document.querySelector('main h1')?.focus()
          })
          await page.keyboard.press('Tab')
          expect(
            await page.evaluate(() => document.activeElement !== document.body),
          ).toBe(true)
          if (process.env.FRONTEND_QA && [390, 1440].includes(width)) {
            await mkdir('.local/frontend-completion/final-visual', {
              recursive: true,
            })
            await page.evaluate(() => window.scrollTo(0, 0))
            await page.screenshot({
              path: `.local/frontend-completion/final-visual/page-${route.replaceAll('/', '_')}-${theme}-${width}.png`,
              fullPage: true,
              animations: 'disabled',
            })
          }
        }
        if (mode === 'account') {
          await page
            .getByRole('button', {
              name: 'Отключить учебные ответы',
              exact: true,
            })
            .click()
          await expect(page).toHaveURL('/')
        }
      }
    }
    expect(errors).toEqual([])
    if (process.env.FRONTEND_QA)
      await writeFile(
        `.local/frontend-completion/final-visual/matrix-${theme}.json`,
        JSON.stringify(rows, null, 2),
      )
  })
}
