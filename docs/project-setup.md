# Окружение и запуск проекта

Актуализация: 24 ноября 2026 г. Основа без исходников подготовлена в IT-0014 по [архитектуре](application-architecture.md) и [технологиям](technology-decisions.md). В IT-0017 добавлены начальный frontend, его запуск, сборка и браузерные проверки. Backend, миграции и runner ещё не реализованы; инструменты Python и контракт OpenAPI сохранены.

## Структура

Шесть приватных npm workspaces с ES modules и общей версией 0.0.0: `apps/web`, `apps/api`, `apps/worker`, `packages/contracts`, `packages/backend`, `packages/conversion`. В manifests нет main/exports и команд запуска, ссылающихся на отсутствующие файлы. Межпакетные зависимости закреплены на локальную версию 0.0.0 и связываются npm workspaces.

Каталоги web разделены на app/pages/features/shared/public; API — plugins и routes auth/app/v1/integrations; worker — jobs/runner/maintenance. Backend содержит modules identity/account/conversions/files, db/queue/storage/integrations/config; conversion — engines/validation. Подготовлены db/migrations, infra/api/web/runner/systemd, tests/integration/e2e/fixtures. Пустые каталоги сохраняются маркерами `.gitkeep`. В IT-0017 добавлены исходники Vue/JS/HTML/CSS web, конфигурации Vite/Playwright и `tests/e2e/frontend.spec.js`; SQL, backend/worker, Dockerfile и реальные fixtures конвертации ещё отсутствуют.

## Корневые настройки

| Файл | Назначение |
| --- | --- |
| [package.json](../package.json) | Приватный монорепозиторий, workspaces, проверяющие команды, точные версии и overrides |
| [package-lock.json](../package-lock.json) | Единое дерево зависимостей с integrity; установка через npm ci |
| [.npmrc](../.npmrc) | Официальный registry, exact-save, engine-strict, запрет install scripts; TLS и peer-проверки не отключаются |
| [.nvmrc](../.nvmrc) | Node.js 24.19.0; npm 12.0.2 закреплён в packageManager |
| [.editorconfig](../.editorconfig), [.gitattributes](../.gitattributes) | UTF-8, LF и правила текстовых/бинарных файлов |
| [.vscode/settings.json](../.vscode/settings.json) | Python-терминал VS Code использует локальный .env; в Git хранится только переключатель, без значений переменных |
| [.prettierrc.json](../.prettierrc.json), [.prettierignore](../.prettierignore) | Формат декларативных настроек и исключение локальных данных |
| [jsconfig.json](../jsconfig.json) | Настройки редактора для будущих JavaScript ES modules; это не сборщик и не обещание пройденного typecheck |
| [compose.yaml](../compose.yaml) | Только локальная PostgreSQL для разработки, без приложения/runner |
| [.dockerignore](../.dockerignore), [.gitignore](../.gitignore) | Исключение секретов, зависимостей, сборок и локальных журналов |

Локальный корневой `.env` содержит только реальные настройки dev-БД; создан отдельный случайный пароль, файл имеет права 0600 и исключён из Git/контекста Docker. Значения секретов не выводятся и не копируются в документацию. В клоне `.env` нужно создать отдельно с собственными локальными значениями POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD и POSTGRES_PORT. `.env.example` по запросу владельца не создавался. Настройки приложения/Telegram будут определены вместе с реализацией и проверкой конфигурации; фиктивных ключей нет.

## Зависимости npm

Прямые версии сверены с официальным npm registry, метаданными engines/peer dependencies и документацией npm/Fastify/pg-boss. Полный состав и точные транзитивные версии задаёт lock-файл, а не этот обзор. Node.js 24 остаётся выбранной веткой LTS проекта; на новую major без причины не переходим.

