import { beforeEach, expect, test } from 'vitest'
import {
  demo,
  demoApi,
  disablePreview,
  enablePreview,
  getDemoQuota,
  setDemoJobStatus,
} from '../../apps/web/src/shared/api/demo-client.js'
import { formatDate } from '../../apps/web/src/shared/lib/format.js'

beforeEach(() => {
  disablePreview()
  enablePreview()
  demo.latencyMs = 0
})

test('ошибка не изменяет настройку, конфликт требует перечитывания', async () => {
  demo.nextError = 'NETWORK_ERROR'
  await expect(demoApi.updateSaving(true, 1)).rejects.toMatchObject({
    code: 'NETWORK_ERROR',
  })
  expect(demo.saveToProfile).toBe(false)
  await demoApi.updateSaving(true, 1)
  await expect(demoApi.updateSaving(false, 1)).rejects.toMatchObject({
    code: 'SETTINGS_CONFLICT',
  })
  expect(demo.saveToProfile).toBe(true)
})
test('снимок сохранения и идемпотентность, отмена освобождает резерв', async () => {
  const key = crypto.randomUUID()
  const job = await demoApi.createJob('jpg_to_png', true, key)
  await demoApi.updateSaving(false, 1)
  expect((await demoApi.createJob('jpg_to_png', true, key)).id).toBe(job.id)
  expect(demo.job.saveToProfile).toBe(true)
  await expect(
    demoApi.createJob('png_to_jpg', true, key),
  ).rejects.toMatchObject({ code: 'IDEMPOTENCY_CONFLICT' })
  expect(getDemoQuota().reservedBytes).toBe(50 * 1024 ** 2)
  await demoApi.cancelJob(job.id)
  expect(getDemoQuota().reservedBytes).toBe(0)
})
test('срок доступа не переписывает успешный статус; поздняя отмена отвергается', async () => {
  const job = await demoApi.createJob('docx_to_pdf', false, crypto.randomUUID())
  setDemoJobStatus('running')
  setDemoJobStatus('succeeded')
  setDemoJobStatus('expired')
  const expired = await demoApi.job(job.id)
  expect(expired.status).toBe('succeeded')
  expect(expired.result.available).toBe(false)
  await expect(demoApi.cancelJob(job.id)).rejects.toMatchObject({
    code: 'JOB_ALREADY_FINISHED',
  })
  await expect(demoApi.jobDownload(job.id)).rejects.toMatchObject({
    code: 'RESULT_EXPIRED',
  })
})
test('потерянный ответ ключа не позволяет повторно раскрыть секрет', async () => {
  await demoApi.reauth()
  demo.nextError = 'KEY_RESPONSE_LOST'
  await expect(demoApi.createKey()).rejects.toMatchObject({
    code: 'KEY_RESPONSE_LOST',
  })
  const key = await demoApi.key()
  expect(key.status).toBe('active')
  expect(key).not.toHaveProperty('secret')
})
test('прерванный запрос списка не возвращает данные', async () => {
  const controller = new AbortController()
  controller.abort()
  await expect(
    demoApi.files({ signal: controller.signal }),
  ).rejects.toMatchObject({ name: 'AbortError' })
  expect(demo.files).toHaveLength(21)
})
test('даты: реальное преобразование зоны, неизвестная дата и точность источника', () => {
  expect(formatDate('2026-11-19T22:30:00Z')).toBe(
    '20 ноября 2026 г. в 01:30:00 МСК',
  )
  expect(formatDate('2026-11-19T22:30Z')).toBe('20 ноября 2026 г. в 01:30 МСК')
  expect(formatDate('2026-11-19', 'America/Los_Angeles')).toBe(
    '19 ноября 2026 г.',
  )
  expect(formatDate(null)).toBe('Дата неизвестна')
  expect(formatDate('not-a-date')).toBe('Дата неизвестна')
  expect(formatDate('2026-02-30T00:00:00Z')).toBe('Дата неизвестна')
})

test('удаление сохранённого результата немедленно закрывает оба пути скачивания', async () => {
  const job = await demoApi.createJob('jpg_to_png', true, crypto.randomUUID())
  setDemoJobStatus('running')
  setDemoJobStatus('succeeded')
  await demoApi.deleteFile(job.id)
  await expect(demoApi.fileDownload(job.id)).rejects.toMatchObject({
    code: 'NOT_FOUND',
  })
  await expect(demoApi.jobDownload(job.id)).rejects.toMatchObject({
    code: 'RESULT_EXPIRED',
  })
  expect((await demoApi.job(job.id)).status).toBe('succeeded')
})
