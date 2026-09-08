import { BookOpen, ExternalLink, Menu, Moon, Search, Sparkles, Sun } from 'lucide-react'
import { useDocuments } from '@/hooks/useDocuments'
import { useTheme } from '@/hooks/useTheme'
import { SWAGGER_URL } from '@/lib/http'
import { cn } from '@/lib/utils'
import { useUiStore } from '@/store/useUiStore'

function ScopePill() {
  const scopeDocumentId = useUiStore((state) => state.scopeDocumentId)
  const { data: documents } = useDocuments()

  const scoped = scopeDocumentId ? documents?.find((d) => d.id === scopeDocumentId) : undefined
  const label = scoped ? scoped.filename : `All Documents (${documents?.length ?? 0})`

  return (
    <div
      className="inline-flex max-w-[min(46vw,30rem)] items-center gap-2.5 rounded-full border border-line bg-card px-4 py-2"
      title={scoped ? `Retrieval is scoped to ${scoped.filename}` : 'Retrieval spans every indexed document'}
    >
      <span className="size-2 shrink-0 rounded-full bg-brand" aria-hidden />
      <span className="shrink-0 text-sm text-muted">Scope:</span>
      <span className="truncate text-sm font-semibold text-ink">{label}</span>
    </div>
  )
}

export function AppHeader() {
  const { theme, toggleTheme } = useTheme()
  const openSearch = useUiStore((state) => state.openSearch)
  const setSidebarOpen = useUiStore((state) => state.setSidebarOpen)

  return (
    <header className="flex h-[74px] shrink-0 items-center gap-4 border-b border-line bg-panel px-4 sm:px-5">
      <button
        type="button"
        onClick={() => setSidebarOpen(true)}
        aria-label="Open knowledge base"
        className="grid size-9.5 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-card-2 hover:text-ink md:hidden"
      >
        <Menu className="size-5" aria-hidden />
      </button>

      {/* Brand */}
      <div className="flex shrink-0 items-center gap-3">
        <div className="relative">
          <div className="grid size-11 place-items-center rounded-xl bg-brand text-white shadow-sm">
            <BookOpen className="size-6" aria-hidden />
          </div>
          <span
            className="absolute -bottom-0.5 -left-0.5 size-3 rounded-full border-2 border-panel bg-ok"
            title="Frontend connected"
            aria-hidden
          />
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-lg leading-tight font-extrabold tracking-tight text-brand-text">BrainDoc</h1>
            <span className="hidden items-center gap-1 rounded-md border border-brand-line bg-brand-soft px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-brand-text sm:inline-flex">
              <Sparkles className="size-3" aria-hidden />
              AI RAG
            </span>
          </div>
          <p className="hidden text-xs text-muted lg:block">Spring AI • PostgreSQL pgvector • Gemini</p>
        </div>
      </div>

      {/* Scope */}
      <div className="flex min-w-0 flex-1 justify-center">
        <ScopePill />
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={() => openSearch()}
          className={cn(
            'inline-flex h-9.5 items-center gap-2 rounded-lg border border-line bg-card px-3',
            'text-sm text-muted transition-colors hover:border-line-2 hover:text-ink',
          )}
        >
          <Search className="size-4" aria-hidden />
          <span className="hidden sm:inline">Search Chunks</span>
          <kbd className="ml-1 hidden rounded border border-line bg-sunken px-1.5 py-0.5 text-[10px] text-faint md:inline">
            ⌘K
          </kbd>
        </button>

        <a
          href={SWAGGER_URL}
          target="_blank"
          rel="noreferrer"
          className="hidden h-9.5 items-center gap-1.5 rounded-lg px-3 text-sm text-muted transition-colors hover:bg-card-2 hover:text-ink lg:inline-flex"
        >
          Swagger API
          <ExternalLink className="size-3.5" aria-hidden />
        </a>

        <button
          type="button"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
          className="grid size-9.5 place-items-center rounded-lg text-muted transition-colors hover:bg-card-2 hover:text-ink"
        >
          {theme === 'dark' ? <Sun className="size-5" aria-hidden /> : <Moon className="size-5" aria-hidden />}
        </button>
      </div>
    </header>
  )
}
