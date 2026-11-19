# API и обработка задач

Версия 0.2 · 17 ноября 2026 г. Контракт внешнего API: [OpenAPI 3.1](../api/openapi.json). Базовый пример `https://converter.example` — зарезервированное вымышленное имя, не работающий сервис.

Зависимости реализации: [архитектура](06-application-architecture.md), [модель данных](07-data-model.md), [задачи и приёмка](05-implementation-and-acceptance.md). Правила и численные лимиты задаёт ТЗ; схемы внешнего API — [OpenAPI](../api/openapi.json).

## 1. Два способа доступа

| Контур | Авторизация | Назначение |
| --- | --- | --- |
| `/api/app/*` | Cookie-сессия; CSRF и Origin для изменений | Собственный браузерный интерфейс |
| `/api/v1/*` | Только `Authorization: Bearer <персональный API-ключ>` | Внешние программы, включая статус/скачивание/отмену |
| `/api/auth/*` | По назначению: гость, сессия, challenge или reset-сессия | Регистрация, вход и восстановление |
| `/api/integrations/telegram/webhook` | Секретный заголовок Telegram, не API-ключ клиента | Приём обновлений бота |

Все операции внешнего `/api/v1` требуют ключ. Cookie не заменяет его; персональный ключ не разрешает менять пароль/Telegram/профиль. Веб-клиент не получает «общий секрет сервера» и не обязан копировать личный ключ в свой fetch. Оба контура вызывают один сервис задач с одинаковыми квотами и правилами, не дублируют движки.

## 2. Внешние endpoints

| Метод и путь `/api/v1` | Результат |
| --- | --- |
| `GET /formats` | 200: направления, MIME, пределы; значения совпадают с ТЗ |
| `POST /conversions` | multipart, 202 после долговечного принятия; Location и job. При точном повторе принятого запроса — 200 и существующий job |
| `GET /conversions/{job_id}` | 200: состояние только своей задачи, предупреждения, итог/ошибка/срок |
| `GET /conversions/{job_id}/file` | 200: бинарный результат, attachment; только для succeeded и доступного файла |
| `POST /conversions/{job_id}/cancel` | 200: задача cancelled; повтор отмены cancelled — 200; другое терминальное состояние — 409 |

В MVP нет webhook клиентов, публичных URL на файлы, импорта по внешним ссылкам и синхронной конвертации в одном HTTP-ответе. HTTP `202` означает принятие, а не успешный результат. Состояние определяется отдельным GET.

`POST /conversions`: ровно одно поле `file`, обязательное `conversion` из `jpg_to_png|png_to_jpg|docx_to_pdf`, необязательное `save_to_profile` как строка строго `true` либо `false`. Неизвестные поля/повтор полей — 400. Порядок частей multipart произвольный; после чтения всех ограниченных полей валидируется итог. Поддельный Content-Type не обходит проверку байт. Тип исходника должен совпасть с направлением.

Обязательный заголовок `Idempotency-Key`: UUID v4, новый для намеренно новой конвертации. Хранение результата идемпотентности 24 часа с принятия; область уникальности `(user_id, endpoint, key)` общая для web/API. Сервер считает SHA-256 входа и сравнивает направление и **явно переданный** флаг сохранения. При его отсутствии повтор наследует зафиксированный первым запросом снимок настройки, даже если пользователь затем поменял её. Отдельный исходник/направление/явный флаг с тем же ключом — 409 `IDEMPOTENCY_CONFLICT`.

Параллельный первый запрос с тем же ключом — 409 `REQUEST_IN_PROGRESS`, Retry-After 2; после завершения загрузки повторить тот же ключ. До принятия задачи ошибки валидации не занимают ключ надолго. При replay не списывать лимит запуска и не резервировать хранилище повторно. Аутентификация, предельный размер тела и защитный лимит HTTP применяются и к повторам; совпадение тела проверяется потоково, его нельзя установить по одному имени файла.

## 3. Как проходит запрос

