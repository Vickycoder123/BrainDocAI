import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { useMutation } from '@tanstack/react-query'
import { AlertTriangle, Loader2, Search, Sparkles, X } from 'lucide-react'
import { searchSimilarChunks } from '@/api/chat'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { FileTypeIcon } from '@/components/ui/FileTypeIcon'
import { Modal } from '@/components/ui/Modal'
import { DEFAULT_SEARCH_TOP_K } from '@/lib/constants'
import { cn, errorMessage, formatPercent, pluralize } from '@/lib/utils'
import { useDocuments } from '@/hooks/useDocuments'
import { useUiStore } from '@/store/useUiStore'
import type { CitationDto, SearchResultDto } from '@/types/api'

/** Highlights whole-word query terms inside a chunk snippet. */
function Highlighted({ text, terms }: { text: string; terms: string[] }) {
  const parts = useMemo(() => {
    if (terms.length === 0) return [text]
    const escaped = terms.map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    return text.split(new RegExp(`(${escaped.join('|')})`, 'gi'))
  }, [text, terms])

  const lowered = terms.map((term) => term.toLowerCase())

  return (
    <>
      {parts.map((part, index) =>
        lowered.includes(part.toLowerCase()) ? (
          <mark key={index} className="rounded bg-brand-soft px-0.5 text-brand-text">
            {part}
          </mark>
        ) : (
          <span key={index}>{part}</span>
        ),
      )}
    </>
  )
}

function ResultCard({
  match,
  rank,
  terms,
  onOpenDocument,
}: {
  match: CitationDto
  rank: number
  terms: string[]
  onOpenDocument: (id: string) => void
}) {
  const location = [
    match.pageNumber != null ? `page ${match.pageNumber}` : null,
    match.chunkIndex != null ? `chunk #${match.chunkIndex}` : null,
  ]
    .filter(Boolean)
    .join(' • ')

  return (
    <li className="rounded-xl border border-line bg-card px-4 py-3.5 transition-colors hover:border-line-2">
      <div className="flex items-center gap-2.5">
        <span className="grid size-6 shrink-0 place-items-center rounded-md bg-brand-soft text-[11px] font-bold text-brand-text">
          {rank}
        </span>

        {match.documentId ? (
          <button
            type="button"
            onClick={() => onOpenDocument(match.documentId as string)}
            className="inline-flex min-w-0 items-center gap-1.5 text-sm font-semibold text-ink hover:text-brand-text"
            title="Open document details"
          >
            <FileTypeIcon filename={match.fileName} className="size-4 shrink-0" />
            <span className="truncate">{match.fileName ?? 'Unknown source'}</span>
          </button>
        ) : (
          <span className="inline-flex min-w-0 items-center gap-1.5 text-sm font-semibold text-ink">
            <FileTypeIcon filename={match.fileName} className="size-4 shrink-0" />
            <span className="truncate">{match.fileName ?? 'Unknown source'}</span>
          </span>
        )}

        <div className="ml-auto flex shrink-0 items-center gap-2.5 text-[11px] text-faint">
          {location && <span>{location}</span>}
          {match.similarityScore != null && (
            <span
              className="rounded-md border border-line bg-sunken px-1.5 py-0.5 font-medium text-muted"
              title="Cosine similarity"
            >
              {formatPercent(match.similarityScore, 1)}
            </span>
          )}
        </div>
      </div>

      {match.snippet && (
        <p className="mt-2.5 max-h-40 overflow-y-auto font-mono text-[12.5px] leading-relaxed break-words whitespace-pre-wrap text-muted scrollbar-thin">
          <Highlighted text={match.snippet} terms={terms} />
        </p>
      )}
    </li>
  )
}

