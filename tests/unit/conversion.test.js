import { describe, expect, test } from 'vitest'
import {
  clearConversionDraft,
  fileProblem,
  useConversionDraft,
} from '../../apps/web/src/features/conversion/model.js'
import { previewFormats } from '../../apps/web/src/shared/api/preview-formats.js'
import { formatBytes } from '../../apps/web/src/shared/lib/format.js'

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
  test('octet-stream — допустимая подсказка, регистр расширения не важен', () => {
    expect(
      fileProblem(
        {
          ...file(1),
          name: `example.${format.extensions[0].toUpperCase()}`,
          type: 'application/octet-stream',
        },
        format,
      ),
    ).toBe('')
  })
})

test('неизвестное направление не ломает форму и не сбрасывает файл', () => {
  clearConversionDraft()
  const draft = useConversionDraft()
  const file = { name: 'example.jpg', type: 'image/jpeg', size: 10 }
  draft.changeDirection('jpg_to_png')
  draft.selectFiles([file])
  draft.changeDirection('unsupported')
  expect(draft.selectedFile.value).toBe(file)
  expect(draft.direction.value.id).toBe('jpg_to_png')
  expect(draft.canContinue.value).toBe(false)
  clearConversionDraft()
})

test('непустой маленький файл не выглядит как нулевой размер', () => {
  expect(formatBytes(1)).toBe('1 байт')
  expect(formatBytes(3)).toBe('3 байта')
  expect(formatBytes(1024)).toBe('1 KiB')
  expect(formatBytes(1024 ** 2)).toBe('1 MiB')
})
