import { test, expect } from '@playwright/test'
async function enter(page) {
  await page.goto('/')
  await page.getByRole('button', { name: 'Открыть учебный кабинет' }).click()
  await page.goto('/account/settings')
  await expect(page.getByLabel('Имя', { exact: true })).toHaveValue(
    'Учебный пользователь',
  )
}
async function confirm(page, action) {
  const dialog = page.getByRole('dialog')
  await dialog
    .getByLabel('Текущий пароль', { exact: true })
    .fill('учебный пароль 123')
  await dialog.getByRole('button', { name: action, exact: true }).click()
  await expect(dialog).not.toBeVisible()
}
test('профиль: защита ухода, IANA-зона, конфликт сохраняет ввод', async ({
  page,
}) => {
  await enter(page)
  await page.getByLabel('Имя', { exact: true }).fill('  Новое имя  ')
  await page.getByRole('link', { name: 'Мои файлы', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Отмена', exact: true })
    .click()
  await expect(page.getByLabel('Имя', { exact: true })).toHaveValue(
    '  Новое имя  ',
  )
  await page.getByLabel('Часовой пояс', { exact: true }).selectOption('UTC')
  await expect(page.getByText('Пример даты:', { exact: false })).toContainText(
    '11:30:00 UTC',
  )
  await page.getByText('Учебные ответы и состояния', { exact: true }).click()
  await page
    .getByLabel('Следующий учебный ответ')
    .selectOption('SETTINGS_CONFLICT')
  await page
    .getByRole('button', { name: 'Сохранить изменения', exact: true })
    .click()
  await expect(page.getByRole('alert')).toContainText('Ваш ввод сохранён')
  await expect(page.getByLabel('Имя', { exact: true })).toHaveValue(
    '  Новое имя  ',
  )
  await page
    .getByRole('button', { name: 'Сохранить изменения', exact: true })
    .click()
  await expect(page.getByLabel('Имя', { exact: true })).toHaveValue('Новое имя')
  await expect(
    page.getByRole('button', { name: 'Сохранить изменения', exact: true }),
  ).toBeDisabled()
})
test('Telegram: две стороны, старая связь при замене, отмена; новые коды подтверждаются отдельно', async ({
  page,
}) => {
  await enter(page)
  await page
    .getByRole('button', { name: 'Подключить Telegram', exact: true })
    .click()
  await confirm(page, 'Начать подключение')
  await page
    .getByRole('button', { name: 'Подтвердить здесь', exact: true })
    .click()
  await expect(page.getByRole('alert')).toBeVisible()
  await page.getByText('Учебные ответы и состояния', { exact: true }).click()
  await page
    .getByRole('button', {
      name: 'Подтвердить со стороны учебного бота',
      exact: true,
    })
    .click()
  await page
    .getByRole('button', { name: 'Подтвердить здесь', exact: true })
    .click()
  await expect(page.getByText('Подключён', { exact: true })).toBeVisible()
  await page
    .getByRole('button', { name: 'Сменить Telegram', exact: true })
    .click()
  await confirm(page, 'Начать подключение')
  await expect(
    page.getByText('Прежняя привязка продолжает действовать', { exact: false }),
  ).toBeVisible()
  await page
    .getByRole('button', { name: 'Отменить подключение', exact: true })
    .click()
  await expect(page.getByText('Подключён', { exact: true })).toBeVisible()
  await page
    .getByRole('button', { name: 'Выпустить новый набор', exact: true })
    .click()
  await confirm(page, 'Выпустить набор')
  await expect(
    page.getByRole('button', { name: 'Отключить Telegram', exact: true }),
  ).toBeDisabled()
  await page.getByLabel('Я сохранил резервные коды').check()
  await page.getByRole('button', { name: 'Продолжить', exact: true }).click()
  await expect(
    page.getByRole('button', { name: 'Отключить Telegram', exact: true }),
  ).toBeEnabled()
  await expect(page.getByLabel('Учебные резервные коды')).toHaveCount(0)
})
test('пароль очищается после ответа; удаление требует пароль и отдельное подтверждение', async ({
  page,
}) => {
  await enter(page)
  await page
    .locator('#password-settings')
    .getByLabel('Текущий пароль', { exact: true })
    .fill('старый учебный пароль')
  await page
    .getByLabel('Новый пароль', { exact: true })
    .fill('новый учебный пароль')
  await page
    .getByLabel('Подтверждение пароля', { exact: true })
    .fill('новый учебный пароль')
  await page
    .getByRole('button', { name: 'Изменить пароль', exact: true })
    .click()
  await expect(
    page.getByText('Учебный ответ: пароль изменён', { exact: false }),
  ).toBeVisible()
  await expect(
    page
      .locator('#password-settings')
      .getByLabel('Текущий пароль', { exact: true }),
  ).toHaveValue('')
  await expect(page.getByLabel('Новый пароль', { exact: true })).toHaveValue('')
  await page
    .getByRole('button', { name: 'Удалить аккаунт', exact: true })
    .click()
  const dialog = page.getByRole('dialog')
  await expect(
    dialog.getByRole('button', { name: 'Удалить аккаунт', exact: true }),
  ).toBeDisabled()
  await dialog.getByLabel('Подтверждаю удаление аккаунта и файлов').check()
  await confirm(page, 'Удалить аккаунт')
  await expect(page).toHaveURL('/')
  expect(
    await page.evaluate(() => sessionStorage.getItem('converter.preview')),
  ).toBe(null)
})
