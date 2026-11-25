import { computed, shallowRef, ref } from 'vue'
import { formatBytes } from '../../shared/lib/format.js'
export { formatBytes } from '../../shared/lib/format.js'
import { previewFormats } from '../../shared/api/preview-formats.js'
import { demoApi } from '../../shared/api/demo-client.js'

// File objects exist only in this tab's memory: never URL, storage, or network.
const selectedFile = shallowRef(null)
const directionId = ref('jpg_to_png')
const selectionError = ref('')
const formats = ref(previewFormats)
const job = shallowRef(null)
const pending = ref(false)
const requestError = shallowRef(null)
let requestKey = null
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
  requestKey = null
  requestError.value = null
}
function removeFile() {
  if (pending.value || job.value) return
  selectedFile.value = null
  selectionError.value = ''
  requestKey = null
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
  requestKey = null
  requestError.value = null
}
export function clearConversionDraft() {
  epoch += 1
  selectedFile.value = null
  selectionError.value = ''
  requestError.value = null
  requestKey = null
  pending.value = false
  job.value = null
}
async function startConversion(saveToProfile) {
  if (!canContinue.value || pending.value || job.value) return
  const current = epoch
  pending.value = true
  requestError.value = null
  requestKey ||= crypto.randomUUID()
  try {
    const accepted = await demoApi.createJob(
      direction.value.id,
      saveToProfile,
      requestKey,
    )
    if (current === epoch) job.value = accepted
  } catch (error) {
    if (current === epoch) requestError.value = error
  } finally {
    if (current === epoch) pending.value = false
  }
}
export function useConversionDraft() {
  return {
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