1. API проверяет ключ/сессию до чтения содержимого; защитные ограничения HTTP, размер и состав multipart.
2. Поток пишет в приватный случайный staging-каталог и считает хеш. При обрыве/лимите — удалить неполный файл. Сигнатура/минимальная структура, направление и резерв квоты проверяются до принятия; полная проверка движком может завершиться позже ошибкой задачи.
3. Исходник фиксируется долговечно (включая flush/атомарное перемещение). В одной транзакции PostgreSQL создаются job, снимок настроек, резерв квоты, запись идемпотентности и очередь pg-boss через общий transaction adapter. Откат убирает записи, осиротевший файл найдёт сборщик.
4. Только после commit: 202, `Location: /api/v1/conversions/{id}`, `Retry-After: 2`. ID непредсказуемый UUID, но сам по себе не право доступа.
5. Worker получает lease, запускает изолированный runner. Бизнес-ошибка — failed; инфраструктурный сбой допускает ещё одну попытку. Пользователь видит этап, число попыток и безопасный код.
6. Worker проверяет формат/лимит результата, завершает запись файла; в короткой транзакции проверяет актуальный lease/отсутствие отмены и владельца, публикует succeeded и фактическую квоту. Устаревшая попытка удаляет свой output.
7. Клиент опрашивает GET через 2 секунды; при долгом ожидании/сети — 5, затем 10 секунд, учитывает Retry-After. Останавливается в терминальном состоянии, на скрытой вкладке снижает частоту. Общий защитный предел GET статуса: 120 запросов/мин на аккаунт.
8. Скачивание повторно проверяет принадлежность и срок. Незавершённая задача — 409, просроченный/удалённый результат владельца — 410. Неизвестный или чужой ID всегда 404. Срок при скачивании проверяется до начала потока; начавшийся допустимый поток можно завершить после формального истечения, оборванный новый запрос после срока — 410.

## 4. Формат состояния

```json
{
  "id": "01949d50-23a0-4000-8000-000000000001",
  "conversion": "docx_to_pdf",
  "source": "api",
  "status": "succeeded",
  "stage": "completed",
  "attempts": 1,
  "saveToProfile": false,
  "createdAt": "2026-11-16T10:00:00Z",
  "finishedAt": "2026-11-16T10:00:08Z",
  "warnings": [],
  "result": {
    "fileName": "document.pdf",
    "mimeType": "application/pdf",
    "sizeBytes": 184320,
    "downloadPath": "/api/v1/conversions/01949d50-23a0-4000-8000-000000000001/file",
    "available": true,
    "expiresAt": "2026-11-16T11:00:08Z"
  },
  "error": null
}
```

До успеха `result:null`. При failed — структурированный `error`; при cancelled он null. `finishedAt:null` до терминального статуса. Этапы: queued/validating/converting/retrying/completed/failed/cancelled. Удалённый/просроченный результат сохраняет безопасные метаданные, но `available:false`, `downloadPath:null`; после TTL убирается исходное имя временного файла. У постоянного результата `expiresAt:null`. GET job не возвращает путь на диске, хеш ключа, байты файла или stack trace.

## 5. Ошибки

`FILE_COMPLEXITY_EXCEEDED` используется при превышении числа страниц итогового PDF. Он не вводит ограничения на пиксели или внутренний архив DOCX. Исчерпание времени обработки — `CONVERSION_TIMEOUT`, превышение размера результата — `RESULT_TOO_LARGE`; прочие сбои движка — `CONVERSION_FAILED`. Входной DOCX ограничивается размером загруженного файла из REQ-04.

```json
{
  "error": {
    "code": "FILE_TOO_LARGE",
    "message": "Для DOCX допустимо не больше 20 MiB.",
    "requestId": "req_example_001",
    "retryable": false,
    "details": { "maxBytes": 20971520 }
  }
}
```

