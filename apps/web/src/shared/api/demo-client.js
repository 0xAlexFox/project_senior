// Explicit preview transport. No fetch, credentials, cookies or user file bytes.
import { reactive } from 'vue'
import { demoAssets } from './demo-assets.js'
import { previewFormats } from './preview-formats.js'
import {
  demoConfig,
  demoErrors,
  makeDemoFiles,
  makeRecoveryCodes,
} from './demo-fixtures.js'

const storageKey = 'converter.preview'
const directions = ['jpg_to_png', 'png_to_jpg', 'docx_to_pdf']
const terminal = ['succeeded', 'failed', 'cancelled']
function storedPreview() {
  try {
    if (typeof window === 'undefined') return {}
    const value = window.sessionStorage.getItem(storageKey)
    return value && value.length < 4096 ? JSON.parse(value) || {} : {}
  } catch {
    return {}
  }
}
const initial = storedPreview()
export const demo = reactive({
  enabled: initial.enabled === true,
  viewer: initial.enabled === true && initial.viewer === true,
  online: true,
  nextError: '',
  latencyMs: 150,
  message: '',
  profile: {
    displayName: 'Учебный пользователь',
    login: 'demo_user',
    timeZone: 'Europe/Moscow',
  },
  saveToProfile: false,
  version: 1,
  files: makeDemoFiles(),
  key: { status: 'none', mask: '', createdAt: null, lastUsedAt: null },
  codeCount: 8,
  codeBatch: 1,
  telegram: {
    status: 'disconnected',
    expiresAt: null,
    browserConfirmed: false,
    botConfirmed: false,
  },
  resetUntil: null,
  recoveryUntil: null,
  reauthUntil: null,
  job: null,
})
let sequence = 1
const clone = (value) => JSON.parse(JSON.stringify(value))
const iso = () => new Date().toISOString()

export class DemoError extends Error {
  constructor(code) {
    const [message, retryable] =
      demoErrors[code] || demoErrors.SERVICE_UNAVAILABLE
    super(message)
    this.code = code
    this.retryable = retryable
    this.requestId = 'req_preview_001'
    this.retryAfter = code === 'RATE_LIMITED' ? 2 : null
  }
}

let knownJobId = null
export function rememberPreviewJob(id) {
  knownJobId = id
  persist()
}

function persist() {
  try {
    if (typeof window === 'undefined') return
    if (!demo.enabled) {
      window.sessionStorage.removeItem(storageKey)
      return
    }
    // Only preview flags and synthetic job data. Never profile, filenames or secrets.
    const job = demo.job &&
      knownJobId === demo.job.id && {
        id: demo.job.id,
        conversion: demo.job.conversion,
        status: demo.job.status,
        saveToProfile: demo.job.saveToProfile,
        createdAt: demo.job.createdAt,
        finishedAt: demo.job.finishedAt,
        expiresAt: demo.job.result?.expiresAt,
        deleted: demo.job.deleted === true,
      }
    window.sessionStorage.setItem(
      storageKey,
      JSON.stringify({ enabled: true, viewer: demo.viewer, job }),
    )
  } catch {
    demo.message =
      'Учебные данные доступны только до перезагрузки: хранилище вкладки недоступно.'
  }
}

export function enablePreview() {
  demo.enabled = true
  demo.viewer = true
  demo.message = ''
  persist()
}
export function disablePreview() {
  demo.enabled = false
  demo.viewer = false
  demo.job = null
  demo.nextError = ''
  demo.online = true
  demo.resetUntil = null
  demo.reauthUntil = null
  demo.recoveryUntil = null
  demo.key = { status: 'none', mask: '', createdAt: null, lastUsedAt: null }
  demo.files = makeDemoFiles()
  demo.saveToProfile = false
  demo.version = 1
  demo.profile = {
    displayName: 'Учебный пользователь',
    login: 'demo_user',
    timeZone: 'Europe/Moscow',
  }
  demo.telegram = {
    status: 'disconnected',
    expiresAt: null,
    browserConfirmed: false,
    botConfirmed: false,
  }
  demo.codeCount = 8
  demo.message = ''
  persist()
}

