import { computed, shallowRef, ref } from 'vue'
import { previewFormats } from '../../shared/api/preview-formats.js'

// File objects exist only in this tab's memory: never URL, storage, or network.
const selectedFile = shallowRef(null)
const directionId = ref('jpg_to_png')
const selectionError = ref('')
const direction = computed(() =>
  previewFormats.find((format) => format.id === directionId.value),
)

export function fileProblem(file, format) {
  if (!file) return 'Выберите один файл.'
  if (file.size === 0) return 'Файл пуст. Выберите другой файл.'
  const extension = file.name.split('.').pop().toLowerCase()
  if (!format.extensions.includes(extension))
    return `Для направления ${format.label} нужен ${format.inputLabel}. Замените файл или верните прежнее направление.`
  if (file.type && !format.mimeTypes.includes(file.type))
    return 'Тип файла не соответствует выбранному формату. Выберите другой файл.'
  if (file.size > format.maxInputBytes)
    return `Размер файла — ${formatBytes(file.size)} (${new Intl.NumberFormat('ru-RU').format(file.size)} байт). Допустимо до ${format.limitLabel}.`
  return ''
}
export function formatBytes(bytes) {
  return bytes < 1024 * 1024
    ? `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 }).format(bytes / 1024)} KiB`
    : `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(bytes / (1024 * 1024))} MiB`
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
  if (!files.length) return
  if (files.length !== 1) {
    selectionError.value =
      'Выберите один файл. Несколько файлов одновременно не поддерживаются.'
    return
  }
  selectedFile.value = files[0]
  selectionError.value = ''
}
function removeFile() {
  selectedFile.value = null
  selectionError.value = ''
}
function changeDirection(id) {
  directionId.value = id
  selectionError.value = ''
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
  }
}
