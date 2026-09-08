import { useEffect } from 'react'
import { useUiStore, writeStoredTheme } from '@/store/useUiStore'

/** Reflects the store's theme onto <html> and persists it for the pre-paint script. */
export function useThemeEffect(): void {
  const theme = useUiStore((state) => state.theme)

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', theme === 'dark')
    root.style.colorScheme = theme
    writeStoredTheme(theme)
  }, [theme])
}

export function useTheme() {
  const theme = useUiStore((state) => state.theme)
  const toggleTheme = useUiStore((state) => state.toggleTheme)
  const setTheme = useUiStore((state) => state.setTheme)
  return { theme, toggleTheme, setTheme }
}
