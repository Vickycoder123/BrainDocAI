import { useEffect } from 'react'
import { useUiStore } from '@/store/useUiStore'

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return (
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.tagName === 'SELECT' ||
    target.isContentEditable
  )
}

/** ⌘K / Ctrl-K opens semantic search; ⌘U / Ctrl-U opens the upload dialog. */
export function useGlobalHotkeys(): void {
  const openSearch = useUiStore((state) => state.openSearch)
  const openUpload = useUiStore((state) => state.openUpload)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const meta = event.metaKey || event.ctrlKey
      if (!meta) return

      const key = event.key.toLowerCase()
      if (key === 'k') {
        event.preventDefault()
        openSearch()
        return
      }
      if (key === 'u' && !isTypingTarget(event.target)) {
        event.preventDefault()
        openUpload()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [openSearch, openUpload])
}
