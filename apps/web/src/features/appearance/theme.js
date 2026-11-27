import { onBeforeUnmount, onMounted, ref } from 'vue'
const storageKey = 'converter.theme'
const normalize = (value) =>
  ['light', 'dark'].includes(value) ? value : 'system'
const preference = ref(
  typeof document === 'undefined'
    ? 'system'
    : normalize(document.documentElement.dataset.themePreference),
)
const message = ref('')
const resolvedTheme = ref(
  typeof document === 'undefined'
    ? 'dark'
    : document.documentElement.dataset.theme,
)
let media
function apply() {
  document.documentElement.dataset.themePreference = preference.value
  resolvedTheme.value =
    preference.value === 'system'
      ? media.matches
        ? 'light'
        : 'dark'
      : preference.value
  document.documentElement.dataset.theme = resolvedTheme.value
}
export function initializeTheme() {
  function sync(event) {
    if (event.key !== storageKey && event.key !== null) return
    preference.value = normalize(event.newValue)
    message.value = ''
    apply()
  }
  onMounted(() => {
    media = window.matchMedia('(prefers-color-scheme: light)')
    apply()
    media.addEventListener('change', apply)
    window.addEventListener('storage', sync)
  })
  onBeforeUnmount(() => {
    media?.removeEventListener('change', apply)
    window.removeEventListener('storage', sync)
  })
}
function setTheme(value) {
  preference.value = normalize(value)
  apply()
  try {
    if (preference.value === 'system')
      window.localStorage.removeItem(storageKey)
    else window.localStorage.setItem(storageKey, preference.value)
    message.value = ''
  } catch {
    message.value =
      'Тема изменена только в этой вкладке: браузер не разрешил сохранить выбор.'
  }
}
export function useTheme() {
  return { preference, resolvedTheme, message, setTheme }
}
