<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { useConversionDraft } from './model.js'
import { demo, demoApi, getDemoQuota } from '../../shared/api/demo-client.js'
import {
  formatBytes,
  formatDate,
  startDemoDownload,
} from '../../shared/lib/format.js'
import BaseButton from '../../shared/ui/BaseButton.vue'
import NoticeMessage from '../../shared/ui/NoticeMessage.vue'
import ProgressIndicator from '../../shared/ui/ProgressIndicator.vue'
import QuotaDisplay from '../../shared/ui/QuotaDisplay.vue'
import AppIcon from '../../shared/ui/AppIcon.vue'
const {
  retryAt,
  job,
  pending,
  phase,
  selectedFile,
  direction,
  requestError,
  startConversion,
  cancelUpload,
  restoreJob,
  temporaryConversion,
  resetConversion,
  acceptJob,
} = useConversionDraft()
import { useRetryDelay } from '../../shared/api/use-retry-delay.js'
const { remaining: actionRetry, apply: delayAction } = useRetryDelay()
const heading = ref(null)
const busy = ref('')
const error = ref(null)
const message = ref('')
const now = ref(Date.now())
const finished = computed(() =>
  ['succeeded', 'failed', 'cancelled'].includes(job.value?.status),
)
const title = computed(
  () =>
    ({
      queued: 'В очереди',
      running: 'Обработка',
      succeeded: 'Готово',
      failed: 'Не удалось конвертировать',
      cancelled: 'Задача отменена',
    })[job.value?.status] ||
    (phase.value === 'restoring'
      ? 'Восстанавливаем статус'
      : pending.value
        ? 'Учебная передача'
        : 'Принятие задачи не подтверждено'),
)
const available = computed(
  () =>
    job.value?.result?.available &&
    (!job.value.result.expiresAt ||
      Date.parse(job.value.result.expiresAt) > now.value),
)
let timer,
  clock,
  controller,
  disposed = false,
  failures = 0
