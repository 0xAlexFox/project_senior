import { expect, test } from 'vitest'
import {
  normalizeFileQuery,
  selectFilesPage,
} from '../../apps/web/src/shared/api/file-query.js'
import { makeDemoFiles } from '../../apps/web/src/shared/api/demo-fixtures.js'
test('фильтры и страницы ограничены allowlist, последний лист уменьшается', () => {
  expect(
    normalizeFileQuery({
      format: '<svg>',
      source: 'other',
      sort: 'DROP',
      page: 'Infinity',
    }),
  ).toEqual({ format: '', source: '', sort: 'newest', page: 1 })
  const files = makeDemoFiles()
  expect(selectFilesPage(files, { page: 2 }).items).toHaveLength(1)
  expect(selectFilesPage(files.slice(0, 20), { page: 2 }).page).toBe(1)
  const result = selectFilesPage(files, {
    format: 'pdf',
    source: 'api',
    query: 'ПЛАН',
  })
  expect(
    result.items.every(
      (file) =>
        file.format === 'pdf' &&
        file.source === 'api' &&
        file.fileName.includes('план'),
    ),
  ).toBe(true)
  expect(result.items.length).toBeGreaterThan(0)
})
