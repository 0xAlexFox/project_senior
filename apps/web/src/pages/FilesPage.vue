<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { demo, demoApi } from '../shared/api/demo-client.js'
import { normalizeFileQuery } from '../shared/api/file-query.js'
import { useDemoResource } from '../shared/api/use-demo-resource.js'
import {
  formatBytes,
  formatDate,
  startDemoDownload,
} from '../shared/lib/format.js'
import InputField from '../shared/ui/InputField.vue'
import SelectField from '../shared/ui/SelectField.vue'
import BaseButton from '../shared/ui/BaseButton.vue'
import BaseDialog from '../shared/ui/BaseDialog.vue'
import QuotaDisplay from '../shared/ui/QuotaDisplay.vue'
import LoadingState from '../shared/ui/LoadingState.vue'
import EmptyState from '../shared/ui/EmptyState.vue'
import NoticeMessage from '../shared/ui/NoticeMessage.vue'
const route = useRoute(),
  router = useRouter()
const initial = normalizeFileQuery(route.query)
const format = ref(initial.format),
  source = ref(initial.source),
  sort = ref(initial.sort),
  search = ref(''),
  query = ref('')
const selected = ref(null),
  busy = ref(''),
  writeError = ref(''),
  message = ref(''),
  heading = ref(null)