| HTTP | Коды и смысл |
| --- | --- |
| 400 | `INVALID_REQUEST`, `EMPTY_FILE`, `MULTIPLE_FILES_NOT_ALLOWED`, `IDEMPOTENCY_KEY_REQUIRED`, `INVALID_IDEMPOTENCY_KEY` |
| 401 | `INVALID_API_KEY` — отсутствует, неверен или отозван; `SESSION_EXPIRED` только для app-контура |
| 403 | `CSRF_FAILED`, `REAUTH_REQUIRED`, `ACCOUNT_DISABLED` |
| 404 | `JOB_NOT_FOUND` для неизвестной/чужой задачи; не раскрывать факт существования |
| 408 | `UPLOAD_TIMEOUT` — тело не получено за 120 секунд |
| 409 | `STORAGE_QUOTA_EXCEEDED`, `IDEMPOTENCY_CONFLICT`, `REQUEST_IN_PROGRESS`, `JOB_NOT_READY`, `JOB_ALREADY_FINISHED`, `JOB_FAILED`, `JOB_CANCELLED`, `SETTINGS_CONFLICT` |
| 410 | `RESULT_EXPIRED`, `RESULT_DELETED` — только владельцу |
| 413 | `FILE_TOO_LARGE`, `REQUEST_TOO_LARGE` |
| 415 | `UNSUPPORTED_FILE_TYPE`, `FILE_TYPE_MISMATCH`, `UNSUPPORTED_CONVERSION` |
| 422 | `INVALID_FILE`, `FILE_COMPLEXITY_EXCEEDED`, `UNSUPPORTED_DOCUMENT_FEATURE` при ранней проверке |
| 429 | `RATE_LIMITED`, `ACTIVE_JOB_LIMIT`; Retry-After обязателен |
| 500 | `INTERNAL_ERROR`, без внутреннего исключения |
| 503 | `QUEUE_FULL`, `STORAGE_UNAVAILABLE`, `SERVICE_UNAVAILABLE`; Retry-After |

После принятия файла ошибка конвертации передаётся **внутри GET 200 job.status=failed**, а не HTTP 500 для успешно прочитанного статуса. Возможные job.error.code: `INVALID_FILE`, `FILE_COMPLEXITY_EXCEEDED`, `UNSUPPORTED_DOCUMENT_FEATURE`, `CONVERSION_FAILED`, `CONVERSION_TIMEOUT`, `QUEUE_TIMEOUT`, `RESULT_TOO_LARGE`, `INFRASTRUCTURE_ERROR`. Поле retryable означает допустимость нового пользовательского запуска, а не команду бесконечного повтора того же failed job. Новый запуск требует нового ключа идемпотентности.

Запросы сверх суточного предела получают Retry-After до следующей полуночи UTC. Ограничение HTTP 120/min на аккаунт действует отдельно от квоты 10 запусков/min; нагрузка по IP дополнительно ограничивается до чтения тела. Конкретный IP-предел задаётся эксплуатационной конфигурацией с учётом общего NAT и документируется до публичного запуска.

## 6. Примеры для пользователя API

Переменная `CONVERTER_API_KEY` заполняется локально, её значение нельзя коммитить. Имена файла/задачи ниже условные.

```bash
# Новый UUID нужен для каждого намеренно нового задания.
curl --fail-with-body -X POST 'https://converter.example/api/v1/conversions' \
  -H "Authorization: Bearer $CONVERTER_API_KEY" \
  -H 'Idempotency-Key: 7d4a2f01-9dc9-4e61-83cc-2302bf221001' \
  -F 'conversion=docx_to_pdf' \
  -F 'save_to_profile=false' \
  -F 'file=@./document.docx'

curl --fail-with-body \
  -H "Authorization: Bearer $CONVERTER_API_KEY" \
  'https://converter.example/api/v1/conversions/01949d50-23a0-4000-8000-000000000001'

# Только после status=succeeded и result.available=true.
curl --fail-with-body \
  -H "Authorization: Bearer $CONVERTER_API_KEY" \
  'https://converter.example/api/v1/conversions/01949d50-23a0-4000-8000-000000000001/file' \
  --output result.pdf
```

Node.js 24+, пример **только постановки**, далее опрос/скачивание как выше:

