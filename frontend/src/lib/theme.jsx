/**
 * Theme system: light/dark/system modes with persistence.
 *
 * Usage:
 *   const { theme, setTheme, resolved } = useTheme()
 *   - theme: 'light' | 'dark' | 'system'
 *   - resolved: 'light' | 'dark' (what's actually applied)
 *
 * Wrap the app in <ThemeProvider> in main.jsx.
 */
import { createContext, useContext, useEffect, useState, useCallback } from 'react'

const ThemeContext = createContext(null)
const STORAGE_KEY = 'fink_theme'

function getSystemTheme() {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(theme) {
  const resolved = theme === 'system' ? getSystemTheme() : theme
  const root = document.documentElement
  root.setAttribute('data-theme', resolved)
  root.style.colorScheme = resolved
  return resolved
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    if (typeof window === 'undefined') return 'system'
    return localStorage.getItem(STORAGE_KEY) || 'system'
  })
  const [resolved, setResolved] = useState(() => {
    if (typeof window === 'undefined') return 'light'
    const t = localStorage.getItem(STORAGE_KEY) || 'system'
    return t === 'system' ? getSystemTheme() : t
  })

  // Apply on mount and whenever theme changes
  useEffect(() => {
    const r = applyTheme(theme)
    setResolved(r)
    localStorage.setItem(STORAGE_KEY, theme)
  }, [theme])

  // Listen to system theme changes if user picked 'system'
  useEffect(() => {
    if (theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => {
      const r = applyTheme('system')
      setResolved(r)
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [theme])

  const setTheme = useCallback((newTheme) => {
    setThemeState(newTheme)
  }, [])

  const toggle = useCallback(() => {
    setThemeState(resolved === 'dark' ? 'light' : 'dark')
  }, [resolved])

  return (
    <ThemeContext.Provider value={{ theme, resolved, setTheme, toggle }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    throw new Error('useTheme must be used inside <ThemeProvider>')
  }
  return ctx
}

/**
 * Run BEFORE React mounts to avoid a "flash of wrong theme" on page load.
 * Inject this as a small inline script in index.html.
 */
export const themeInitScript = `
(function() {
  try {
    var stored = localStorage.getItem('${STORAGE_KEY}') || 'system';
    var theme = stored === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : stored;
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.style.colorScheme = theme;
  } catch (e) {}
})();
`