import { useRetryDelay } from '../shared/api/use-retry-delay.js'
const { remaining: writeRetry, apply: delayWrite } = useRetryDelay()
const controller = new AbortController()
let debounce
const { data, error, loading, load, retryIn } = useDemoResource(
  async (options) => {
    const result = await demoApi.searchFiles(
      { ...normalizeFileQuery(route.query), query: query.value },
      options,
    )
    if (
      !options.signal.aborted &&
      result.page !== normalizeFileQuery(route.query).page
    )
      await router.replace({ query: urlQuery(result.page) })
    return result
  },
)
const pages = computed(() =>
  Math.max(1, Math.ceil((data.value?.total || 0) / 20)),
)
const searchError = computed(() =>
  Array.from(search.value).length > 200 ? 'Поиск: не более 200 символов.' : '',
)
function urlQuery(page = 1) {
  return {
    ...(format.value ? { format: format.value } : {}),
    ...(source.value ? { source: source.value } : {}),
    ...(sort.value === 'oldest' ? { sort: 'oldest' } : {}),
    ...(page > 1 ? { page: String(page) } : {}),
  }
}
async function navigate(page = 1) {
  const next = urlQuery(page)
  if (JSON.stringify(next) === JSON.stringify(route.query)) await load()
  else await router.replace({ query: next })
}
watch(
  () => route.query,
  () => {
    const value = normalizeFileQuery(route.query)
    format.value = value.format
    source.value = value.source
    sort.value = value.sort
    load()
  },
)
watch(search, () => {
  clearTimeout(debounce)
  debounce = setTimeout(() => {
    if (searchError.value) return
    query.value = search.value
    navigate()
  }, 300)
})
function selectDelete(file) {
  selected.value = file
  writeError.value = ''
}
function closeDelete() {
  if (!busy.value) {
    selected.value = null
    writeError.value = ''
  }
}
async function remove() {
  if (busy.value || writeRetry.value || !selected.value) return
  busy.value = 'delete'
  writeError.value = ''
  message.value = ''
  const id = selected.value.id
  const index = data.value.items.findIndex((file) => file.id === id)
  try {
    await demoApi.deleteFile(id, { signal: controller.signal })
    if (controller.signal.aborted) return
    selected.value = null
    await load()
    if (controller.signal.aborted) return
    message.value = 'Учебный файл удалён. Доступ к нему закрыт.'
    await nextTick()
    const next = data.value?.items[Math.min(index, data.value.items.length - 1)]
    const focusTarget =
      (next && document.getElementById('delete-' + next.id)) || heading.value
    focusTarget?.focus()
  } catch (failure) {
    if (!controller.signal.aborted) {
      delayWrite(failure)
      writeError.value = failure.message
    }
  } finally {
    if (!controller.signal.aborted) busy.value = ''
  }
}
async function download(file) {
  if (busy.value || writeRetry.value) return
  busy.value = file.id
  writeError.value = ''
  message.value = ''
  try {
    const result = await demoApi.fileDownload(file.id, {
      signal: controller.signal,
    })
    if (!controller.signal.aborted) {
      startDemoDownload(result)
      message.value = 'Скачивание независимого DEMO-образца передано браузеру.'
    }
  } catch (failure) {
    if (!controller.signal.aborted) {
      delayWrite(failure)
      writeError.value = failure.message
    }
  } finally {
    if (!controller.signal.aborted) busy.value = ''
  }
}
onBeforeUnmount(() => {
  clearTimeout(debounce)
  controller.abort()
  search.value = ''
  query.value = ''
  selected.value = null
})
</script>
<template>
  <section class="stack files-page">
    <h1 ref="heading" tabindex="-1">Мои файлы</h1>
    <p class="secondary">Сохранённые результаты конвертации</p>
    <NoticeMessage v-if="!demo.enabled || !demo.viewer"
      >Список пока не подключён. Включите учебные ответы.
      <RouterLink to="/auth/login">Войти</RouterLink></NoticeMessage
    >
    <QuotaDisplay v-if="data" :quota="data.quota" />
    <InputField
      id="file-search"
      v-model="search"
      label="Поиск по имени"
      :error="searchError"
      :disabled="!!busy || !!writeRetry"
      hint="Текст поиска остаётся в этой вкладке и не попадает в адрес страницы."
      type="search"
      maxlength="400"
      autocomplete="off"
    />
    <div class="file-filters">
      <SelectField
        id="file-format"
        v-model="format"
        label="Формат"
        :disabled="!!busy || !!writeRetry"
        :options="[
          { value: '', label: 'Все форматы' },
          ...['png', 'jpg', 'pdf'].map((value) => ({
            value,
            label: value.toUpperCase(),
          })),
        ]"
        @update:model-value="navigate(1)"
      />
      <SelectField
        id="file-source"
        v-model="source"
        label="Источник"
        :disabled="!!busy || !!writeRetry"
        :options="[
          { value: '', label: 'Сайт и API' },
          { value: 'web', label: 'Сайт' },
          { value: 'api', label: 'API' },
        ]"
        @update:model-value="navigate(1)"
      />
      <SelectField
        id="file-sort"
        v-model="sort"
        label="Сортировка"
        :disabled="!!busy || !!writeRetry"
        :options="[
          { value: 'newest', label: 'Сначала новые' },
          { value: 'oldest', label: 'Сначала старые' },
        ]"
        @update:model-value="navigate(1)"
      />
    </div>
    <LoadingState v-if="loading" />
    <NoticeMessage v-if="error" tone="danger"
      >{{ error }}
      <BaseButton variant="text" :disabled="!!retryIn" @click="load"
        >Повторить загрузку файлов</BaseButton
      ></NoticeMessage
    >
    <NoticeMessage v-if="writeError && !selected" tone="danger">{{
      writeError
    }}</NoticeMessage>
    <p v-if="message" role="status">{{ message }}</p>
    <template v-if="data && !loading && !error">
      <div v-if="data.items.length" class="panel workspace-panel file-list">
        <table>
          <caption class="sr-only">
            Учебные сохранённые файлы
          </caption>
          <thead>
            <tr>
              <th scope="col">Имя</th>
              <th scope="col">Формат</th>
              <th scope="col">Размер</th>
              <th scope="col">Дата</th>
              <th scope="col">Источник</th>
              <th scope="col">Действия</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="file in data.items" :key="file.id">
              <th scope="row" class="file-name">{{ file.fileName }}</th>
              <td data-label="Формат">{{ file.format.toUpperCase() }}</td>
              <td data-label="Размер">{{ formatBytes(file.sizeBytes) }}</td>
              <td data-label="Дата">
                {{ formatDate(file.createdAt, demo.profile.timeZone) }}
              </td>
              <td data-label="Источник">
                {{ file.source === 'web' ? 'Сайт' : 'API' }}
              </td>
              <td>
                <div class="actions">
                  <BaseButton
                    :disabled="!!busy || !!writeRetry"
                    :loading="busy === file.id"
                    :aria-label="'Скачать ' + file.fileName"
                    @click="download(file)"
                    >Скачать</BaseButton
                  ><BaseButton
                    :id="'delete-' + file.id"
                    variant="text"
                    :disabled="!!busy || !!writeRetry"
                    :aria-label="'Удалить ' + file.fileName"
                    @click="selectDelete(file)"
                    >Удалить</BaseButton
                  >
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <EmptyState
        v-else
        :title="
          query || format || source
            ? 'Ничего не найдено'
            : 'Сохранённых файлов пока нет'
        "
        description="Измените фильтры или начните новую конвертацию."
        ><RouterLink to="/" class="button button-secondary"
          >Конвертировать файл</RouterLink
        ></EmptyState
      >
      <nav v-if="data.total" aria-label="Страницы файлов" class="actions">
        <BaseButton
          variant="secondary"
          :disabled="data.page <= 1 || !!busy"
          @click="navigate(data.page - 1)"
          >Назад</BaseButton
        ><span>Страница {{ data.page }} из {{ pages }} · по 20 файлов</span
        ><BaseButton
          variant="secondary"
          :disabled="data.page >= pages || !!busy"
          @click="navigate(data.page + 1)"
          >Вперёд</BaseButton
        >
      </nav>
    </template>
    <p class="caption">
      Скачивается самостоятельный DEMO-образец. Реальное хранение и конвертация
      не подключены.
    </p>
    <BaseDialog
      :open="!!selected"
      id="delete-file"
      title="Удалить файл?"
      :description="
        selected
          ? '«' +
            selected.fileName +
            '» станет недоступен сразу. Вернуть его через интерфейс нельзя.'
          : ''
      "
      confirm-label="Удалить файл"
      :busy="busy === 'delete'"
      :danger="true"
      :confirm-disabled="!!writeRetry"
      :error="writeError"
      @close="closeDelete"
      @confirm="remove"
    />
  </section>
