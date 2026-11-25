<script setup>
import { RouterLink } from 'vue-router'
import openApiUrl from '../../../../api/openapi.json?url'
import { previewFormats } from '../shared/api/preview-formats.js'
import {
  curlCreate,
  curlStatus,
  curlDownload,
  nodeCreate,
} from '../shared/config/api-examples.js'
import CopyText from '../shared/ui/CopyText.vue'
import NoticeMessage from '../shared/ui/NoticeMessage.vue'
const sections = [
  ['start', 'Начало работы'],
  ['formats', 'Направления'],
  ['limits', 'Лимиты'],
  ['create', 'Создание задачи'],
  ['status', 'Статус и скачивание'],
  ['retry', 'Отмена и повторы'],
  ['errors', 'Ошибки'],
]
</script>
<template>
  <div class="container public-document">
    <aside class="document-toc">
      <nav aria-label="На этой странице" class="stack">
        <p class="caption">НА ЭТОЙ СТРАНИЦЕ</p>
        <a v-for="[id, label] in sections" :key="id" :href="'#' + id">{{
          label
        }}</a>
      </nav>
    </aside>
    <article class="stack document-content">
      <header id="start" class="stack">
        <h1>API конвертации файлов</h1>
        <p class="secondary">Три направления конвертации для ваших программ.</p>
        <a
          :href="openApiUrl"
          download="openapi.json"
          class="button button-secondary document-download"
          >Скачать OpenAPI</a
        >
      </header>
      <NoticeMessage tone="warning"
        >Это проект контракта. Сервер ещё не подключён; converter.example —
        вымышленный адрес. Примеры на странице не выполняются и не отправляют
        файлы.</NoticeMessage
      >
      <NoticeMessage
        >Нужен персональный ключ.
        <RouterLink to="/account/api-key">Выпустите ключ в кабинете</RouterLink>
        и передавайте только в Authorization: Bearer. Не помещайте ключ в URL,
        исходники или переписку. Cookie не заменяет API-ключ; для сайта личный
        ключ не нужен.</NoticeMessage
      >
      <section id="formats" class="stack">
        <h2>Поддерживаемые направления</h2>
        <p>Один файл — одна асинхронная задача.</p>
        <dl class="format-list">
          <template v-for="format in previewFormats" :key="format.id"
            ><dt>{{ format.label }}</dt>
            <dd>
              <code>{{ format.id }}</code> · до {{ format.limitLabel }}
              <p v-if="format.warning" class="caption">{{ format.warning }}</p>
            </dd></template
          >
        </dl>
      </section>
      <section id="limits" class="stack">
        <h2>Лимиты</h2>
        <p>
          JPEG/PNG — до 10 MiB (10 485 760 байт), DOCX — до 20 MiB (20 971 520
          байт), включительно. Весь multipart — до 21 MiB; результат — до 50
          MiB, PDF — до 200 страниц.
        </p>
        <p>
          Не более 2 активных задач, 10 новых задач в минуту и 100 в сутки UTC
          на аккаунт, сайт и API вместе. Загрузка — до 120 секунд; очередь — до
          10 минут; попытка обработки — до 30 секунд для изображения и 120
          секунд для DOCX.
        </p>
        <NoticeMessage
          >Сохранение: по умолчанию применяется настройка кабинета. Явное
          save_to_profile=true|false имеет приоритет только для этого запуска.
          Без сохранения результат доступен владельцу 1 час после готовности.
          Библиотека — 100 файлов / 500 MiB; до принятия резервируются 1 место и
          50 MiB.</NoticeMessage
        >
      </section>
      <section id="create" class="stack">
        <h2>1. Создайте задачу</h2>
        <p>
          <code>POST /api/v1/conversions</code> · multipart: одно file,
          обязательное conversion, необязательное save_to_profile строго true
          или false. Заголовок Idempotency-Key — UUID v4. Не задавайте
          Content-Type multipart вручную: boundary создаёт клиент.
        </p>
        <p>
          HTTP 202 означает долговечное принятие, а не готовность. Точный повтор
          принятого запроса возвращает HTTP 200 с тем же job. Сохраните
          полученный id; не используйте пример ID для своей задачи.
        </p>
        <section class="panel workspace-panel stack">
          <h3 class="panel-title">curl · постановка</h3>
          <CopyText :value="curlCreate" label="curl: создать задачу" />
        </section>
        <section class="panel workspace-panel stack">
          <h3 class="panel-title">Node.js 24+ · только постановка</h3>
          <p class="caption">
            Небольшой пример читает до 10 MiB в память. Значение
            CONVERTER_API_KEY задаётся локально; не коммитьте его.
          </p>
          <CopyText :value="nodeCreate" label="Node.js: создать задачу" />
        </section>
      </section>
      <section id="status" class="stack">
        <h2>2. Проверьте статус</h2>
        <p>
          <code>GET /api/v1/conversions/{job_id}</code> · опрос через 2 секунды
          с учётом Retry-After, при сетевых сбоях — пауза 5/10 секунд. queued →
          running → succeeded / failed / cancelled. Не показывайте выдуманный
          процент обработки.
        </p>
        <CopyText :value="curlStatus" label="curl: статус задачи" />
        <h2>3. Скачайте результат</h2>
        <p>
          Только при succeeded и result.available=true, до expiresAt и пока файл
          не удалён. available может стать false при неизменном succeeded.
          Скачивание требует ключ владельца; публичного URL нет.
        </p>
        <CopyText :value="curlDownload" label="curl: скачать результат" />
      </section>
      <section id="retry" class="stack">
        <h2>Отмена и повторы</h2>
        <p>
          <code>POST /api/v1/conversions/{job_id}/cancel</code> отменяет
          принятую задачу. Повтор cancelled даёт 200; другое терминальное
          состояние — 409. При поздней отмене перечитайте статус. Прерывание
          передачи не доказывает отмену принятой задачи.
        </p>
        <p>
          При неизвестном ответе повторите тот же исходник, направление и явный
          флаг с тем же ключом. Запись идемпотентности действует 24 часа с
          принятия. Если флаг не передан, повтор наследует первоначальный снимок
          настройки. Новый намеренный запуск использует новый ключ; 409
          IDEMPOTENCY_CONFLICT не обходится автоматической заменой ключа.
        </p>
      </section>
      <section id="errors" class="stack">
        <h2>Ошибки</h2>
        <dl class="format-list">
          <dt>400 / 413</dt>
          <dd>
            Поля или размер/формат не подходят. Исправьте исходник/запрос.
          </dd>
          <dt>401 / 404</dt>
          <dd>
            Проверьте ключ; задача/файл не найдены или не принадлежат владельцу.
          </dd>
          <dt>409</dt>
          <dd>
            Конфликт ключа, REQUEST_IN_PROGRESS или STORAGE_QUOTA_EXCEEDED.
            Учтите Retry-After, освободите место либо явно создайте новую
            временную задачу.
          </dd>
          <dt>410 / 429</dt>
          <dd>
            Результат истёк либо достигнут лимит. Учитывайте Retry-After; без
            бесконечного повтора.
          </dd>
          <dt>503</dt>
          <dd>Сервис временно недоступен. Повторите позже.</dd>
        </dl>
        <p>
          Ошибка обработки приходит внутри HTTP 200: job.status=failed и
          job.error (code, message, requestId, retryable). Успешное чтение
          статуса не равно успешной конвертации. retryable допускает новый
          пользовательский запуск, а не бесконечный повтор failed job.
        </p>
      </section>
    </article>
  </div>
</template>
