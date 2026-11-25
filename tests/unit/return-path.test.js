import { test, expect } from 'vitest'
import { safeReturnPath } from '../../apps/web/src/shared/config/return-path.js'
test('возврат только к известным внутренним страницам', () => {
  for (const path of [
    'https://example.invalid',
    '//example.invalid',
    '/account/../privacy',
    '/account?token=secret',
    '/\\example.invalid',
    ['/account'],
  ])
    expect(safeReturnPath(path)).toBe('/account')
  expect(safeReturnPath('/account/files')).toBe('/account/files')
  expect(safeReturnPath(undefined, '/')).toBe('/')
})
