<script setup>
import { computed } from 'vue'
import { formatBytes } from '../lib/format.js'
const props = defineProps({ quota: { type: Object, required: true } })
const used = computed(() =>
  Math.min(
    100,
    Math.max(0, (props.quota.usedBytes / props.quota.maxBytes) * 100),
  ),
)
const reserved = computed(() =>
  Math.min(
    100 - used.value,
    Math.max(0, (props.quota.reservedBytes / props.quota.maxBytes) * 100),
  ),
)
</script>
<template>
  <section class="panel workspace-panel stack quota-display">
    <h2 class="panel-title">Хранилище</h2>
    <p>
      {{ quota.usedFiles }} из {{ quota.maxFiles }} файлов ·
      {{ formatBytes(quota.usedBytes) }} из {{ formatBytes(quota.maxBytes) }}
    </p>
    <div class="quota-meter" aria-hidden="true">
      <span :style="{ width: `${used}%` }" /><span
        :style="{ width: `${reserved}%` }"
      />
    </div>
    <p class="caption">
      Зарезервировано: {{ quota.reservedFiles }} файлов ·
      {{ formatBytes(quota.reservedBytes) }}. Доступно:
      {{
        formatBytes(
          Math.max(0, quota.maxBytes - quota.usedBytes - quota.reservedBytes),
        )
      }}.
    </p>
  </section>
</template>