| Workspace | Пакет | Версия | Тип |
| --- | --- | --- | --- |
| корень | `@eslint/js` | 10.0.1 | dev |
| корень | `@playwright/test` | 1.65.1 | dev |
| корень | `concurrently` | 10.0.7 | dev |
| корень | `eslint` | 10.15.0 | dev |
| корень | `eslint-config-prettier` | 10.1.8 | dev |
| корень | `eslint-plugin-vue` | 10.12.1 | dev |
| корень | `globals` | 17.14.0 | dev |
| корень | `node-pg-migrate` | 9.0.0 | dev |
| корень | `prettier` | 3.10.1 | dev |
| корень | `vue-eslint-parser` | 10.4.2 | dev |
| apps/web | `vue` | 3.5.46 | runtime |
| apps/web | `vue-router` | 4.6.5 | runtime |
| apps/web | `@vitejs/plugin-vue` | 6.0.11 | dev |
| apps/web | `@vitest/coverage-v8` | 5.1.1 | dev |
| apps/web | `@vue/test-utils` | 2.6.0 | dev |
| apps/web | `jsdom` | 31.0.1 | dev |
| apps/web | `vite` | 8.3.8 | dev |
| apps/web | `vitest` | 5.1.1 | dev |
| apps/api | `@fastify/cookie` | 11.1.5 | runtime |
| apps/api | `@fastify/csrf-protection` | 8.0.2 | runtime |
| apps/api | `@fastify/helmet` | 13.2.0 | runtime |
| apps/api | `@fastify/multipart` | 10.1.9 | runtime |
| apps/api | `@fastify/rate-limit` | 11.2.2 | runtime |
| apps/api | `fastify` | 5.12.8 | runtime |
| apps/api | `fastify-plugin` | 6.0.1 | runtime |
| packages/backend | `@opentelemetry/api` | 1.10.0 | runtime |
| packages/backend | `argon2` | 0.45.2 | runtime |
| packages/backend | `env-schema` | 8.0.2 | runtime |
| packages/backend | `pg` | 8.23.1 | runtime |
| packages/backend | `pg-boss` | 12.38.2 | runtime |
| packages/conversion | `sharp` | 0.35.5 | runtime |

Нативные Sharp/Argon2 относятся к серверным пакетам; импорт backend/conversion во frontend запрещён архитектурой. Fetch, XMLHttpRequest, CSS variables, Node test runner и серверный Telegram Bot API используют платформенные возможности, отдельные axios/dotenv/Redis/UI-kit не добавлены. JSON Schema и логирование Fastify предоставляются выбранным серверным стеком. Зависимости установлены без install scripts; работоспособность нативных библиотек проверяется отдельно, а Linux-сборка не подменяется macOS-проверкой.

### Адресные исправления аудита

