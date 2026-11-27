import { mkdir, writeFile } from 'node:fs/promises'
import { test, expect } from '@playwright/test'
const file = {
  name: 'учебный-файл.jpg',
  mimeType: 'image/jpeg',
  buffer: Buffer.from([1, 2, 3]),
}
for (const theme of ['dark', 'light']) {
  test(`состояния ${theme}: конвертер, auth, ключ, настройки, диалоги и ошибки`, async ({
    page,
  }) => {
    test.setTimeout(150000)
    if (process.env.FRONTEND_QA)
      await mkdir('.local/frontend-completion/final-visual', {
        recursive: true,
      })
    const rows = [],
      errors = []
    page.on('pageerror', (error) => errors.push(error.message))
    page.on('console', (message) => {
      if (['error', 'warning'].includes(message.type()))
        errors.push(message.text())
    })
    await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' })
    async function audit(label) {
      await page.evaluate(() => document.fonts.ready)
      for (const width of [360, 1440]) {
        await page.setViewportSize({ width, height: 1000 })
        for (const zoom of [100, 200]) {
          await page.evaluate((value) => {
            document.documentElement.style.fontSize = value + '%'
          }, zoom)
          const state = await page.evaluate(() => ({
            scroll: document.documentElement.scrollWidth,
            width: innerWidth,
            dialog: !!document.querySelector('dialog[open]'),
            focusInDialog: !!document
              .querySelector('dialog[open]')
              ?.contains(document.activeElement),
            motion: matchMedia('(prefers-reduced-motion: reduce)').matches,
          }))
          expect(
            state.scroll,
            `${label} ${theme} ${width} ${zoom}%`,
          ).toBeLessThanOrEqual(width)
          expect(state.motion).toBe(true)
          if (
            process.env.FRONTEND_QA &&
            width === 360 &&
            zoom === 200 &&
            ['key-reauth', 'unsaved-dialog', 'recovery-challenge'].includes(
              label,
            )
          ) {
            await page.evaluate(() => window.scrollTo(0, 0))
            await page.screenshot({
              path: `.local/frontend-completion/final-visual/text200-${label}-${theme}-360.png`,
              fullPage: true,
              animations: 'disabled',
            })
          }
          if (state.dialog)
            expect(state.focusInDialog, `${label}: focus`).toBe(true)
          rows.push({ theme, label, width, textPercent: zoom, ...state })
        }
        await page.evaluate(() => {
          document.documentElement.style.fontSize = ''
        })
        if (process.env.FRONTEND_QA) {
          await mkdir('.local/frontend-completion/final-visual', {
            recursive: true,
          })
          await page.evaluate(() => window.scrollTo(0, 0))
          await page.screenshot({
            path: `.local/frontend-completion/final-visual/state-${label}-${theme}-${width}.png`,
            fullPage: true,
            animations: 'disabled',
          })
        }
      }
      await page.setViewportSize({ width: 360, height: 1000 })
    }
    async function controls() {
      const details = page.locator('.preview-controls')
      if (!(await details.getAttribute('open'))) {
        if (!(await details.evaluate((el) => el.open)))
          await details.locator('summary').click()
      }
    }
    async function fault(value) {
      await controls()
      await page.getByLabel('Следующий учебный ответ').selectOption(value)
    }
    async function enter() {
      await page.goto('/')
      await page
        .getByRole('button', { name: 'Открыть учебный кабинет' })
        .click()
      await expect(page).toHaveURL('/account')
    }
    async function start() {
      await page.getByLabel('Файл для конвертации').setInputFiles(file)
      await page
        .getByRole('button', { name: 'Конвертировать', exact: true })
        .click()
      await expect(
        page.getByRole('heading', { name: 'В очереди', exact: true }),
      ).toBeVisible()
    }
    async function state(value, title) {
      await controls()
      await page.getByLabel('Состояние учебной задачи').selectOption(value)
      await page
        .getByRole('button', { name: 'Применить состояние задачи' })
        .click()
      await page
        .getByRole('button', { name: 'Обновить статус', exact: true })
        .click()
      await expect(
        page.getByRole('heading', { name: title, exact: true }),
      ).toBeVisible()
    }
    async function confirm(label) {
      const dialog = page.getByRole('dialog')
      await dialog
        .getByLabel('Текущий пароль', { exact: true })
        .fill('учебный пароль 123')
      await dialog.getByRole('button', { name: label, exact: true }).click()
      await expect(dialog).not.toBeVisible()
    }
    await enter()
    await page.getByRole('link', { name: 'Конвертер — главная' }).click()
    await page.getByLabel('Файл для конвертации').setInputFiles(file)
    await controls()
    await page.getByLabel('Задержка учебного ответа').selectOption('5000')
    await page
      .getByRole('button', { name: 'Конвертировать', exact: true })
      .click()
    await expect(
      page.getByRole('button', { name: 'Прервать передачу' }),
    ).toBeVisible()
    await audit('upload-waiting')
    await page.getByRole('button', { name: 'Прервать передачу' }).click()
    await expect(
      page.getByRole('heading', { name: 'Принятие задачи не подтверждено' }),
    ).toBeVisible()
    await audit('upload-interrupted')
    await page.getByLabel('Задержка учебного ответа').selectOption('150')
    await page.getByRole('button', { name: 'Вернуться к выбору файла' }).click()
    await start()
    await audit('job-queued')
    await state('running', 'Обработка')
    await audit('job-running')
    await controls()
    await page.getByLabel('Связь с учебным сервисом').uncheck()
    await page
      .getByRole('button', { name: 'Обновить статус', exact: true })
      .click()
    await expect(page.getByRole('alert')).toContainText('Нет связи')
    await audit('job-offline')
    await page.getByLabel('Связь с учебным сервисом').check()
    await page
      .getByRole('button', { name: 'Обновить статус', exact: true })
      .click()
    await page
      .getByRole('button', { name: 'Отменить задачу', exact: true })
      .click()
    await expect(
      page.getByRole('heading', { name: 'Задача отменена', exact: true }),
    ).toBeVisible()
    await audit('job-cancelled')
    await page
      .getByRole('button', { name: 'Конвертировать другой файл' })
      .click()
    await start()
    await state('running', 'Обработка')
    await state('failed', 'Не удалось конвертировать')
    await audit('job-failed')
    await page
      .getByRole('button', { name: 'Конвертировать другой файл' })
      .click()
    await start()
    await state('running', 'Обработка')
    await state('succeeded', 'Готово')
    await audit('job-succeeded')
    await state('expired', 'Готово')
    await expect(
      page.getByRole('button', { name: 'Скачать учебный образец' }),
    ).toBeDisabled()
    await audit('job-expired')
    await page
      .getByRole('button', { name: 'Конвертировать другой файл' })
      .click()
    await page.getByLabel('Файл для конвертации').setInputFiles(file)
    await fault('RESPONSE_LOST')
    await page
      .getByRole('button', { name: 'Конвертировать', exact: true })
      .click()
    await expect(
      page.getByRole('heading', { name: 'Принятие задачи не подтверждено' }),
    ).toBeVisible()
    await audit('job-response-lost')
    await page
      .getByRole('button', { name: 'Проверить принятую задачу' })
      .click()
    await expect(
      page.getByRole('heading', { name: 'В очереди', exact: true }),
    ).toBeVisible()
    await page
      .getByRole('button', { name: 'Отменить задачу', exact: true })
      .click()
    await page
      .getByRole('button', { name: 'Конвертировать другой файл' })
      .click()
    await page.getByLabel('Файл для конвертации').setInputFiles(file)
    await fault('STORAGE_QUOTA_EXCEEDED')
    await page
      .getByRole('button', { name: 'Конвертировать', exact: true })
      .click()
    await expect(
      page.getByRole('button', { name: 'Новая задача без сохранения' }),
    ).toBeVisible()
    await audit('job-quota')
    await page.getByRole('button', { name: 'Вернуться к выбору файла' }).click()
    await page
      .getByRole('link', { name: 'Учебный кабинет', exact: true })
      .click()
    await page.goto('/account/files')
    await expect(page.locator('.skeleton')).toHaveCount(0, { timeout: 10000 })
    await controls()
    await page.getByLabel('Задержка учебного ответа').selectOption('5000')
    await page.getByLabel('Формат', { exact: true }).selectOption('pdf')
    await expect(page.locator('.skeleton')).toBeVisible()
    await audit('files-loading')
    await expect(page.locator('.skeleton')).toHaveCount(0, { timeout: 10000 })
    await page.getByLabel('Задержка учебного ответа').selectOption('150')
    await fault('NETWORK_ERROR')
    await page.getByLabel('Формат', { exact: true }).selectOption('png')
    await expect(page.getByRole('alert')).toContainText('Нет связи')
    await audit('files-error')
    await page
      .getByRole('button', { name: 'Повторить загрузку файлов' })
      .click()
    await expect(page.locator('.skeleton')).toHaveCount(0, { timeout: 10000 })
    await page
      .getByRole('button', { name: 'Учебный пустой каталог', exact: true })
      .click()
    await page.getByLabel('Формат', { exact: true }).selectOption('')
    await expect(
      page.getByRole('heading', { name: 'Сохранённых файлов пока нет' }),
    ).toBeVisible()
    await audit('files-empty')
    await page
      .getByRole('button', { name: 'Восстановить учебный каталог' })
      .click()
    await page.getByLabel('Сортировка', { exact: true }).selectOption('oldest')
    await expect(
      page.getByRole('button', { name: /^Удалить / }).first(),
    ).toBeVisible()
    await page
      .getByLabel('Поиск по имени', { exact: true })
      .fill('ничего-подобного-нет')
    await expect(
      page.getByRole('heading', { name: 'Ничего не найдено' }),
    ).toBeVisible()
    await audit('files-empty-search')
    await page.getByLabel('Поиск по имени', { exact: true }).fill('')
    await expect(
      page.getByRole('button', { name: /^Удалить / }).first(),
    ).toBeVisible()
    await page
      .getByRole('button', { name: /^Удалить / })
      .first()
      .click()
    await audit('file-delete-dialog')
    await page.keyboard.press('Escape')
    await page.goto('/account/api-key')
    await expect(
      page.getByRole('button', { name: 'Выпустить ключ', exact: true }),
    ).toBeVisible()
    await page
      .getByRole('button', { name: 'Выпустить ключ', exact: true })
      .click()
    await audit('key-reauth')
    await confirm('Выпустить ключ')
    await expect(page.getByLabel('Полный учебный API-ключ')).toBeVisible()
    await audit('key-once')
    await page.getByRole('button', { name: 'Я сохранил ключ — скрыть' }).click()
    await audit('key-masked')
    await page
      .getByRole('button', { name: 'Отозвать ключ', exact: true })
      .click()
    await audit('key-revoke-dialog')
    await page.keyboard.press('Escape')
    await page.goto('/account/settings')
    await expect(page.getByLabel('Имя', { exact: true })).toHaveValue(
      'Учебный пользователь',
    )
    await page
      .getByRole('button', { name: 'Подключить Telegram', exact: true })
      .click()
    await confirm('Начать подключение')
    await audit('telegram-pending')
    await controls()
    await page
      .getByRole('button', { name: 'Подтвердить со стороны учебного бота' })
      .click()
    await page.getByRole('button', { name: 'Подтвердить здесь' }).click()
    await expect(page.getByText('Подключён', { exact: true })).toBeVisible()
    await audit('telegram-connected')
    await page.getByRole('button', { name: 'Выпустить новый набор' }).click()
    await confirm('Выпустить набор')
    await audit('settings-codes')
    await page.getByLabel('Я сохранил резервные коды').check()
    await page.getByRole('button', { name: 'Продолжить', exact: true }).click()
    await expect(page.getByLabel('Учебные резервные коды')).toHaveCount(0)
    await page
      .getByRole('button', { name: 'Удалить аккаунт', exact: true })
      .click()
    await audit('account-delete-dialog')
    await page.keyboard.press('Escape')
    await page.getByLabel('Имя', { exact: true }).fill('Несохранённое имя')
    await page.getByRole('link', { name: 'Конвертер — главная' }).click()
    await audit('unsaved-dialog')
    await page.keyboard.press('Escape')
    await page.getByRole('button', { name: 'Отменить изменения' }).click()
    await page
      .getByRole('button', { name: 'Отключить учебные ответы', exact: true })
      .click()
    await expect(page).toHaveURL('/')
    await page.goto('/auth/register')
    await page
      .getByRole('button', { name: 'Включить учебные ответы для форм' })
      .click()
    async function register() {
      await page.getByLabel('Имя', { exact: true }).fill('Учебное имя')
      await page.getByLabel('Логин', { exact: true }).fill('demo_user')
      await page
        .getByLabel('Пароль', { exact: true })
        .fill('учебный пароль 123')
      await page
        .getByLabel('Подтверждение пароля', { exact: true })
        .fill('учебный пароль 123')
      await page
        .getByRole('button', { name: 'Создать аккаунт', exact: true })
        .click()
    }
    await fault('LOGIN_TAKEN')
    await register()
    await expect(page.getByRole('alert')).toContainText('логин уже занят')
    await audit('register-error')
    await register()
    await expect(
      page.getByRole('heading', { name: 'Сохраните резервные коды' }),
    ).toBeVisible()
    await audit('register-codes')
    await page.getByLabel('Я сохранил резервные коды').check()
    await page.getByRole('button', { name: 'Продолжить', exact: true }).click()
    await expect(page).toHaveURL('/account')
    await page
      .getByRole('button', { name: 'Отключить учебные ответы', exact: true })
      .click()
    await page.goto('/auth/recover')
    await page
      .getByRole('button', { name: 'Включить учебные ответы для форм' })
      .click()
    await page.getByLabel('Логин', { exact: true }).fill('demo_user')
    await page
      .getByRole('button', { name: 'Получить код', exact: true })
      .click()
    await expect(page.getByLabel('Код Telegram', { exact: true })).toBeVisible()
    await audit('recovery-challenge')
    await fault('INVALID_RECOVERY_CODE')
    await page.getByLabel('Код Telegram', { exact: true }).fill('00000000')
    await page
      .getByRole('button', { name: 'Проверить код', exact: true })
      .click()
    await expect(page.getByRole('alert')).toContainText('Неверный код')
    await audit('recovery-invalid')
    await page.getByRole('tab', { name: 'Резервный код', exact: true }).click()
    await page
      .getByRole('textbox', { name: 'Резервный код', exact: true })
      .fill('DEMO-NOT-VALID')
    await page
      .getByRole('button', { name: 'Проверить код', exact: true })
      .click()
    await expect(page).toHaveURL('/auth/reset')
    await audit('reset-password')
    await page.getByLabel('Пароль', { exact: true }).fill('учебный пароль 123')
    await page
      .getByLabel('Подтверждение пароля', { exact: true })
      .fill('учебный пароль 123')
    await page.getByRole('button', { name: 'Сохранить новый пароль' }).click()
    await expect(
      page.getByRole('heading', { name: 'Пароль изменён' }),
    ).toBeVisible()
    await audit('reset-done')
    await enter()
    await expect(
      page.getByRole('switch', {
        name: 'Сохранять новые результаты в профиле',
        exact: true,
      }),
    ).toBeVisible()
    await fault('SESSION_EXPIRED')
    await page
      .getByRole('switch', {
        name: 'Сохранять новые результаты в профиле',
        exact: true,
      })
      .click()
    await expect(page).toHaveURL(/\/auth\/login/)
    await expect(
      page.getByText('Учебная сессия истекла.', { exact: false }),
    ).toBeVisible()
    await audit('session-expired')
    expect(errors).toEqual([])
    if (process.env.FRONTEND_QA)
      await writeFile(
        `.local/frontend-completion/final-visual/states-${theme}.json`,
        JSON.stringify(rows, null, 2),
      )
  })
}
