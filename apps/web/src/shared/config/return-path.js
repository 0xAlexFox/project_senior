const allowed = new Set([
  '/',
  '/account',
  '/account/files',
  '/account/api-key',
  '/account/settings',
])
export function safeReturnPath(value, fallback = '/account') {
  return typeof value === 'string' && allowed.has(value) ? value : fallback
}