export function SearchModal() {
  const open = useUiStore((state) => state.searchOpen)
  const prefill = useUiStore((state) => state.searchPrefill)
  const closeSearch = useUiStore((state) => state.closeSearch)
  const openDocumentDetail = useUiStore((state) => state.openDocumentDetail)
  const scopeDocumentId = useUiStore((state) => state.scopeDocumentId)

  const { data: documents } = useDocuments()
  const scoped = scopeDocumentId ? documents?.find((d) => d.id === scopeDocumentId) : undefined

  const [query, setQuery] = useState('')
  const [scopeToDocument, setScopeToDocument] = useState(true)
  const lastQueryRef = useRef('')

  const search = useMutation<SearchResultDto, Error, string>({
    mutationFn: (value: string) =>
      searchSimilarChunks({
        query: value,
        documentId: scopeToDocument ? scopeDocumentId : null,
        topK: DEFAULT_SEARCH_TOP_K,
      }),
  })

  // Reset per-open so a stale result never flashes behind a new search.
  useEffect(() => {
    if (open) {
      setQuery(prefill)
      lastQueryRef.current = ''
      search.reset()
    }
    // `search` is a stable mutation object from React Query.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, prefill])

  const terms = useMemo(
    () =>
      lastQueryRef.current
        .split(/\s+/)
        .map((term) => term.trim())
        .filter((term) => term.length > 2),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [search.data],
  )

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    const value = query.trim()
    if (!value || search.isPending) return
    lastQueryRef.current = value
    search.mutate(value)
  }

  const matches = search.data?.matches ?? []

  return (
    <Modal
      open={open}
      onClose={closeSearch}
      width="lg"
      title="Semantic Vector Similarity Search"
      icon={
        <div className="grid size-10 shrink-0 place-items-center rounded-xl border border-brand-line bg-brand-soft text-brand-text">
          <Search className="size-5" aria-hidden />
        </div>
      }
      bodyClassName=""
    >
      <form onSubmit={onSubmit} className="border-b border-line px-5 py-4 sm:px-6">
        <div className="flex gap-3">
          <div className="relative min-w-0 flex-1">
            <Search
              className="pointer-events-none absolute top-1/2 left-3.5 size-4.5 -translate-y-1/2 text-faint"
              aria-hidden
            />
            <input
              data-autofocus
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search concepts, clauses, or facts across vector chunks..."
              aria-label="Search query"
              className={cn(
                'h-11 w-full rounded-xl border border-line bg-card pr-3 pl-11 text-[15px]',
                'transition-colors outline-none focus:border-brand focus:ring-2 focus:ring-[var(--ring)]',
              )}
            />
          </div>
          <Button type="submit" variant="primary" size="lg" loading={search.isPending} disabled={!query.trim()}>
            Search
          </Button>
        </div>

        {scoped && (
          <div className="mt-3 flex items-center gap-2 text-xs">
            <span className="text-muted">Scope:</span>
            {scopeToDocument ? (
              <button
                type="button"
                onClick={() => setScopeToDocument(false)}
                className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-brand-line bg-brand-soft px-2.5 py-1 font-medium text-brand-text"
                title="Search all documents instead"
              >
                <FileTypeIcon filename={scoped.filename} className="size-3.5 shrink-0" />
                <span className="truncate">{scoped.filename}</span>
                <X className="size-3.5 shrink-0" aria-hidden />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setScopeToDocument(true)}
                className="rounded-full border border-line bg-card px-2.5 py-1 font-medium text-muted hover:text-ink"
              >
                All documents — restrict to {scoped.filename}?
              </button>
            )}
          </div>
        )}
      </form>

      <div className="min-h-[18rem] px-5 py-5 sm:px-6">
        {search.isPending && (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Embedding your query and scanning pgvector…
          </div>
        )}

        {!search.isPending && search.isError && (
          <EmptyState icon={AlertTriangle} tone="danger" description={errorMessage(search.error)} />
        )}

        {!search.isPending && !search.isError && !search.data && (
          <EmptyState icon={Sparkles} description="Type a search term above to inspect matching vector chunks." />
        )}

        {!search.isPending && !search.isError && search.data && matches.length === 0 && (
          <EmptyState
            icon={Search}
            title="No matching chunks"
            description={`Nothing in the vector store came back for “${search.data.query}”.`}
          />
        )}

        {!search.isPending && matches.length > 0 && (
          <>
            <p className="mb-3 text-xs text-muted">
              {pluralize(search.data?.totalMatches ?? matches.length, 'match', 'matches')} for{' '}
              <span className="font-medium text-ink">“{search.data?.query}”</span>
            </p>
            <ul className="space-y-2.5">
              {matches.map((match, index) => (
                <ResultCard
                  key={`${match.documentId}-${match.chunkIndex}-${index}`}
                  match={match}
                  rank={index + 1}
                  terms={terms}
                  onOpenDocument={(id) => {
                    closeSearch()
                    openDocumentDetail(id)
                  }}
                />
              ))}
            </ul>
          </>
        )}
      </div>
    </Modal>
  )
}