async function respond(action, { signal, publicAction = false } = {}) {
  if (!demo.enabled) throw new DemoError('PREVIEW_DISABLED')
  const failure = demo.nextError
  demo.nextError = ''
  if (signal?.aborted) throw new DOMException('Отменено', 'AbortError')
  await new Promise((resolve, reject) => {
    const cancel = () => {
      clearTimeout(timer)
      reject(new DOMException('Отменено', 'AbortError'))
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', cancel)
      resolve()
    }, demo.latencyMs)
    signal?.addEventListener('abort', cancel, { once: true })
  })
  if (signal?.aborted) throw new DOMException('Отменено', 'AbortError')
  if (!demo.enabled) throw new DemoError('PREVIEW_DISABLED')
  if (!demo.online) throw new DemoError('NETWORK_ERROR')
  if (failure && !['KEY_RESPONSE_LOST', 'RESPONSE_LOST'].includes(failure)) {
    if (failure === 'SESSION_EXPIRED') {
      demo.viewer = false
      demo.reauthUntil = null
      persist()
    }
    if (failure === 'SETTINGS_CONFLICT') {
      demo.version += 1
      demo.saveToProfile = !demo.saveToProfile
    }
    throw new DemoError(failure)
  }
  if (!publicAction && !demo.viewer) throw new DemoError('SESSION_EXPIRED')
  const result = action()
  if (['KEY_RESPONSE_LOST', 'RESPONSE_LOST'].includes(failure))
    throw new DemoError(failure)
  return clone(result)
}

export function getDemoQuota() {
  const reserved =
    demo.job?.saveToProfile && !terminal.includes(demo.job.status)
  return {
    usedFiles: demo.files.length,
    usedBytes: demo.files.reduce((sum, file) => sum + file.sizeBytes, 0),
    reservedFiles: reserved ? 1 : 0,
    reservedBytes: reserved ? demoConfig.reserveBytes : 0,
    maxFiles: demoConfig.maxSavedFiles,
    maxBytes: demoConfig.maxSavedBytes,
  }
}
function profileResponse() {
  return {
    ...demo.profile,
    saveToProfile: demo.saveToProfile,
    version: demo.version,
    quota: getDemoQuota(),
  }
}
function reauthRequired() {
  if (!demo.reauthUntil || demo.reauthUntil <= Date.now())
    throw new DemoError('REAUTH_REQUIRED')
}
function formatFor(conversion) {
  return conversion === 'jpg_to_png'
    ? 'png'
    : conversion === 'png_to_jpg'
      ? 'jpg'
      : 'pdf'
}
function makeJob(conversion, saveToProfile, id) {
  return {
    id,
    conversion,
    source: 'web',
    status: 'queued',
    stage: 'queued',
    attempts: 1,
    saveToProfile,
    createdAt: iso(),
    finishedAt: null,
    warnings: [],
    result: null,
    error: null,
  }
}
function jobResponse() {
  if (!demo.job) throw new DemoError('NOT_FOUND')
  const job = clone(demo.job)
  if (
    job.result &&
    (job.deleted ||
      (job.result.expiresAt && Date.parse(job.result.expiresAt) <= Date.now()))
  ) {
    job.result.available = false
    job.result.downloadPath = null
  }
  return job
}
export function setDemoJobStatus(status) {
  const job = demo.job
  if (!job) throw new DemoError('NOT_FOUND')
  if (status === 'expired' || status === 'deleted') {
    if (job.status !== 'succeeded') throw new DemoError('JOB_ALREADY_FINISHED')
    if (status === 'expired')
      job.result.expiresAt = new Date(Date.now() - 1000).toISOString()
    else job.deleted = true
    persist()
    return
  }
  if (terminal.includes(job.status)) throw new DemoError('JOB_ALREADY_FINISHED')
  if (
    !['queued', 'running', 'succeeded', 'failed', 'cancelled'].includes(
      status,
    ) ||
    (status === 'succeeded' && job.status !== 'running') ||
    (status === 'queued' && job.status !== 'queued')
  )
    throw new DemoError('JOB_ALREADY_FINISHED')
  job.status = status
  job.stage =
    status === 'running'
      ? 'converting'
      : status === 'succeeded'
        ? 'completed'
        : status
  if (terminal.includes(status)) job.finishedAt = iso()
  if (status === 'succeeded') {
    const format = formatFor(job.conversion)
    const asset = demoAssets[format]
    job.result = {
      fileName: `учебный-пример.${format}`,
      mimeType: asset.mimeType,
      sizeBytes: asset.sizeBytes,
      available: true,
      expiresAt: job.saveToProfile
        ? null
        : new Date(
            Date.now() + demoConfig.temporarySeconds * 1000,
          ).toISOString(),
      downloadPath: `/api/app/conversions/${job.id}/file`,
    }
    if (job.saveToProfile && !demo.files.some((file) => file.id === job.id))
      demo.files.unshift({
        id: job.id,
        fileName: job.result.fileName,
        format,
        sizeBytes: asset.sizeBytes,
        source: 'web',
        createdAt: job.finishedAt,
      })
  }
  if (status === 'failed')
    job.error = {
      code: 'CONVERSION_FAILED',
      message: 'Учебный ответ: движок не смог обработать файл.',
      requestId: 'req_preview_job',
      retryable: false,
    }
  persist()
}

