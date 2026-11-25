import { onBeforeUnmount, ref } from 'vue'
export function useRetryDelay() {
  const remaining = ref(0)
  let timer
  function apply(error) {
    const seconds = Math.min(300, Math.max(0, Number(error.retryAfter) || 0))
    if (!seconds) return
    clearInterval(timer)
    const deadline = Date.now() + seconds * 1000
    remaining.value = Math.ceil(seconds)
    timer = setInterval(() => {
      remaining.value = Math.max(0, Math.ceil((deadline - Date.now()) / 1000))
      if (!remaining.value) clearInterval(timer)
    }, 250)
  }
  onBeforeUnmount(() => clearInterval(timer))
  return { remaining, apply }
}
