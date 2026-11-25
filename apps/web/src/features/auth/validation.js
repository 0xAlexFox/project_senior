// Count code points without normalizing or trimming passwords.
export function codePointLength(value, limit = 129) {
  let count = 0
  for (const _character of value) {
    if (++count >= limit) break
  }
  return count
}
export const loginProblem = (value) =>
  /^[a-z0-9_]{3,32}$/i.test(value)
    ? ''
    : 'Логин: 3–32 латинские буквы, цифры или _. Регистр не важен.'
export const nameProblem = (value) => {
  const length = codePointLength(value.trim(), 81)
  return length >= 1 && length <= 80
    ? ''
    : 'Имя: от 1 до 80 символов без внешних пробелов.'
}
export const passwordProblem = (value) => {
  const length = codePointLength(value)
  return length >= 15 && length <= 128
    ? ''
    : 'Пароль должен содержать от 15 до 128 символов.'
}