Начальное дерево содержало шесть Moderate-уведомлений, связанных с двумя транзитивными пакетами. В корневых overrides закреплены glob 14.0.6 и minimatch 11.0.9 только для уязвимого диапазона minimatch >=7.0.0 <11.0.1; совместимые старые ветки не заменяются без причины. Основания: [glob advisory](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4) и [minimatch advisory](https://github.com/advisories/GHSA-g3hv-75wg-m249).

Override glob меняет major транзитивного пакета: проверяются реальные потребители node-pg-migrate и js-beautify, API glob/globSync и editorconfig. Это не замена проверки миграций с БД на TASK-01. При обновлении родительских пакетов повторить аудит и совместимость; снять overrides, когда upstream явно использует исправленные версии. `audit fix --force` не применялся.

## Доступные команды

`npm ci` устанавливает зафиксированный граф; `.npmrc` запрещает lifecycle scripts. `npm run check` выполняет проверку документации, `npm ls --all` и формат декларативных настроек. `npm run format:check` проверяет формат, `npm run format` исправляет только перечисленные настройки; `npm run audit:dependencies` проверяет полный граф, включая dev-зависимости.

`npm run db:config` проверяет Compose через установленный Docker; `npm run db:up` запускает и ожидает готовности локальной БД; `npm run db:stop` останавливает её без удаления volume. Эти команды требуют Docker Engine с Compose v2 и корректного локального `.env`. Ни одна из них не выполняется как часть npm install/check. Сервисы автоматически не запускаются, удаления данных в scripts нет.

В IT-0017 добавлены `npm run dev:web`, `npm run build:web`, `npm run preview:web`, `npm run format:web:check`, `npm run format:web` и `npm run test:e2e`. Vite запускает только web на 127.0.0.1:5173, preview сборки — на 127.0.0.1:4173. Корневой `.env` не читается web-конфигурацией (`envDir: false`). Браузерные тесты запускаются последовательно с одним worker в установленном Google Chrome (`channel: chrome`); приложение открывается по локальному URL, при необходимости тестовый runner запускает Vite сам. Отдельный браузер Playwright не требуется для текущей конфигурации.

В `npm run check` включена проверка формата исходников web, браузерных тестов и Playwright-конфигурации. ESLint и Vitest пока не настроены; существование их пакетов не означает успешного lint/unit-набора. Команд запуска backend/worker, миграций и release ещё нет.

Для проверок Codex действует [порядок завершения рабочего сеанса](git-flow.md#завершение-рабочего-сеанса): временные процессы не оставляются после работы без явного поручения владельца. Ручные пользовательские сеансы запуска этим правилом не останавливаются.

## Системные зависимости и границы проверки

| Компонент | Подготовлено / состояние |
| --- | --- |
| Node.js / npm | Локально доступны 24.19.0 / 12.0.2; требования закреплены в manifests |
| PostgreSQL | Compose закрепляет официальный 18.7-bookworm по multi-platform digest; пароль обязателен, доступ только 127.0.0.1, volume соответствует PostgreSQL 18 |
| Docker / Compose / Linux VM | В текущей командной среде отсутствуют; конфигурация проверяется по официальной схеме, контейнеры не запущены |
| LibreOffice | Целевая ветка 26.8 из спецификации; локального soffice нет, установка и проверка внутри изолированного Linux-runner относятся к TASK-00 |
| Runner и шрифты | Rootless runtime, UID/GID, лимиты, сеть и конкретный набор/версии шрифтов ещё требуют эксперимента TASK-00; произвольные значения не подставлены |
| Браузерные проверки frontend | В IT-0017 использован установленный Google Chrome через Playwright; отдельные браузеры Playwright и Linux OS libraries не устанавливались |

Образ PostgreSQL: [официальные теги](https://hub.docker.com/_/postgres), [multi-platform manifest 18.7-bookworm](https://github.com/docker-library/repo-info/blob/master/repos/postgres/remote/18.7-bookworm.md). Volume монтируется в `/var/lib/postgresql`, как требует официальный образ PostgreSQL 18. Начальная учётная запись БД — локальный администратор для подготовки; перед подключением приложения на TASK-01 создать отдельную ограниченную роль, не использовать bootstrap-администратора в API/worker. Тестовая БД и отдельные роли пока не создавались.

TASK-00 и TASK-01 остаются незавершёнными. Запуск и сборка начального frontend проверены в IT-0017; реальная конвертация, транзакции очереди, сетевая изоляция runner и миграции не проверены. Фактические результаты подготовки сохраняются в [истории IT-0014](history/IT-0014-project-foundation.md).

## Начальная реализация frontend — IT-0017

Исторический раздел «Подготовленная структура» выше описывает IT-0014. Сейчас в `apps/web/src` добавлены app/router/layouts, страницы главной и входа, features auth/conversion, общие UI-компоненты и CSS-токены. Vite собирает SPA в `apps/web/dist`. Заглушки `/api-docs`, `/privacy`, регистрации, восстановления и кабинета явно сообщают об отсутствии реализации; неизвестный маршрут показывает 404.

Inter с кириллицей хранится локально в `apps/web/public/fonts/Inter-Variable.ttf` вместе с OFL-лицензией; источник — официальный каталог Google Fonts (`ofl/inter`). Значки перенесены из фактического макета Pixso, их геометрия сохранена. Светлая/тёмная палитры следуют настройке ОС, отдельного переключателя и хранения предпочтения пока нет.

Конфигурация форматов временно берётся из `src/shared/api/preview-formats.js` по ТЗ и API; при подключении backend заменить её на `GET /api/app/formats`. Идентификаторы направлений совпадают с API. Проверка расширения/MIME/размера в браузере — только UX, не проверка фактического содержимого. Выбранный File находится только в памяти вкладки и сохраняется между SPA-переходами; reload его сбрасывает. Форма входа валидирует поля, показывает/скрывает пароль, но не отправляет и не сохраняет credentials, не создаёт сессии. После нажатия показывает сообщение заглушки и очищает пароль.
