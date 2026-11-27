<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppIcon from '../../shared/ui/AppIcon.vue'
import { useTheme } from './theme.js'
const { preference, resolvedTheme, message, setTheme } = useTheme()
const menu = ref(null)
const route = useRoute()
const dark = computed(() => resolvedTheme.value === 'dark')
const modeLabel = computed(() =>
  preference.value === 'system' ? 'Тема: системная' : 'Тема: выбрана вручную',
)
function closeMenu(restoreFocus = false) {
  if (!menu.value) return
  menu.value.open = false
  if (restoreFocus) menu.value.querySelector('summary')?.focus()
}
function followSystem() {
  setTheme('system')
  closeMenu(true)
}
function dismiss(event) {
  if (!event.target.closest('.theme-selector')) closeMenu()
}
onMounted(() => document.addEventListener('pointerdown', dismiss))
onBeforeUnmount(() => document.removeEventListener('pointerdown', dismiss))
watch(message, (value) => {
  if (value && menu.value) menu.value.open = true
})
watch(
  () => route.fullPath,
  () => closeMenu(),
)
</script>
<template>
  <div class="theme-selector" @keydown.esc.stop="closeMenu(true)">
    <button
      class="theme-switch"
      type="button"
      role="switch"
      aria-label="Тёмная тема"
      :aria-checked="dark"
      :title="dark ? 'Включить светлую тему' : 'Включить тёмную тему'"
      @click="setTheme(dark ? 'light' : 'dark')"
    >
      <span class="theme-track" :class="{ 'is-dark': dark }">
        <span class="theme-thumb"></span>
        <AppIcon name="sun" :size="20" class="theme-sun" />
        <AppIcon name="moon" :size="20" class="theme-moon" />
      </span>
    </button>
    <details
      ref="menu"
      class="theme-options"
      @focusout="
        !$event.currentTarget.contains($event.relatedTarget) && closeMenu()
      "
    >
      <summary
        :aria-label="`${modeLabel}. Настройки темы`"
        title="Настройки темы"
      >
        <AppIcon name="chevron" :size="14" />
      </summary>
      <div class="theme-popover panel">
        <p class="caption">{{ modeLabel }}</p>
        <button
          type="button"
          class="theme-system"
          :aria-pressed="preference === 'system'"
          @click="followSystem"
        >
          <AppIcon name="monitor" :size="20" />
          <span>Следовать системе</span>
          <span
            v-if="preference === 'system'"
            class="theme-check"
            aria-hidden="true"
            >✓</span
          >
        </button>
        <p class="caption">Автоматически менять тему вместе с устройством.</p>
        <p v-if="message" class="caption" role="status">{{ message }}</p>
      </div>
    </details>
  </div>
</template>
<style scoped>
.theme-selector {
  position: relative;
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  margin-left: auto;
}
.theme-switch {
  display: grid;
  place-items: center;
  width: 88px;
  height: 44px;
  padding: 0;
  border: 0;
  border-radius: var(--radius-pill);
  background: transparent;
  cursor: pointer;
}
.theme-track {
  position: relative;
  display: grid;
  grid-template-columns: 1fr 1fr;
  place-items: center;
  width: 80px;
  height: 40px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-pill);
  background: var(--color-canvas);
  color: var(--color-text-muted);
}
.theme-thumb {
  position: absolute;
  inset: 3px auto 3px 3px;
  width: 34px;
  border-radius: var(--radius-pill);
  background: var(--color-surface-raised);
  transition: transform 180ms ease;
}
.theme-track.is-dark .theme-thumb {
  transform: translateX(38px);
}
.theme-track .app-icon {
  position: relative;
}
.theme-sun {
  color: var(--color-text);
}
.is-dark .theme-sun {
  color: var(--color-text-muted);
}
.is-dark .theme-moon {
  color: var(--color-text);
}
.theme-options summary {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  list-style: none;
  border-radius: var(--radius-pill);
  color: var(--color-text-muted);
  cursor: pointer;
}
.theme-options summary::-webkit-details-marker {
  display: none;
}
.theme-options summary:hover,
.theme-options[open] summary {
  color: var(--color-text);
  background: var(--color-surface-raised);
}
.theme-popover {
  position: absolute;
  z-index: 30;
  top: calc(100% + 12px);
  right: 0;
  width: min(280px, calc(100vw - 48px));
  padding: 16px;
  box-shadow: 0 12px 32px #0003;
  display: grid;
  gap: 12px;
}
.theme-system {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: 44px;
  padding: 8px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-control);
  background: var(--color-surface-raised);
  color: var(--color-text);
  cursor: pointer;
  text-align: left;
  font: inherit;
  font-size: var(--font-label);
}
.theme-check {
  margin-left: auto;
}
@media (max-width: 767px) {
  .theme-selector {
    position: static;
  }
}
@media (prefers-reduced-motion: reduce) {
  .theme-thumb {
    transition: none;
  }
}
</style>