function schedule() {
  clearTimeout(timer)
  if (!disposed && !document.hidden && job.value && !finished.value)
    timer = setTimeout(
      refresh,
      failures ? Math.min(10000, failures * 5000) : 2000,
    )
}
async function refresh() {
  clearTimeout(timer)
  if (!job.value || busy.value || actionRetry.value) return schedule()
  controller?.abort()
  controller = new AbortController()
  const request = controller
  const id = job.value.id
  busy.value = 'refresh'
  try {
    const value = await demoApi.job(id, { signal: request.signal })
    if (!disposed && job.value?.id === id) {
      acceptJob(value)
      error.value = null
      failures = 0
    }
  } catch (failure) {
    if (!disposed && !request.signal.aborted) {
      delayAction(failure)
      error.value = failure
      failures++
    }
  } finally {
    if (!disposed) {
      busy.value = ''
      schedule()
    }
  }
}
async function cancel() {
  if (busy.value || actionRetry.value || !job.value || finished.value) return
  clearTimeout(timer)
  busy.value = 'cancel'
  const id = job.value.id
  try {
    const value = await demoApi.cancelJob(id)
    if (!disposed && job.value?.id === id) {
      acceptJob(value)
      error.value = null
    }
  } catch (failure) {
    if (!disposed) {
      delayAction(failure)
      error.value = failure
    }
  } finally {
    if (!disposed) {
      busy.value = ''
      await refresh()
    }
  }
}
async function download() {
  if (busy.value || actionRetry.value || !available.value) return
  busy.value = 'download'
  const id = job.value.id
  try {
    const file = await demoApi.jobDownload(id)
    if (!disposed && job.value?.id === id && available.value) {
      startDemoDownload(file)
      message.value = 'Скачивание учебного образца передано браузеру.'
    }
  } catch (failure) {
    if (!disposed) {
      delayAction(failure)
      error.value = failure
    }
  } finally {
    if (!disposed) {
      busy.value = ''
      await refresh()
    }
  }
}
function visibility() {
  clearTimeout(timer)
  if (document.hidden) controller?.abort()
  else if (!finished.value) refresh()
}
watch(() => job.value?.id, schedule)
onMounted(() => {
  heading.value?.focus()
  schedule()
  clock = setInterval(() => {
    now.value = Date.now()
  }, 1000)
  document.addEventListener('visibilitychange', visibility)
})
onBeforeUnmount(() => {
  disposed = true
  clearTimeout(timer)
  clearInterval(clock)
  controller?.abort()
  document.removeEventListener('visibilitychange', visibility)
})
</script>
<template>
  <section
    class="converter-card panel stack conversion-job"
    aria-label="Задача конвертации"
    aria-live="polite"
  >
    <h2 ref="heading" class="panel-title" tabindex="-1">{{ title }}</h2>
    <p class="caption">
      Учебные ответы. Исходный файл не отправлялся и не конвертировался.
    </p>
    <div class="job-file">
      <AppIcon name="file" :size="28" />
      <div class="stack">
        <p class="file-name">
          {{
            selectedFile?.name || 'Исходный файл недоступен после перезагрузки'
          }}
        </p>
        <p class="caption">
          {{
            {
              jpg_to_png: 'JPG → PNG',
              png_to_jpg: 'PNG → JPG',
              docx_to_pdf: 'DOCX → PDF',
            }[job?.conversion] || direction.label
          }}
        </p>
      </div>
    </div>
    <template v-if="!job">
      <ProgressIndicator
        v-if="pending"
        :label="
          phase === 'restoring'
            ? 'Ожидание учебного статуса'
            : 'Ожидание учебного ответа — передача байт не выполняется'
        "
      />
      <p v-else>
        Отмена ожидания не подтверждает отмену принятой задачи. Проверьте статус
        перед новым запуском.
      </p>
      <NoticeMessage v-if="requestError" tone="danger"
        >{{ requestError.message }}
        <span v-if="requestError.retryAfter"
          >Повтор доступен через {{ requestError.retryAfter }} с.</span
        ></NoticeMessage
      >
      <BaseButton
        v-if="pending && phase === 'uploading'"
        variant="secondary"
        @click="cancelUpload"
        >Прервать передачу</BaseButton
      >
      <template v-if="!pending">
        <BaseButton variant="secondary" @click="restoreJob"
          >Проверить принятую задачу</BaseButton
        >
        <BaseButton
          v-if="selectedFile"
          :disabled="now < retryAt"
          @click="startConversion(demo.saveToProfile)"
          >Повторить тот же запрос</BaseButton
        >
        <template v-if="requestError?.code === 'STORAGE_QUOTA_EXCEEDED'">
          <QuotaDisplay :quota="getDemoQuota()" />
          <BaseButton variant="secondary" @click="temporaryConversion"
            >Новая задача без сохранения</BaseButton
          >
        </template>
        <BaseButton variant="text" @click="resetConversion"
          >Вернуться к выбору файла</BaseButton
        >
      </template>
    </template>
    <template v-else>
      <p class="caption">
        Создана: {{ formatDate(job.createdAt, demo.profile.timeZone) }}.
        {{
          job.saveToProfile
            ? 'С сохранением в профиле.'
            : 'Без сохранения в профиле.'
        }}
      </p>
      <ProgressIndicator
        v-if="!finished"
        :label="
          job.status === 'queued'
            ? 'Задача принята, в очереди'
            : 'Конвертируем файл'
        "
      />
      <NoticeMessage v-if="error" tone="danger"
        >{{ error.message }} Последний подтверждённый статус сохранён.
        <span v-if="error.requestId"
          >Код запроса: {{ error.requestId }}.</span
        ></NoticeMessage
      >
      <NoticeMessage v-if="job.error" tone="danger"
        >{{ job.error.message }} {{ job.error.code }} ·
        {{ job.error.requestId }}. Выберите другой файл или
        направление.</NoticeMessage
      >
      <template v-if="job.status === 'succeeded'">
        <p>
          {{ job.result.fileName }} · {{ formatBytes(job.result.sizeBytes) }}
        </p>
        <p v-if="job.result.expiresAt" class="caption">
          Доступен до
          {{ formatDate(job.result.expiresAt, demo.profile.timeZone) }}.
        </p>
        <NoticeMessage v-if="!available" tone="warning"
          >Результат удалён или срок доступа истёк. Статус задачи остаётся
          «Готово».</NoticeMessage
        >
        <BaseButton
          :disabled="!available || !!busy || !!actionRetry"
          :loading="busy === 'download'"
          @click="download"
          >Скачать учебный образец</BaseButton
        >
        <p class="caption">
          Это самостоятельный файл DEMO, его содержимое не связано с выбранным
          исходником.
        </p>
        <RouterLink v-if="job.saveToProfile" to="/account/files"
          >Открыть мои файлы</RouterLink
        >
      </template>
      <BaseButton
        v-if="!finished"
        variant="secondary"
        :disabled="!!busy || !!actionRetry"
        :loading="busy === 'cancel'"
        @click="cancel"
        >{{ busy === 'cancel' ? 'Отменяем…' : 'Отменить задачу' }}</BaseButton
      >
      <BaseButton
        variant="text"
        :disabled="!!busy || !!actionRetry"
        @click="refresh"
        >Обновить статус</BaseButton
      >
      <BaseButton
        v-if="finished"
        variant="secondary"
        :disabled="!!busy || !!actionRetry"
        @click="resetConversion"
        >Конвертировать другой файл</BaseButton
      >
    </template>
    <p v-if="message" role="status">{{ message }}</p>
  </section>
</template>
<style scoped>
.job-file {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: var(--color-surface-raised);
  border-radius: 12px;
  min-width: 0;
}
.job-file > div {
  min-width: 0;
  gap: 4px;
}
.conversion-job {
  overflow-wrap: anywhere;
}
</style>
