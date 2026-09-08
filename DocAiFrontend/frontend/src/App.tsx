import { lazy, Suspense, useEffect } from 'react'
import { UploadCloud } from 'lucide-react'
import { ChatPanel } from '@/components/chat/ChatPanel'
import { preloadMarkdown } from '@/components/chat/Markdown'
import { AppHeader } from '@/components/layout/AppHeader'
import { Sidebar } from '@/components/layout/Sidebar'

// Dialogs are opened on demand, so they stay out of the initial bundle.
const UploadDialog = lazy(() =>
  import('@/components/documents/UploadDialog').then((m) => ({ default: m.UploadDialog })),
)
const SearchModal = lazy(() =>
  import('@/components/search/SearchModal').then((m) => ({ default: m.SearchModal })),
)
const DocumentDetailModal = lazy(() =>
  import('@/components/documents/DocumentDetailModal').then((m) => ({ default: m.DocumentDetailModal })),
)
import { useDocuments } from '@/hooks/useDocuments'
import { useGlobalFileDrop } from '@/hooks/useGlobalFileDrop'
import { useGlobalHotkeys } from '@/hooks/useHotkeys'
import { useThemeEffect } from '@/hooks/useTheme'
import { useUploadQueueProcessor } from '@/hooks/useUploadQueue'
import { useUiStore } from '@/store/useUiStore'

/** Drops a persisted scope that points at a document which no longer exists. */
function useScopeReconciliation() {
  const scopeDocumentId = useUiStore((state) => state.scopeDocumentId)
  const setScope = useUiStore((state) => state.setScope)
  const { data: documents, isSuccess } = useDocuments()

  useEffect(() => {
    if (!isSuccess || !scopeDocumentId) return
    if (!documents?.some((document) => document.id === scopeDocumentId)) setScope(null)
  }, [documents, isSuccess, scopeDocumentId, setScope])
}

function DropOverlay() {
  return (
    <div className="pointer-events-none fixed inset-0 z-40 animate-fade-in bg-[var(--overlay)] backdrop-blur-[2px]">
      <div className="absolute inset-6 grid place-items-center rounded-3xl border-2 border-dashed border-brand bg-app/60">
        <div className="text-center">
          <div className="mx-auto mb-4 grid size-16 place-items-center rounded-2xl bg-brand text-white shadow-lg">
            <UploadCloud className="size-8" aria-hidden />
          </div>
          <p className="text-lg font-semibold text-ink">Drop files to index them</p>
          <p className="mt-1 text-sm text-muted">They are parsed, chunked and embedded into pgvector.</p>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  useThemeEffect()
  useGlobalHotkeys()
  useUploadQueueProcessor()
  useScopeReconciliation()
  const dragging = useGlobalFileDrop()
  const sidebarOpen = useUiStore((state) => state.sidebarOpen)
  const setSidebarOpen = useUiStore((state) => state.setSidebarOpen)

  useEffect(preloadMarkdown, [])

  return (
    <div className="flex h-full flex-col overflow-hidden bg-app text-ink">
      <AppHeader />

      <div className="flex min-h-0 flex-1">
        <Sidebar className="hidden md:flex" />
        <ChatPanel />
      </div>

      {sidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 animate-fade-in bg-[var(--overlay)]"
            onClick={() => setSidebarOpen(false)}
            aria-hidden
          />
          <Sidebar className="absolute inset-y-0 left-0 max-w-[85vw] animate-rise shadow-2xl" />
        </div>
      )}

      {dragging && <DropOverlay />}

      <Suspense fallback={null}>
        <UploadDialog />
        <SearchModal />
        <DocumentDetailModal />
      </Suspense>
    </div>
  )
}