```javascript
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';

const form = new FormData();
form.set('conversion', 'jpg_to_png');
form.set('save_to_profile', 'false');
// Для небольшого примера до 10 MiB; сервер должен читать загрузки потоково.
form.set('file', new Blob([await readFile('./photo.jpg')], { type: 'image/jpeg' }), 'photo.jpg');
const idempotencyKey = randomUUID(); // Сохранить для сетевого повтора этого же запроса.
const response = await fetch('https://converter.example/api/v1/conversions', {
  method: 'POST',
  headers: { Authorization: `Bearer ${process.env.CONVERTER_API_KEY}`, 'Idempotency-Key': idempotencyKey },
  body: form,
  signal: AbortSignal.timeout(130_000),
});
const body = await response.json();
if (!response.ok) throw new Error(body.error?.code ?? `HTTP_${response.status}`);
console.log(body.id, body.status); // Не выводить секрет и содержимое файла.
```

## 7. Внутренние маршруты для реализации сайта

Эти таблицы — требования к внутреннему контракту; внешний OpenAPI описывает только `/api/v1`. Перед реализацией внутренние JSON Schema добавляются в код и проверяются интеграционными тестами.

| Путь | Поведение |
| --- | --- |
| `POST /api/auth/register` | login/displayName/password, 201 и обычная сессия; initialRecoveryCodes возвращаются только в этом ответе и показываются на onboarding-экране; дубликат логина 409 |
| `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/session` | Создать/отозвать текущую сессию, получить безопасное состояние/CSRF |
| `POST /api/auth/reauth` | Проверить текущий пароль, маркер свежести до 5 минут |
| `POST /api/auth/recovery/start` | login, всегда 202, challengeId; существование Telegram не раскрывается |
| `POST /api/auth/recovery/verify` | challengeId + Telegram code или login + резервный код, ограниченная reset-cookie |
| `POST /api/auth/password/reset` | Новый пароль по reset-cookie, отзыв сессий/ключа, 204 |
| `GET/PATCH /api/app/profile` | displayName/timeZone; version/If-Match, конфликт 409 |
| `GET/PATCH /api/app/settings` | saveNewResults, version/If-Match; первоначально false |
| `GET /api/app/api-key`, `POST /api/app/api-key`, `DELETE /api/app/api-key` | Метаданные / выпуск или замена с reauth / отзыв с reauth |
| `POST /api/app/telegram/link`, `POST /api/app/telegram/confirm`, `DELETE /api/app/telegram` | Одноразовая привязка, подтверждение исходным браузером, отключение с reauth |
| `POST /api/app/recovery-codes` | Выпуск/перевыпуск с reauth; исходные коды один раз, хеши в БД |
| `POST /api/app/password` | Смена по текущему паролю, завершение остальных сессий, 204 |
| `DELETE /api/app/account` | reauth и явное подтверждение, 202 на очистку, немедленный отзыв доступа |
| `GET /api/app/formats` | Публичная конфигурация формы без персональных данных |
| `POST /api/app/conversions` | Как внешний create, но cookie+CSRF; тот же механизм идемпотентности |
| `GET /api/app/conversions` | Свои активные задачи для восстановления UI; без публичной истории чужих задач |
| `GET /api/app/conversions/{id}`, `GET .../{id}/file`, `POST .../{id}/cancel` | Общий job-сервис, права сессии |
| `GET /api/app/files` | page ≥1, pageSize=20, format/source/sort, поиск передаётся POST-телом отдельного search endpoint при необходимости исключить имена из URL |
| `POST /api/app/files/search` | Те же фильтры + query ≤200 символов в JSON, без записи тела в логи; пагинация/сортировка фиксированы |
| `GET /api/app/files/{id}/file`, `DELETE /api/app/files/{id}` | Только свой сохранённый файл; приватное скачивание/логическое удаление, 204 |

Любой поиск ограничен user_id из проверенной сессии, не из клиентского тела. Методы профиля/настроек не принимают поля user_id, quota, apiKeyHash, роли. Схемы входа закрыты для неизвестных свойств; выход формируется белым списком. Даты — UTC ISO 8601, байты — целое число, ошибки имеют общий envelope.
