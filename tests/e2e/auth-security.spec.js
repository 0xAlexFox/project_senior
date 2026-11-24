import { test, expect } from '@playwright/test'

const submit = (page) =>
  page.getByRole('button', { name: 'Войти', exact: true }).click()
const validPassword = 'учебный пароль 123'

for (const login of ['ABC', 'Test_User_123']) {
  test(`логин без учёта регистра: ${login}`, async ({ page }) => {
    await page.goto('/auth/login')
    await page.getByLabel('Логин', { exact: true }).fill(login)
    await page.getByLabel('Пароль', { exact: true }).fill(validPassword)
    await submit(page)
    await expect(page.getByRole('status')).toContainText(
      'Вход пока не подключён',
    )
  })
}

for (const count of [14, 15, 128, 129]) {
  test(`длина Unicode-пароля: ${count} кодовых точек`, async ({ page }) => {
    await page.goto('/auth/login')
    await page.getByLabel('Логин', { exact: true }).fill('test_user')
    const password = page.getByLabel('Пароль', { exact: true })
    await password.fill('🔒'.repeat(count))
    await submit(page)
    if (count < 15 || count > 128) {
      await expect(password).toHaveAttribute('aria-invalid', 'true')
      await expect(page.locator('#password-error')).toHaveText(
        'Пароль должен содержать от 15 до 128 символов.',
      )
      await expect(page.getByRole('status')).toHaveCount(0)
    } else {
      await expect(page.getByRole('status')).toContainText(
        'Вход пока не подключён',
      )
    }
  })
}

for (const [label, login, accepted] of [
  ['ниже минимума', 'ab', false],
  ['минимум', 'a_1', true],
  ['максимум', 'A'.repeat(32), true],
  ['выше максимума', 'a'.repeat(33), false],
  ['кириллица', 'тест', false],
  ['пробел', 'user name', false],
  ['похожая Unicode-буква', 'Kelvin', false],
  ['HTML', '<img src=x onerror=alert(1)>', false],
  ['SQL-подобный ввод', "a' OR 1=1--", false],
]) {
  test(`правила логина: ${label}`, async ({ page }) => {
    await page.goto('/auth/login')
    await page.getByLabel('Логин', { exact: true }).fill(login)
    await page.getByLabel('Пароль', { exact: true }).fill(validPassword)
    await submit(page)
    if (accepted) {
      await expect(page.getByRole('status')).toContainText(
        'Вход пока не подключён',
      )
    } else {
      const field = page.getByLabel('Логин', { exact: true })
      await expect(field).toHaveAttribute('aria-invalid', 'true')
      await expect(field).toHaveAttribute('aria-describedby', 'login-error')
      await expect(field).toBeFocused()
      await expect(page.getByRole('status')).toHaveCount(0)
      await expect(page.locator('.login-form img')).toHaveCount(0)
    }
  })
}

for (const count of [14, 15, 128, 129]) {
  test(`длина ASCII-пароля: ${count}`, async ({ page }) => {
    await page.goto('/auth/login')
    await page.getByLabel('Логин', { exact: true }).fill('test_user')
    const field = page.getByLabel('Пароль', { exact: true })
    await field.fill('p'.repeat(count))
    await submit(page)
    if (count < 15 || count > 128) {
      await expect(field).toHaveAttribute('aria-invalid', 'true')
      await expect(field).toHaveAttribute('aria-describedby', 'password-error')
      await expect(field).toBeFocused()
    } else {
      await expect(page.getByRole('status')).toContainText(
        'Вход пока не подключён',
      )
    }
  })
}

test('пароль не обрезается и не нормализуется; после отправки снова скрыт', async ({
  page,
}) => {
  await page.goto('/auth/login')
  const field = page.getByLabel('Пароль', { exact: true })
  const password = '  e\u0301' + '🔒'.repeat(10) + ' '
  // 15 code points including leading/trailing spaces and the combining mark.
  await page.getByLabel('Логин', { exact: true }).fill('TEST_USER')
  await field.fill(password)
  await page.getByRole('button', { name: 'Показать пароль' }).click()
  await expect(field).toHaveValue(password)
  await submit(page)
  await expect(page.getByRole('status')).toContainText('Вход пока не подключён')
  await expect(field).toHaveValue('')
  await expect(field).toHaveAttribute('type', 'password')
  await expect(
    page.getByRole('button', { name: 'Показать пароль' }),
  ).toHaveAttribute('aria-pressed', 'false')
})

