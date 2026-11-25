import { onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { useRetryDelay } from './use-retry-delay.js'
import { demo } from './demo-client.js'
// Stale reads cannot overwrite a newer page/state; no server authentication here.
export function useDemoResource(request) {
  const { remaining: retryIn, apply: delayRetry } = useRetryDelay()
  const data = shallowRef(null),
    error = ref(''),
    loading = ref(false)
  let controller,
    disposed = false
  async function load() {
    if (retryIn.value && demo.viewer) return
    controller?.abort()
    const current = new AbortController()
    controller = current
    if (!demo.enabled || !demo.viewer) {
      data.value = null
      error.value = ''
      loading.value = false
      return
    }
    loading.value = true
    error.value = ''
    try {
      const value = await request({ signal: current.signal })
      if (!disposed && !current.signal.aborted) data.value = value
    } catch (failure) {
      if (!disposed && !current.signal.aborted) {
        error.value = failure.message
        delayRetry(failure)
      }
    } finally {
      if (!disposed && controller === current) loading.value = false
    }
  }
  onMounted(load)
  watch(() => [demo.enabled, demo.viewer], load)
  onBeforeUnmount(() => {
    disposed = true
    controller?.abort()
    data.value = null
  })
  return { data, error, loading, load, retryIn }
}
