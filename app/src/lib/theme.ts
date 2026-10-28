import { useState } from 'react'

export type Theme = 'auto' | 'light' | 'dark'
const KEY = 'tugon.theme'

function read(): Theme {
  try {
    const v = localStorage.getItem(KEY)
    if (v === 'light' || v === 'dark') return v
  } catch { /* storage unavailable */ }
  return 'auto'
}

// 'auto' follows the phone's setting; light and dark override it.
export function applyTheme(theme: Theme) {
  const root = document.documentElement
  if (theme === 'auto') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', theme)
}

export function initTheme() { applyTheme(read()) }

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(read)
  const setTheme = (t: Theme) => {
    setThemeState(t)
    applyTheme(t)
    try { if (t === 'auto') localStorage.removeItem(KEY); else localStorage.setItem(KEY, t) } catch { /* ignore */ }
  }
  return { theme, setTheme }
}
