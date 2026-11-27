<script setup>
import { useTheme } from './theme.js'
const { preference, message, setTheme } = useTheme()
</script>
<template>
  <div class="appearance-bar container">
    <div class="appearance-control">
      <label for="appearance-theme"
        >Тема<span class="sr-only"> оформления</span></label
      >
      <select
        id="appearance-theme"
        :value="preference"
        class="control"
        @change="setTheme($event.target.value)"
      >
        <option value="system">Системная</option>
        <option value="light">Светлая</option>
        <option value="dark">Тёмная</option>
      </select>
    </div>
    <p v-if="message" class="caption" role="status">{{ message }}</p>
  </div>
</template>
<style scoped>
.appearance-bar {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
  margin-top: 12px;
}
.appearance-control {
  display: flex;
  align-items: center;
  gap: 12px;
  max-width: 100%;
  font-size: var(--font-label);
}
.appearance-control label {
  flex-shrink: 0;
}
.appearance-control select {
  width: auto;
  min-width: 0;
  min-height: 44px;
  border-radius: var(--radius-pill);
  padding-inline: 16px 32px;
}
.appearance-bar p {
  max-width: 440px;
  text-align: right;
  overflow-wrap: anywhere;
}
</style>
