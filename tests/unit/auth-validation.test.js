import { expect, test } from 'vitest'
import {
  loginProblem,
  nameProblem,
  passwordProblem,
} from '../../apps/web/src/features/auth/validation.js'
test('имя считает кодовые точки и удаляет только внешние пробелы', () => {
  expect(nameProblem('  ' + '🔒'.repeat(80) + '  ')).toBe('')
  expect(nameProblem('🔒'.repeat(81))).not.toBe('')
  expect(nameProblem('   ')).not.toBe('')
})
test('пароль считает combining marks и не нормализует пробелы', () => {
  expect(passwordProblem('  e\u0301' + '🔒'.repeat(10) + ' ')).toBe('')
  expect(passwordProblem('🔒'.repeat(129))).not.toBe('')
  expect(passwordProblem(' '.repeat(15))).toBe('')
  expect(loginProblem('Kelvin')).not.toBe('')
  expect(loginProblem('USER_1')).toBe('')
})