if (
  initial.enabled === true &&
  initial.job &&
  (!terminal.includes(initial.job.status) ||
    (typeof initial.job.finishedAt === 'string' &&
      Number.isFinite(Date.parse(initial.job.finishedAt)))) &&
  typeof initial.job.createdAt === 'string' &&
  Number.isFinite(Date.parse(initial.job.createdAt)) &&
  (initial.job.status !== 'succeeded' ||
    initial.job.saveToProfile === true ||
    (typeof initial.job.expiresAt === 'string' &&
      Number.isFinite(Date.parse(initial.job.expiresAt)))) &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    initial.job.id,
  ) &&
  directions.includes(initial.job.conversion) &&
  ['queued', 'running', ...terminal].includes(initial.job.status)
) {
  const saved = initial.job
  knownJobId = saved.id
  demo.job = makeJob(saved.conversion, saved.saveToProfile === true, saved.id)
  if (
    typeof saved.createdAt === 'string' &&
    Number.isFinite(Date.parse(saved.createdAt))
  )
    demo.job.createdAt = saved.createdAt
  if (saved.status !== 'queued') setDemoJobStatus('running')
  if (terminal.includes(saved.status)) setDemoJobStatus(saved.status)
  if (saved.finishedAt && Number.isFinite(Date.parse(saved.finishedAt)))
    demo.job.finishedAt = saved.finishedAt
  const restoredFile = demo.files.find((file) => file.id === demo.job.id)
  if (restoredFile) restoredFile.createdAt = saved.finishedAt
  if (
    demo.job.result &&
    saved.expiresAt &&
    Number.isFinite(Date.parse(saved.expiresAt))
  )
    demo.job.result.expiresAt = saved.expiresAt
  if (saved.deleted === true) demo.job.deleted = true
  persist()
}

