import { useMemo, useState } from 'react'
import { AlertTriangle, Copy, Database, FileStack, RefreshCw, Search, X } from 'lucide-react'
import { DocumentCard } from '@/components/documents/DocumentCard'
import { UploadDropzone } from '@/components/documents/UploadDropzone'
import { Button } from '@/components/ui/Button'
import { EmptyState, Skeleton } from '@/components/ui/EmptyState'
import { useDocuments } from '@/hooks/useDocuments'
import { cn, errorMessage } from '@/lib/utils'
import { useUiStore } from '@/store/useUiStore'

export function Sidebar({ className }: { className?: string }) {
  const [filter, setFilter] = useState('')
  const { data: documents, isPending, isError, error, refetch, isFetching } = useDocuments()

  const scopeDocumentId = useUiStore((state) => state.scopeDocumentId)
  const setScopeRaw = useUiStore((state) => state.setScope)
  const openDocumentDetail = useUiStore((state) => state.openDocumentDetail)
  const setSidebarOpen = useUiStore((state) => state.setSidebarOpen)

  // On mobile the sidebar is a drawer; picking a scope should dismiss it.
  const setScope = (id: string | null) => {
    setScopeRaw(id)
    setSidebarOpen(false)
  }

  const filtered = useMemo(() => {
    const list = documents ?? []
    const needle = filter.trim().toLowerCase()
    if (!needle) return list
    return list.filter((document) => document.filename?.toLowerCase().includes(needle))
  }, [documents, filter])

  const total = documents?.length ?? 0

  return (
    <aside
      className={cn(
        'flex w-[336px] shrink-0 flex-col overflow-hidden border-r border-line bg-panel',
        className,
      )}
    >
      <div className="flex items-center gap-3 border-b border-line px-4 py-4">
        <div className="grid size-9 place-items-center rounded-lg border border-brand-line bg-brand-soft text-brand-text">
          <Database className="size-4.5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-base leading-tight font-bold text-ink">Knowledge Base</h2>
          <p className="text-xs text-muted">Indexed vector documents</p>
        </div>
        <button
          type="button"
          onClick={() => void refetch()}
          aria-label="Refresh document list"
          title="Refresh"
          className="grid size-8 place-items-center rounded-lg text-faint transition-colors hover:bg-card-2 hover:text-ink"
        >
          <RefreshCw className={cn('size-4', isFetching && 'animate-spin')} aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close knowledge base"
          className="grid size-8 place-items-center rounded-lg text-faint transition-colors hover:bg-card-2 hover:text-ink md:hidden"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>

      <UploadDropzone />

      {/* Corpus-wide scope */}
      <div className="px-4 pt-4">
        <button
          type="button"
          onClick={() => setScope(null)}
          aria-pressed={scopeDocumentId === null}
          className={cn(
            'flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors',
            scopeDocumentId === null
              ? 'border-brand-line bg-brand-soft'
              : 'border-line bg-card hover:border-line-2',
          )}
        >
          <span
            className={cn(
              'grid size-9 shrink-0 place-items-center rounded-lg',
              scopeDocumentId === null ? 'bg-brand text-white' : 'bg-card-2 text-muted',
            )}
          >
            <FileStack className="size-4.5" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-ink">All Documents</span>
            <span className="block truncate text-xs text-faint">Search across complete corpus</span>
          </span>
          <span
            className={cn(
              'shrink-0 rounded-md px-2 py-1 text-xs font-bold',
              scopeDocumentId === null ? 'bg-brand text-white' : 'bg-card-2 text-muted',
            )}
          >
            {total}
          </span>
        </button>
      </div>

      {/* Filter */}
      <div className="px-4 pt-3 pb-3">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-faint" aria-hidden />
          <input
            type="search"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            placeholder="Filter files..."
            aria-label="Filter documents by name"
            className="h-9.5 w-full rounded-lg border border-line bg-card pr-3 pl-9 text-sm transition-colors outline-none focus:border-brand focus:ring-2 focus:ring-[var(--ring)]"
          />
        </div>
      </div>

      <div className="flex items-center justify-between border-y border-line bg-card-2/50 px-4 py-2">
        <span className="text-[11px] font-bold tracking-wider text-faint uppercase">
          Documents ({filtered.length})
        </span>
        <span className="text-[11px] font-bold tracking-wider text-faint uppercase">Status</span>
      </div>

      <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-4 py-3 scrollbar-thin">
        {isPending &&
          Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-[86px] w-full" />)}

        {isError && (
          <EmptyState
            icon={AlertTriangle}
            tone="danger"
            title="Backend unreachable"
            description={errorMessage(error)}
            action={
              <Button size="sm" onClick={() => void refetch()}>
                <RefreshCw className="size-4" aria-hidden />
                Retry
              </Button>
            }
          />
        )}

        {!isPending && !isError && filtered.length === 0 && (
          <EmptyState
            icon={total === 0 ? FileStack : Copy}
            title={total === 0 ? 'No documents yet' : 'No matches'}
            description={
              total === 0
                ? 'Upload a PDF, Word file or Markdown note to build your vector knowledge base.'
                : `Nothing matches “${filter}”.`
            }
          />
        )}

        {filtered.map((document) => (
          <DocumentCard
            key={document.id}
            document={document}
            selected={scopeDocumentId === document.id}
            onSelect={() => setScope(scopeDocumentId === document.id ? null : document.id)}
            onOpenDetails={() => openDocumentDetail(document.id)}
          />
        ))}
      </div>

      <footer className="shrink-0 border-t border-line px-4 py-3">
        <p className="text-center text-[11px] leading-relaxed text-faint">
          © {new Date().getFullYear()}{' '}
          <a
            href="https://github.com/Vickycoder123"
            target="_blank"
            rel="noreferrer noopener"
            className="font-medium text-muted transition-colors hover:text-brand-text"
          >
            Vickycoder123
          </a>
          . All rights reserved.
        </p>
      </footer>
    </aside>
  )
}
