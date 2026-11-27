// Runs before styles/app rendering. Only a non-sensitive, allowlisted preference.
;(() => {
  let preference = 'system'
  try {
    const saved = globalThis.localStorage.getItem('converter.theme')
    if (saved === 'light' || saved === 'dark') preference = saved
  } catch {
    // A denied store must not prevent rendering or system-theme detection.
  }
  const root = globalThis.document.documentElement
  root.dataset.themePreference = preference
  root.dataset.theme =
    preference === 'system'
      ? globalThis.matchMedia('(prefers-color-scheme: light)').matches
        ? 'light'
        : 'dark'
      : preference
})()
