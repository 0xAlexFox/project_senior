import { describe, expect, test } from 'vitest'
import { fileProblem } from '../../apps/web/src/features/conversion/model.js'
import { previewFormats } from '../../apps/web/src/shared/api/preview-formats.js'

describe.each(previewFormats)('$id: пределы выбора файла', (format) => {
  const file = (size) => ({
    name: `example.${format.extensions[0]}`,
    type: format.mimeTypes[0],
    size,
  })
  test('минимум и точная верхняя граница разрешены', () => {
    expect(fileProblem(file(1), format)).toBe('')
    expect(fileProblem(file(format.maxInputBytes), format)).toBe('')
  })
  test('пустой и превышающий предел файл отклоняются', () => {
    expect(fileProblem(file(0), format)).not.toBe('')
    expect(fileProblem(file(format.maxInputBytes + 1), format)).not.toBe('')
  })
  test('маскировка исполняемого расширения не проходит', () => {
    expect(
      fileProblem({ ...file(1), name: 'example.jpg.exe' }, format),
    ).not.toBe('')
  })
})
