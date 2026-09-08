import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { THEME_STORAGE_KEY } from '@/lib/constants'

export type Theme = 'dark' | 'light'

interface UiState {
  theme: Theme
  /** When on, answers stream token-by-token via /api/v1/chat/stream. */
  streamTokens: boolean
  /** null = query the whole corpus; otherwise scope retrieval to one document. */
  scopeDocumentId: string | null

  searchOpen: boolean
  searchPrefill: string
  uploadOpen: boolean
  detailDocumentId: string | null
  /** Only meaningful below the md breakpoint, where the sidebar is a drawer. */
  sidebarOpen: boolean

  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  setStreamTokens: (value: boolean) => void
  setScope: (documentId: string | null) => void

  openSearch: (prefill?: string) => void
  closeSearch: () => void
  openUpload: () => void
  closeUpload: () => void
  openDocumentDetail: (documentId: string) => void
  closeDocumentDetail: () => void
  setSidebarOpen: (open: boolean) => void
}

/** Shared with the pre-paint inline script in index.html, so it owns its own key. */
export function readStoredTheme(): Theme {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY)
    return raw === 'light' || raw === 'dark' ? raw : 'dark'
  } catch {
    return 'dark'
  }
}

export function writeStoredTheme(theme: Theme): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    /* private mode / storage disabled — the class on <html> still applies */
  }
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      theme: readStoredTheme(),
      streamTokens: true,
      scopeDocumentId: null,

      searchOpen: false,
      searchPrefill: '',
      uploadOpen: false,
      detailDocumentId: null,
      sidebarOpen: false,

      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
      setStreamTokens: (streamTokens) => set({ streamTokens }),
      setScope: (scopeDocumentId) => set({ scopeDocumentId }),

      openSearch: (prefill = '') => set({ searchOpen: true, searchPrefill: prefill }),
      closeSearch: () => set({ searchOpen: false }),
      openUpload: () => set({ uploadOpen: true }),
      closeUpload: () => set({ uploadOpen: false }),
      openDocumentDetail: (detailDocumentId) => set({ detailDocumentId }),
      closeDocumentDetail: () => set({ detailDocumentId: null }),
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
    }),
    {
      name: 'docmind-ui',
      // Theme lives under its own key (above); modals must not survive a reload.
      partialize: (state) => ({
        streamTokens: state.streamTokens,
        scopeDocumentId: state.scopeDocumentId,
      }),
    },
  ),
)