export const demoApi = {
  formats: (options) =>
    respond(
      () => ({ demo: true, formats: previewFormats, config: demoConfig }),
      { ...options, publicAction: true },
    ),
  profile: (options) => respond(profileResponse, options),
  updateSaving: (value, version, options) =>
    respond(() => {
      if (version !== demo.version) throw new DemoError('SETTINGS_CONFLICT')
      demo.saveToProfile = value === true
      demo.version += 1
      return profileResponse()
    }, options),
  updateProfile: (profile, version) =>
    respond(() => {
      if (version !== demo.version) throw new DemoError('SETTINGS_CONFLICT')
      demo.profile = {
        ...demo.profile,
        displayName: profile.displayName.trim(),
        timeZone: profile.timeZone,
      }
      demo.version += 1
      return profileResponse()
    }),
  files: (options) =>
    respond(() => ({ items: demo.files, quota: getDemoQuota() }), options),
  deleteFile: (id) =>
    respond(() => {
      const index = demo.files.findIndex((file) => file.id === id)
      if (index < 0) throw new DemoError('NOT_FOUND')
      demo.files.splice(index, 1)
      return { deleted: true, quota: getDemoQuota() }
    }),
  fileDownload: (id) =>
    respond(() => {
      const file = demo.files.find((item) => item.id === id)
      if (!file) throw new DemoError('NOT_FOUND')
      return {
        ...demoAssets[file.format],
        fileName: `учебный-${file.fileName}`,
      }
    }),
  reauth: () =>
    respond(() => {
      demo.reauthUntil = Date.now() + 5 * 60_000
      return { valid: true }
    }),
  key: () => respond(() => demo.key),
  createKey: () =>
    respond(() => {
      reauthRequired()
      const suffix = String(sequence++).padStart(4, '0')
      demo.key = {
        status: 'active',
        mask: `demo_key_••••_${suffix}`,
        createdAt: iso(),
        lastUsedAt: null,
      }
      return { key: demo.key, secret: `DEMO-NOT-A-VALID-API-KEY-${suffix}` }
    }),
  revokeKey: () =>
    respond(() => {
      reauthRequired()
      demo.key.status = 'revoked'
      return demo.key
    }),
  signIn: (options) =>
    respond(
      () => {
        demo.viewer = true
        persist()
        return { demo: true }
      },
      { ...options, publicAction: true },
    ),
  signOut: () => {
    demo.viewer = false
    demo.reauthUntil = null
    persist()
  },
  register: (options) =>
    respond(() => ({ recoveryCodes: makeRecoveryCodes(), demo: true }), {
      ...options,
      publicAction: true,
    }),
  requestRecovery: (options) =>
    respond(
      () => {
        demo.recoveryUntil = Date.now() + 10 * 60_000
        return {
          message:
            'Если для этого аккаунта подключён Telegram, сообщение отправлено.',
          expiresAt: new Date(demo.recoveryUntil).toISOString(),
          retryAfter: 2,
        }
      },
      { ...options, publicAction: true },
    ),
  verifyRecovery: (options) =>
    respond(
      () => {
        if (!demo.recoveryUntil || demo.recoveryUntil <= Date.now())
          throw new DemoError('RECOVERY_EXPIRED')
        demo.resetUntil = Date.now() + 10 * 60_000
        return { resetExpiresAt: new Date(demo.resetUntil).toISOString() }
      },
      { ...options, publicAction: true },
    ),
  verifyBackup: (options) =>
    respond(
      () => {
        if (!demo.codeCount) throw new DemoError('CODE_USED')
        demo.codeCount--
        demo.resetUntil = Date.now() + 10 * 60_000
        return { resetExpiresAt: new Date(demo.resetUntil).toISOString() }
      },
      { ...options, publicAction: true },
    ),
  resetPassword: (options) =>
    respond(
      () => {
        if (!demo.resetUntil || demo.resetUntil <= Date.now())
          throw new DemoError('RECOVERY_EXPIRED')
        demo.resetUntil = null
        demo.recoveryUntil = null
        demo.reauthUntil = null
        demo.viewer = false
        demo.key.status = 'revoked'
        demo.codeCount = 0
        persist()
        return { changed: true }
      },
      { ...options, publicAction: true },
    ),
  changePassword: () =>
    respond(() => {
      reauthRequired()
      demo.reauthUntil = null
      return { changed: true }
    }),
  regenerateCodes: () =>
    respond(() => {
      reauthRequired()
      demo.codeBatch += 1
      demo.codeCount = 8
      return { recoveryCodes: makeRecoveryCodes(demo.codeBatch) }
    }),
  startTelegram: () =>
    respond(() => {
      reauthRequired()
      demo.telegram = {
        status: 'pending',
        previousConnected:
          demo.telegram.status === 'connected' ||
          demo.telegram.previousConnected === true,
        expiresAt: Date.now() + 5 * 60_000,
        botConfirmed: false,
        browserConfirmed: false,
      }
      return demo.telegram
    }),
  confirmTelegram: () =>
    respond(() => {
      if (demo.telegram.expiresAt <= Date.now() || !demo.telegram.botConfirmed)
        throw new DemoError('RECOVERY_EXPIRED')
      demo.telegram = {
        status: 'connected',
        expiresAt: null,
        botConfirmed: true,
        browserConfirmed: true,
      }
      return demo.telegram
    }),
  disconnectTelegram: () =>
    respond(() => {
      reauthRequired()
      if (!demo.codeCount) throw new DemoError('REAUTH_REQUIRED')
      demo.telegram = {
        status: 'disconnected',
        expiresAt: null,
        botConfirmed: false,
        browserConfirmed: false,
      }
      return demo.telegram
    }),
  deleteAccount: () =>
    respond(() => {
      reauthRequired()
      disablePreview()
      return { deleted: true }
    }),
  createJob: (conversion, saveToProfile, idempotencyKey, options) =>
    respond(() => {
      if (demo.job?.idempotencyKey === idempotencyKey) {
        if (
          demo.job.conversion !== conversion ||
          demo.job.saveToProfile !== (saveToProfile === true)
        )
          throw new DemoError('IDEMPOTENCY_CONFLICT')
        return jobResponse()
      }
      if (!directions.includes(conversion)) throw new DemoError('NOT_FOUND')
      const quota = getDemoQuota()
      if (
        saveToProfile &&
        (quota.usedFiles + quota.reservedFiles >= quota.maxFiles ||
          quota.maxBytes - quota.usedBytes - quota.reservedBytes <
            demoConfig.reserveBytes)
      )
        throw new DemoError('STORAGE_QUOTA_EXCEEDED')
      if (demo.job && !terminal.includes(demo.job.status))
        throw new DemoError('RATE_LIMITED')
      demo.job = {
        ...makeJob(conversion, saveToProfile === true, crypto.randomUUID()),
        idempotencyKey,
      }
      persist()
      return jobResponse()
    }, options),
  activeJobs: (options) =>
    respond(
      () =>
        demo.job && !terminal.includes(demo.job.status) ? [jobResponse()] : [],
      options,
    ),
  job: (id, options) =>
    respond(() => {
      if (id !== demo.job?.id) throw new DemoError('NOT_FOUND')
      return jobResponse()
    }, options),
  cancelJob: (id) =>
    respond(() => {
      if (id !== demo.job?.id) throw new DemoError('NOT_FOUND')
      if (demo.job.status === 'cancelled') return jobResponse()
      if (terminal.includes(demo.job.status))
        throw new DemoError('JOB_ALREADY_FINISHED')
      setDemoJobStatus('cancelled')
      return jobResponse()
    }),
  jobDownload: (id) =>
    respond(() => {
      if (id !== demo.job?.id) throw new DemoError('NOT_FOUND')
      const job = jobResponse()
      if (!job.result?.available) throw new DemoError('RESULT_EXPIRED')
      return {
        ...demoAssets[formatFor(job.conversion)],
        fileName: job.result.fileName,
      }
    }),
}
