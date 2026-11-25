<script setup>
import { onBeforeUnmount, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { demo, demoApi } from '../shared/api/demo-client.js'
import { useDemoResource } from '../shared/api/use-demo-resource.js'
import { formatDate } from '../shared/lib/format.js'
import BaseButton from '../shared/ui/BaseButton.vue'
import SwitchControl from '../shared/ui/SwitchControl.vue'
import QuotaDisplay from '../shared/ui/QuotaDisplay.vue'
import LoadingState from '../shared/ui/LoadingState.vue'
import EmptyState from '../shared/ui/EmptyState.vue'
import NoticeMessage from '../shared/ui/NoticeMessage.vue'
const { data, error, loading, load } = useDemoResource(async (options) => {
  const [profile, jobs] = await Promise.all([
    demoApi.profile(options),
    demoApi.activeJobs(options),
  ])
  return { profile, jobs }
})
const saving = ref(false),
  saveError = ref(''),
  message = ref('')
const controller = new AbortController()
async function changeSaving(value) {
  if (saving.value || !data.value) return
  saving.value = true
  saveError.value = ''
  message.value = ''
  try {
    const profile = await demoApi.updateSaving(
      value,
      data.value.profile.version,
      { signal: controller.signal },
    )
    if (!controller.signal.aborted && data.value) {
      data.value = { ...data.value, profile }
      message.value = 'Учебная настройка сохранена.'
    }
  } catch (failure) {
    if (!controller.signal.aborted) {
      saveError.value = failure.message
      if (failure.code === 'SETTINGS_CONFLICT') {
        await load()
        saveError.value =
          'Настройка изменена в другом окне. Показано актуальное значение; проверьте его и повторите при необходимости.'
      }
    }
  } finally {
    if (!controller.signal.aborted) saving.value = false
  }
}
onBeforeUnmount(() => controller.abort())
</script>
<template>
  <section class="stack account-overview">
    <h1>Личный кабинет</h1>
    <p class="secondary">
      Здравствуйте, {{ data?.profile.displayName || 'учебный пользователь' }}.
      Все ваши файлы и задачи — в одном месте.
    </p>
    <RouterLink to="/" class="button button-primary overview-convert"
      >Конвертировать файл</RouterLink
    >
    <NoticeMessage v-if="!demo.enabled || !demo.viewer"
      >Кабинет пока не подключён. Включите учебные ответы или
      <RouterLink to="/auth/login">перейдите ко входу</RouterLink
      >.</NoticeMessage
    >
    <LoadingState v-if="loading" />
    <NoticeMessage v-if="error" tone="danger"
      >{{ error }}
      <BaseButton variant="text" @click="load"
        >Повторить загрузку кабинета</BaseButton
      ></NoticeMessage
    >
    <template v-if="data">
      <section class="panel workspace-panel stack">
        <h2 class="panel-title">Сохранение результатов</h2>
        <SwitchControl
          id="save-results"
          label="Сохранять новые результаты в профиле"
          :checked="data.profile.saveToProfile"
          :busy="saving"
          :disabled="loading"
          hint="Изменение действует только для новых задач. Уже сохранённые файлы останутся."
          @change="changeSaving"
        />
        <NoticeMessage v-if="saveError" tone="danger">{{
          saveError
        }}</NoticeMessage>
        <p v-if="message" role="status">{{ message }}</p>
      </section>
      <QuotaDisplay :quota="data.profile.quota" />
      <section class="panel workspace-panel stack">
        <h2 class="panel-title">Активные задачи</h2>
        <template v-if="data.jobs.length">
          <div
            v-for="job in data.jobs"
            :key="job.id"
            class="panel workspace-panel stack"
          >
            <p>
              {{
                {
                  jpg_to_png: 'JPG → PNG',
                  png_to_jpg: 'PNG → JPG',
                  docx_to_pdf: 'DOCX → PDF',
                }[job.conversion]
              }}
              · {{ job.status === 'queued' ? 'В очереди' : 'Обработка' }}
            </p>
            <p class="caption">
              {{ formatDate(job.createdAt, data.profile.timeZone) }}
            </p>
            <RouterLink to="/" class="button button-secondary"
              >Открыть задачу</RouterLink
            >
          </div>
        </template>
        <EmptyState
          v-else
          title="Активных задач нет"
          description="Начните с конвертации одного файла."
        />
      </section>
    </template>
  </section>
</template>
<style scoped>
.account-overview {
  gap: 24px;
}
.overview-convert {
  align-self: flex-start;
}
</style>
