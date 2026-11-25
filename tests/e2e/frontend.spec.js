import { test, expect } from '@playwright/test'

const jpeg = (name = 'example.jpg', size = 10) => ({
  name,
  mimeType: 'image/jpeg',
  buffer: Buffer.alloc(size, 1),
})
const fileInput = (page) => page.getByLabel('Файл для конвертации')

test('главная: содержимое, отсутствие ошибок и переход на форму входа', async ({
  page,
}) => {
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/')
  await expect(page).toHaveTitle('Конвертер файлов')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Конвертируйте файлы. Продолжайте работу.',
  )
  await expect(
    page.getByRole('button', { name: 'Войти и продолжить' }),
  ).toBeDisabled()
  await page.getByRole('link', { name: 'Войти', exact: true }).click()
  await expect(page).toHaveURL('/auth/login')
  await expect(
    page.getByRole('heading', { name: 'Войти', exact: true }),
  ).toBeVisible()
  expect(errors).toEqual([])
})

test('выбор файла сохраняется между страницами, но сбрасывается после reload', async ({
  page,
}) => {
  const requests = []
  page.on('request', (request) => {
    if (request.method() !== 'GET') requests.push(request.url())
  })
  await page.goto('/')
  await fileInput(page).setInputFiles(jpeg('мой-файл.jpg'))
  await page.getByRole('button', { name: 'Войти и продолжить' }).click()
  await expect(
    page.getByText('Выбранный файл «мой-файл.jpg»', { exact: false }),
  ).toBeVisible()
  await page.getByRole('link', { name: 'К конвертеру', exact: true }).click()
  await expect(page.getByText('мой-файл.jpg', { exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByText('мой-файл.jpg', { exact: true })).toHaveCount(0)
  expect(requests).toEqual([])
})

test('проверки файла: несколько, пустой, неверный формат, граница размера', async ({
  page,
}) => {
  await page.goto('/')
  await fileInput(page).evaluate((input) => {
    input.multiple = true
  })
  await fileInput(page).setInputFiles([jpeg('one.jpg'), jpeg('two.jpg')])
  await expect(page.getByRole('alert')).toContainText('Выберите один файл')
  await fileInput(page).setInputFiles(jpeg('empty.jpg', 0))
  await expect(page.getByRole('alert')).toContainText('Файл пуст')
  await fileInput(page).setInputFiles({
    name: 'script.exe',
    mimeType: 'application/octet-stream',
    buffer: Buffer.from('test'),
  })
  await expect(page.getByRole('alert')).toContainText('Замените файл')
  await fileInput(page).setInputFiles(jpeg('boundary.jpg', 10 * 1024 * 1024))
  await expect(
    page.getByRole('button', { name: 'Войти и продолжить' }),
  ).toBeVisible()
  await fileInput(page).setInputFiles(jpeg('large.jpg', 10 * 1024 * 1024 + 1))
  await expect(page.getByRole('alert')).toContainText('Допустимо до 10 MiB')
  await expect(
    page.getByRole('button', { name: 'Войти и продолжить' }),
  ).toBeDisabled()
})

test('смена направления сохраняет несовместимый файл и показывает предупреждение', async ({
  page,
}) => {
  await page.goto('/')
  await fileInput(page).setInputFiles(jpeg())
  await page.getByLabel('Направление конвертации').selectOption('png_to_jpg')
  await expect(page.getByText('example.jpg', { exact: true })).toBeVisible()
  await expect(page.getByRole('alert')).toContainText('Замените файл')
  await expect(
    page.getByText('Прозрачность заменится белым фоном.', { exact: false }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Документы', exact: true }).click()
  await expect(
    page.getByText('Сложное оформление', { exact: false }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Убрать', exact: true }).click()
  await expect(
    page.getByText('DOCX · до 20 MiB', { exact: true }),
  ).toBeVisible()
})

test('форма входа: валидация, показ пароля и заглушка без отправки данных', async ({
  page,
}) => {
  const sent = []
  page.on('request', (request) => {
    if (request.method() !== 'GET') sent.push(request.url())
  })
  await page.goto('/auth/login')
  await expect(page.getByText('Введите логин.', { exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Войти', exact: true }).click()
  await expect(page.getByLabel('Логин', { exact: true })).toBeFocused()
  await expect(page.getByText('Введите пароль.', { exact: true })).toBeVisible()
  await page.getByLabel('Логин', { exact: true }).fill('test_user')
  const password = page.getByLabel('Пароль', { exact: true })
  await password.fill('учебный пароль 123')
  await page.getByRole('button', { name: 'Показать пароль' }).click()
  await expect(password).toHaveAttribute('type', 'text')
  await page.getByRole('button', { name: 'Скрыть пароль' }).click()
  await expect(password).toHaveAttribute('type', 'password')
  await password.press('Enter')
  await expect(page.getByRole('status')).toContainText('Вход пока не подключён')
  await expect(password).toHaveValue('')
  expect(sent).toEqual([])
  expect(
    await page.evaluate(() => ({
      local: localStorage.length,
      session: sessionStorage.length,
      cookie: document.cookie,
    })),
  ).toEqual({ local: 0, session: 0, cookie: '' })
})

test('заглушки маршрутов и неизвестный адрес', async ({ page }) => {
  await page.goto('/auth/login')
  await page.getByRole('link', { name: 'Создать аккаунт' }).click()
  await expect(
    page.getByRole('heading', { name: 'Создать аккаунт' }),
  ).toBeVisible()
  await expect(
    page.getByText('Этот раздел ещё не реализован.', { exact: false }),
  ).toBeVisible()
  await page.goto('/unknown')
  await expect(
    page.getByRole('heading', { name: 'Страница не найдена' }),
  ).toBeVisible()
})

for (const theme of ['dark', 'light']) {
  test(`адаптивность и тема ${theme}: 360/390/768/1440 px, текст 200%`, async ({
    page,
  }) => {
    const errors = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' })
    for (const width of [360, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 1000 })
      for (const route of ['/', '/auth/login']) {
        await page.goto(route)
        await page.evaluate(() => document.fonts.ready)
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true)
        await page.evaluate(() => {
          document.documentElement.style.fontSize = '200%'
        })
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true)
        await page.evaluate(() => {
          document.documentElement.style.fontSize = ''
        })
      }
    }
    const expected = theme === 'dark' ? 'rgb(10, 10, 10)' : 'rgb(245, 246, 248)'
    expect(
      await page
        .locator('body')
        .evaluate((node) => getComputedStyle(node).backgroundColor),
    ).toBe(expected)
    expect(errors).toEqual([])
  })
}

test('мобильная навигация и клавиатура', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await page.keyboard.press('Tab')
  await expect(page.getByRole('link', { name: 'К содержимому' })).toBeFocused()
  await page.getByRole('button', { name: 'Меню', exact: true }).click()
  const nav = page.getByRole('navigation', { name: 'Мобильная навигация' })
  await expect(nav).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(nav).toHaveCount(0)
  await page.getByRole('button', { name: 'Меню', exact: true }).click()
  await nav.getByRole('link', { name: 'Войти', exact: true }).click()
  await expect(page).toHaveURL('/auth/login')
})

test('drag-and-drop и длинное имя файла остаются доступными без HTML-инъекции', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 1000 })
  await page.goto('/')
  const transfer = await page.evaluateHandle(() => {
    const data = new DataTransfer()
    data.items.add(
      new File(
        ['test'],
        '<img src=x onerror=alert(1)>-' + 'длинноеимя'.repeat(15) + '.jpg',
        { type: 'image/jpeg' },
      ),
    )
    return data
  })
  await page
    .locator('.dropzone')
    .dispatchEvent('drop', { dataTransfer: transfer })
  await expect(page.locator('.file-name')).toContainText(
    '<img src=x onerror=alert(1)>',
  )
  await expect(page.locator('.dropzone img')).toHaveCount(0)
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true)
  await page.getByRole('button', { name: 'Убрать', exact: true }).click()
  await expect(
    page.getByRole('button', { name: 'Выбрать файл', exact: true }),
  ).toBeVisible()
})
