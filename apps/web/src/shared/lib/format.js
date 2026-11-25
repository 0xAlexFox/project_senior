export function formatBytes(bytes) {
  return bytes < 1024 * 1024
    ? `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 }).format(bytes / 1024)} KiB`
    : `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(bytes / (1024 * 1024))} MiB`
}

export function formatDate(value, timeZone = 'Europe/Moscow') {
  if (typeof value !== 'string' || !value) return 'Дата неизвестна'
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value)
  const date = new Date(value)
  const calendarDate = /^\d{4}-\d{2}-\d{2}/.test(value)
    ? new Date(value.slice(0, 10) + 'T00:00:00Z')
    : null
  if (
    !calendarDate ||
    !Number.isFinite(calendarDate.getTime()) ||
    calendarDate.toISOString().slice(0, 10) !== value.slice(0, 10)
  )
    return 'Дата неизвестна'
  if (!Number.isFinite(date.getTime())) return 'Дата неизвестна'
  if (dateOnly && date.toISOString().slice(0, 10) !== value)
    return 'Дата неизвестна'
  try {
    if (dateOnly)
      return new Intl.DateTimeFormat('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
      }).format(date)
    if (!/T\d{2}:\d{2}/.test(value) || !/(Z|[+-]\d{2}:?\d{2})$/.test(value))
      return 'Дата неизвестна'
    const options = {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
      timeZone,
    }
    if (/T\d{2}:\d{2}:\d{2}/.test(value)) options.second = '2-digit'
    const text = new Intl.DateTimeFormat('ru-RU', options).format(date)
    const zone =
      timeZone === 'Europe/Moscow'
        ? 'МСК'
        : timeZone === 'UTC'
          ? 'UTC'
          : timeZone
    return `${text} ${zone}`
  } catch {
    return 'Дата неизвестна'
  }
}

export function startDemoDownload(file) {
  // The preview transport only provides the three fixed public sample paths.
  if (!/^\/demo\/sample\.(png|jpg|pdf)$/.test(file.path))
    throw new Error('Недоступный учебный файл.')
  const link = document.createElement('a')
  link.href = file.path
  link.download = file.fileName
  document.body.append(link)
  link.click()
  link.remove()
}
