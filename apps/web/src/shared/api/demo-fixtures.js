import { demoAssets } from './demo-assets.js'

export const demoConfig = {
  maxSavedFiles: 100,
  maxSavedBytes: 500 * 1024 ** 2,
  reserveBytes: 50 * 1024 ** 2,
  maxActiveJobs: 2,
  temporarySeconds: 3600,
  pageSize: 20,
}

export function makeDemoFiles() {
  const names = ['презентация', 'обложка', 'каталог-товаров', 'план-проекта']
  return Array.from({ length: 21 }, (_, index) => {
    const format = ['pdf', 'png', 'jpg'][index % 3]
    return {
      id: `demo-file-${String(index + 1).padStart(2, '0')}`,
      fileName: `${names[index % names.length]}-${index + 1}.${format}`,
      format,
      sizeBytes: demoAssets[format].sizeBytes,
      createdAt: `2026-11-${String(19 - Math.floor(index / 3)).padStart(2, '0')}T11:30:00Z`,
      source: index % 2 ? 'api' : 'web',
    }
  })
}

export function makeRecoveryCodes(batch = 1) {
  return Array.from(
    { length: 8 },
    (_, index) =>
      `DEMO-${batch}-${String(index + 1).padStart(4, '0')}-NOT-VALID`,
  )
}

export const demoErrors = {
  NETWORK_ERROR: ['Нет связи. Не удаётся получить ответ.', true],
  SESSION_EXPIRED: ['Сессия истекла. Войдите снова.', false],
  SETTINGS_CONFLICT: [
    'Данные изменены в другой вкладке. Перечитайте актуальную версию.',
    false,
  ],
  SERVICE_UNAVAILABLE: ['Сервис временно недоступен. Повторите позже.', true],
  LOGIN_TAKEN: ['Этот логин уже занят. Выберите другой.', false],
  INVALID_CREDENTIALS: ['Неверный логин или пароль.', false],
  INVALID_RECOVERY_CODE: ['Неверный код. Проверьте ввод.', false],
  RECOVERY_EXPIRED: [
    'Срок кода или reset-сессии истёк. Начните восстановление заново.',
    false,
  ],
  CODE_USED: ['Код уже использован. Используйте другой код.', false],
  REAUTH_REQUIRED: ['Подтвердите действие текущим паролем ещё раз.', false],
  KEY_RESPONSE_LOST: [
    'Ответ выпуска потерян. Полный ключ недоступен; проверьте состояние и явно выпустите новый.',
    false,
  ],
  STORAGE_QUOTA_EXCEEDED: [
    'Недостаточно квоты: требуется одно место и резерв до 50 MiB.',
    false,
  ],
  RATE_LIMITED: ['Слишком много запросов. Повторите через 2 секунды.', true],
  IDEMPOTENCY_CONFLICT: [
    'Этот ключ повтора уже относится к другой задаче. Начните новый запуск явно.',
    false,
  ],
  NOT_FOUND: ['Данные не найдены или недоступны.', false],
  JOB_ALREADY_FINISHED: ['Задача уже завершена. Обновите её состояние.', false],
  RESULT_EXPIRED: ['Срок скачивания истёк или файл удалён.', false],
  PREVIEW_DISABLED: [
    'Включите учебные ответы. Сервер пока не подключён.',
    false,
  ],
}