test('секрет не попадает в сеть, URL, storage или консоль; redirect игнорируется', async ({
  page,
}) => {
  const password = 'Security_QA_secret_123'
  const requests = []
  const messages = []
  const errors = []
  page.on('request', (request) =>
    requests.push({
      url: request.url(),
      method: request.method(),
      body: request.postData() || '',
    }),
  )
  page.on('console', (message) => messages.push(message.text()))
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/auth/login?redirect=https%3A%2F%2Fexample.invalid%2F')
  await page.getByLabel('Логин', { exact: true }).fill('TEST_USER')
  await page.getByLabel('Пароль', { exact: true }).fill(password)
  await submit(page)
  await expect(page.getByRole('status')).toContainText('Вход пока не подключён')
  expect(page.url()).toBe(
    'http://127.0.0.1:5173/auth/login?redirect=https%3A%2F%2Fexample.invalid%2F',
  )
  expect(requests.filter((request) => request.method !== 'GET')).toEqual([])
  expect(
    requests.every(
      (request) => new URL(request.url).origin === 'http://127.0.0.1:5173',
    ),
  ).toBe(true)
  expect(JSON.stringify(requests)).not.toContain(password)
  expect(messages.join('\n')).not.toContain(password)
  expect(errors).toEqual([])
  expect(await page.context().cookies()).toEqual([])
  expect(
    await page.evaluate(() => [localStorage.length, sessionStorage.length]),
  ).toEqual([0, 0])
  await page.getByRole('link', { name: 'К конвертеру', exact: true }).click()
  await page.getByRole('link', { name: 'Войти', exact: true }).click()
  await expect(page.getByLabel('Пароль', { exact: true })).toHaveValue('')
  await expect(page.getByLabel('Пароль', { exact: true })).toHaveAttribute(
    'type',
    'password',
  )
})

test('ошибки формы читаемы на 360 px при тексте 200%', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 1000 })
  await page.goto('/auth/login')
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%'
  })
  await page.getByLabel('Логин', { exact: true }).fill('неверный логин')
  await page.getByLabel('Пароль', { exact: true }).fill('short')
  await submit(page)
  await expect(page.locator('#login-error')).toBeVisible()
  await expect(page.locator('#password-error')).toBeVisible()
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true)
})

test('видимый пароль исключён из проверки правописания и автоисправления', async ({
  page,
}) => {
  await page.goto('/auth/login')
  const password = page.getByLabel('Пароль', { exact: true })
  await expect(password).toHaveAttribute('autocomplete', 'current-password')
  await page.getByRole('button', { name: 'Показать пароль' }).click()
  await expect(password).toHaveAttribute('type', 'text')
  await expect(password).toHaveAttribute('spellcheck', 'false')
  await expect(password).toHaveAttribute('autocorrect', 'off')
  await expect(password).toHaveAttribute('autocapitalize', 'none')
})

test('ошибки появляются после ухода из изменённого поля, но не в нетронутой форме', async ({
  page,
}) => {
  await page.goto('/auth/login')
  const login = page.getByLabel('Логин', { exact: true })
  const password = page.getByLabel('Пароль', { exact: true })
  await login.focus()
  await password.focus()
  await expect(page.locator('#login-error')).toHaveCount(0)
  await login.fill('нельзя')
  await password.focus()
  await expect(page.locator('#login-error')).toBeVisible()
  await password.fill('short')
  await login.focus()
  await expect(page.locator('#password-error')).toBeVisible()
  await login.fill('')
  await password.focus()
  await expect(page.locator('#login-error')).toHaveText('Введите логин.')
})

test('показ пароля не теряет клик при появлении ошибки короткого пароля', async ({
  page,
}) => {
  await page.goto('/auth/login')
  const field = page.getByLabel('Пароль', { exact: true })
  await field.fill('short')
  await page.getByRole('button', { name: 'Показать пароль' }).click()
  await expect(field).toHaveAttribute('type', 'text')
  await expect(page.locator('#password-error')).toBeVisible()
  await page.getByRole('button', { name: 'Скрыть пароль' }).click()
  await expect(field).toHaveAttribute('type', 'password')
})

test('переход к показу пароля сохраняет проверку изменённого логина', async ({
  page,
}) => {
  await page.goto('/auth/login')
  await page.getByLabel('Логин', { exact: true }).fill('неверно')
  await page.getByRole('button', { name: 'Показать пароль' }).click()
  await expect(page.getByLabel('Пароль', { exact: true })).toHaveAttribute(
    'type',
    'text',
  )
  await expect(page.locator('#login-error')).toBeVisible()
  await expect(page.locator('#password-error')).toHaveCount(0)
})