</template>
<style scoped>
.files-page {
  gap: 24px;
}
.file-filters {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}
.file-list table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  font-size: 14px;
}
.file-list th,
.file-list td {
  text-align: left;
  padding: 16px 8px;
  overflow-wrap: anywhere;
  vertical-align: middle;
  border-bottom: 1px solid var(--color-border);
}
.file-list thead th {
  font-size: 12px;
  color: var(--color-text-secondary);
  font-weight: 400;
}
.file-list th:first-child {
  width: 24%;
}
.file-list th:last-child {
  width: 24%;
}
.file-list .actions {
  gap: 8px;
}
.file-list .button {
  padding: 10px 12px;
}
@media (max-width: 900px) {
  .file-filters {
    grid-template-columns: 1fr;
  }
  .file-list table,
  .file-list tbody,
  .file-list tr,
  .file-list th,
  .file-list td {
    display: block;
    width: 100%;
  }
  .file-list thead {
    display: none;
  }
  .file-list tr {
    padding: 16px 0;
    border-bottom: 1px solid var(--color-border);
  }
  .file-list th,
  .file-list td {
    padding: 6px 0;
    border: 0;
  }
  .file-list td[data-label] {
    display: grid;
    grid-template-columns: 80px minmax(0, 1fr);
    gap: 8px;
  }
  .file-list td[data-label]::before {
    content: attr(data-label);
    color: var(--color-text-secondary);
  }
  .file-list th:first-child,
  .file-list th:last-child {
    width: 100%;
  }
}
</style>
