<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useConversionDraft, formatBytes } from './model.js'
import BaseButton from '../../shared/ui/BaseButton.vue'
import AppIcon from '../../shared/ui/AppIcon.vue'
import NoticeMessage from '../../shared/ui/NoticeMessage.vue'
const {
  selectedFile,
  direction,
  fileError,
  canContinue,
  selectFiles,
  removeFile,
  changeDirection,
} = useConversionDraft()
const router = useRouter()
const input = ref(null)
const dragging = ref(false)
const images = computed(() => direction.value.category === 'images')
function choose(event) {
  selectFiles(Array.from(event.target.files || []))
  event.target.value = ''
}
function drop(event) {
  dragging.value = false
  selectFiles(Array.from(event.dataTransfer.files))
}
function submit() {
  // Keep this guard even when the disabled button is bypassed by requestSubmit().
  // The future upload should use the selected File from the in-memory draft.
  if (!canContinue.value) return
  return router.push('/auth/login')
}
</script>

<template>
  <form
    class="converter-card panel"
    aria-label="Конвертер файлов"
    novalidate
    @submit.prevent="submit"
  >
    <div class="format-tabs" role="group" aria-label="Тип конвертации">
      <button
        type="button"
        :aria-pressed="images"
        @click="!images && changeDirection('jpg_to_png')"
      >
        Изображения
      </button>
      <button
        type="button"
        :aria-pressed="!images"
        @click="changeDirection('docx_to_pdf')"
      >
        Документы
      </button>
    </div>
    <label v-if="images" class="sr-only" for="conversion-direction"
      >Направление конвертации</label
    >
    <select
      v-if="images"
      id="conversion-direction"
      :value="direction.id"
      class="control"
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
          <BaseButton variant="secondary" @click="input.click()"
            >Заменить</BaseButton
          ><BaseButton variant="text" @click="removeFile">Убрать</BaseButton>
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
          @click="input.click()"
          >Выбрать файл</BaseButton
        >
      </template>
    </div>
    <NoticeMessage v-if="fileError" tone="danger">{{
      fileError
    }}</NoticeMessage>
    <p id="continue-help" class="caption secondary">
      Для запуска войдите. Выбранный файл останется в этой вкладке.
    </p>
    <BaseButton
      type="submit"
      class="full-width"
      :disabled="!canContinue"
      aria-describedby="continue-help"
      >Войти и продолжить</BaseButton
    >
    <p class="caption">
      Без сохранения результат доступен 1 час после готовности. Скачивание —
      только вам.
    </p>
  </form>
</template>
