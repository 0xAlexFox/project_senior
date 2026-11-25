<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useConversionDraft, formatBytes } from './model.js'
import ConversionJobCard from './ConversionJobCard.vue'
import BaseButton from '../../shared/ui/BaseButton.vue'
import AppIcon from '../../shared/ui/AppIcon.vue'
import NoticeMessage from '../../shared/ui/NoticeMessage.vue'
import BaseTabs from '../../shared/ui/BaseTabs.vue'
import { demo, demoApi, getPreviewJobId } from '../../shared/api/demo-client.js'
import { previewFormats } from '../../shared/api/preview-formats.js'
const {
  selectedFile,
  direction,
  fileError,
  canContinue,
  selectFiles,
  removeFile,
  changeDirection,
  formats,
  job,
  pending,
  requestError,
  startConversion,
  phase,
  restoreJob,
} = useConversionDraft()
const router = useRouter()
const route = useRoute()
const reloaded =
  performance.getEntriesByType('navigation')[0]?.type === 'reload'
const input = ref(null)
const dragging = ref(false)
const images = computed(() => direction.value.category === 'images')
const category = computed({
  get: () => direction.value.category,
  set: (value) =>
    changeDirection(value === 'images' ? 'jpg_to_png' : 'docx_to_pdf'),
})
const locked = computed(() => pending.value || !!job.value)
const configReady = ref(true)
const configError = ref('')
let configController
async function loadConfig() {
  configController?.abort()
  configController = new AbortController()
  const controller = configController
  if (!demo.enabled) {
    formats.value = previewFormats
    configReady.value = true
    configError.value = ''
    return
  }
  configReady.value = false
  configError.value = ''
  try {
    const response = await demoApi.formats({ signal: controller.signal })
    if (!controller.signal.aborted) {
      formats.value = response.formats
      configReady.value = true
    }
  } catch (error) {
    if (!controller.signal.aborted) configError.value = error.message
  }
}
onMounted(() => {
  loadConfig()
  if (demo.enabled && demo.viewer) {
    if (typeof route.query.job === 'string' && route.query.job === demo.job?.id)
      restoreJob({ clearFile: true })
    else if (getPreviewJobId()) restoreJob()
  }
})
watch(() => demo.enabled, loadConfig)
onBeforeUnmount(() => configController?.abort())
function choose(event) {
  selectFiles(Array.from(event.target.files || []))
  event.target.value = ''
}
function drop(event) {
  dragging.value = false
  selectFiles(Array.from(event.dataTransfer.files))
}
function submit() {
  if (!canContinue.value || locked.value || !configReady.value) return
  if (demo.enabled && demo.viewer) return startConversion(demo.saveToProfile)
  return router.push('/auth/login')
}
</script>

<template>
  <ConversionJobCard v-if="job || pending || phase !== 'idle'" />
  <form
    v-else
    class="converter-card panel"
    aria-label="Конвертер файлов"
    novalidate
    @submit.prevent="submit"
  >
    <NoticeMessage v-if="reloaded && !selectedFile"
      >После перезагрузки исходный файл нужно выбрать заново.</NoticeMessage
    >
    <BaseTabs
      id="conversion-tools"
      v-model="category"
      label="Тип конвертации"
      panel-id="conversion-panel"
      :disabled="locked"
      :options="[
        { value: 'images', label: 'Изображения' },
        { value: 'documents', label: 'Документы' },
      ]"
    />
    <div
      id="conversion-panel"
      class="stack"
      role="tabpanel"
      :aria-labelledby="`conversion-tools-${category}`"
    >
      <NoticeMessage v-if="configError" tone="danger"
        >{{ configError
        }}<BaseButton variant="text" @click="loadConfig"
          >Повторить загрузку настроек</BaseButton
        ></NoticeMessage
      >
      <p v-if="!configReady && !configError" role="status" class="caption">
        Загружаем учебные настройки…
      </p>
      <label v-if="images" class="sr-only" for="conversion-direction"
        >Направление конвертации</label
      >
      <select
        v-if="images"
        id="conversion-direction"
        :value="direction.id"
        class="control"
        :disabled="locked"
        @change="changeDirection($event.target.value)"
      >
        <option value="jpg_to_png">JPG → PNG</option>
        <option value="png_to_jpg">PNG → JPG</option>
      </select>
      <p v-else class="control fixed-direction">DOCX → PDF</p>
      <NoticeMessage v-if="direction.warning" tone="warning">{{
        direction.warning
      }}</NoticeMessage>
      <input
        ref="input"
        class="sr-only"
        type="file"
        tabindex="-1"
        :accept="direction.accept"
        aria-label="Файл для конвертации"
        :disabled="locked"
        @change="choose"
      />
      <div
        class="dropzone"
        :class="{ 'is-dragging': dragging, 'has-error': fileError }"
        @dragover.prevent="dragging = true"
        @dragleave.self="dragging = false"
        @drop.prevent="drop"
      >
        <template v-if="selectedFile">
          <AppIcon name="file" :size="28" />
          <p class="file-name">{{ selectedFile.name }}</p>
          <p class="caption">
            {{ formatBytes(selectedFile.size) }} · {{ direction.label }}
          </p>
          <div class="file-actions">
            <BaseButton
              variant="secondary"
              :disabled="locked"
              @click="input.click()"
              >Заменить</BaseButton
            ><BaseButton variant="text" :disabled="locked" @click="removeFile"
              >Убрать</BaseButton
            >
          </div>
        </template>
        <template v-else>
          <AppIcon name="upload" :size="32" />
          <p>
            <span v-if="dragging">Отпустите файл</span
            ><span v-else class="desktop-drop-copy"
              >Перетащите один файл сюда</span
            ><span v-if="!dragging" class="mobile-drop-copy"
              >Выберите один файл</span
            >
          </p>
          <p class="caption">
            {{ direction.inputLabel }} · до {{ direction.limitLabel }}
          </p>
          <BaseButton
            variant="secondary"
            class="full-width"
            :disabled="locked"
            @click="input.click()"
            >Выбрать файл</BaseButton
          >
        </template>
      </div>
      <NoticeMessage v-if="fileError" tone="danger">{{
        fileError
      }}</NoticeMessage>
    </div>
    <p id="continue-help" class="caption secondary">
      <template v-if="demo.enabled && demo.viewer"
        >Сохранять результат в профиле:
        {{ demo.saveToProfile ? 'включено' : 'выключено' }}.
        <RouterLink to="/account">Изменить в кабинете</RouterLink>. Учебный
        запуск не отправляет исходный файл.</template
      >
      <template v-else
        >Для запуска войдите. Выбранный файл останется в этой вкладке.</template
      >
    </p>
    <BaseButton
      type="submit"
      class="full-width"
      :disabled="!canContinue || locked || !configReady"
      :loading="pending"
      aria-describedby="continue-help"
      >{{
        demo.enabled && demo.viewer ? 'Конвертировать' : 'Войти и продолжить'
      }}</BaseButton
    >
    <NoticeMessage v-if="requestError" tone="danger">{{
      requestError.message
    }}</NoticeMessage>
    <NoticeMessage v-if="job"
      >Учебный ответ: задача принята, в очереди. Исходный файл не
      отправлялся.</NoticeMessage
    >
    <p class="caption">
      Без сохранения результат доступен 1 час после готовности. Скачивание —
      только вам.
    </p>
  </form>
</template>
