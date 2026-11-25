import { computed, shallowRef, ref } from 'vue'
import { formatBytes } from '../../shared/lib/format.js'
export { formatBytes } from '../../shared/lib/format.js'
import { previewFormats } from '../../shared/api/preview-formats.js'
import {
  demo,
  demoApi,
  rememberPreviewJob,
} from '../../shared/api/demo-client.js'

// File objects exist only in this tab's memory: never URL, storage, or network.
const selectedFile = shallowRef(null)
const directionId = ref('jpg_to_png')
const selectionError = ref('')
const formats = ref(previewFormats)
const job = shallowRef(null)
const pending = ref(false)
const requestError = shallowRef(null)
const phase = ref('idle')
let attempt = null
let controller
const retryAt = ref(0)
let epoch = 0
const direction = computed(() =>
  formats.value.find((format) => format.id === directionId.value),
)

export function fileProblem(file, format) {
  if (!file) return 'Выберите один файл.'
  if (!format) return 'Выберите поддерживаемое направление конвертации.'
  if (file.size === 0) return 'Файл пуст. Выберите другой файл.'
  const extension = file.name.split('.').pop().toLowerCase()
  if (!format.extensions.includes(extension))
    return `Для направления ${format.label} нужен ${format.inputLabel}. Замените файл или верните прежнее направление.`
  if (
    file.type &&
    file.type !== 'application/octet-stream' &&
    !format.mimeTypes.includes(file.type)
  )
    return 'Тип файла не соответствует выбранному формату. Выберите другой файл.'
  if (file.size > format.maxInputBytes)
    return `Размер файла — ${formatBytes(file.size)} (${new Intl.NumberFormat('ru-RU').format(file.size)} байт). Допустимо до ${format.limitLabel}.`
  return ''
}

const fileError = computed(
  () =>
    selectionError.value ||
    (selectedFile.value
      ? fileProblem(selectedFile.value, direction.value)
      : ''),
)
const canContinue = computed(() => !!selectedFile.value && !fileError.value)
function selectFiles(files) {
  if (pending.value || job.value) return
  if (!files.length) return
  if (files.length !== 1) {
    selectionError.value =
      'Выберите один файл. Несколько файлов одновременно не поддерживаются.'
    return
  }
  selectedFile.value = files[0]
  selectionError.value = ''
  attempt = null
  requestError.value = null
}
function removeFile() {
  if (pending.value || job.value) return
  selectedFile.value = null
  selectionError.value = ''
  attempt = null
  requestError.value = null
}
function changeDirection(id) {
  if (pending.value || job.value) return
  if (!formats.value.some((format) => format.id === id)) {
    selectionError.value = 'Выберите поддерживаемое направление конвертации.'
    return
  }
  directionId.value = id
  selectionError.value = ''
  attempt = null
  requestError.value = null
}
export function clearConversionDraft() {
  epoch += 1
  controller?.abort()
  phase.value = 'idle'
  rememberPreviewJob(null)
  selectedFile.value = null
  selectionError.value = ''
  requestError.value = null
  attempt = null
  pending.value = false
  job.value = null
}
async function startConversion(saveToProfile) {
  if (
    !canContinue.value ||
    pending.value ||
    job.value ||
    Date.now() < retryAt.value
  )
    return
  const current = epoch
  pending.value = true
  phase.value = 'uploading'
  requestError.value = null
  attempt ||= {
    conversion: direction.value.id,
    save: saveToProfile === true,
    key: crypto.randomUUID(),
  }
  controller = new AbortController()
  try {
    const accepted = await demoApi.createJob(
      attempt.conversion,
      attempt.save,
      attempt.key,
      { signal: controller.signal },
    )
    if (current === epoch) acceptJob(accepted)
  } catch (error) {
    if (current === epoch) {
      phase.value = error.name === 'AbortError' ? 'upload-cancelled' : 'unknown'
      if (error.name !== 'AbortError') requestError.value = error
      retryAt.value = Date.now() + (error.retryAfter || 0) * 1000
    }
  } finally {
    if (current === epoch) pending.value = false
  }
}
function acceptJob(value) {
  job.value = value
  phase.value = 'accepted'
  requestError.value = null
  rememberPreviewJob(value.id)
}
function cancelUpload() {
  controller?.abort()
}
async function restoreJob() {
  if (!demo.enabled || !demo.viewer || job.value || pending.value) return
  const current = epoch
  pending.value = true
  phase.value = 'restoring'
  try {
    const value = demo.job
      ? await demoApi.job(demo.job.id)
      : (await demoApi.activeJobs())[0]
    if (current === epoch) {
      if (value) acceptJob(value)
      else {
        phase.value = 'idle'
        requestError.value = null
      }
    }
  } catch (error) {
    if (current === epoch) {
      requestError.value = error
      phase.value = 'unknown'
    }
  } finally {
    if (current === epoch) pending.value = false
  }
}
function temporaryConversion() {
  if (pending.value || job.value) return
  attempt = null
  retryAt.value = 0
  return startConversion(false)
}
export function useConversionDraft() {
  return {
    retryAt,
    phase,
    acceptJob,
    cancelUpload,
    restoreJob,
    temporaryConversion,
    resetConversion: clearConversionDraft,
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
  }
}
