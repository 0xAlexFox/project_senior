export function formatBytes(bytes) {
  return bytes < 1024 * 1024
    ? `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 }).format(bytes / 1024)} KiB`
    : `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(bytes / (1024 * 1024))} MiB`
}
