import { useState } from 'react'
import { ChevronDown, Quote } from 'lucide-react'
import { FileTypeIcon } from '@/components/ui/FileTypeIcon'
import { cn, formatPercent, pluralize } from '@/lib/utils'
import { useUiStore } from '@/store/useUiStore'
import type { CitationDto } from '@/types/api'

export function Citations({ citations }: { citations: CitationDto[] }) {
  const [open, setOpen] = useState(false)
  const openDocumentDetail = useUiStore((state) => state.openDocumentDetail)

  if (citations.length === 0) return null

  return (
    <div className="mt-1">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 rounded-lg text-xs font-medium text-muted transition-colors hover:text-ink"
      >
        <Quote className="size-3.5" aria-hidden />
        {pluralize(citations.length, 'source')}
        <ChevronDown className={cn('size-3.5 transition-transform', open && 'rotate-180')} aria-hidden />
      </button>

      {open && (
        <ol className="mt-2.5 space-y-2 animate-fade-in">
          {citations.map((citation, index) => {
            const location = [
              citation.pageNumber != null ? `p.${citation.pageNumber}` : null,
              citation.chunkIndex != null ? `chunk #${citation.chunkIndex}` : null,
              citation.similarityScore != null ? formatPercent(citation.similarityScore, 0) : null,
            ]
              .filter(Boolean)
              .join(' • ')

            return (
              <li key={`${citation.documentId}-${citation.chunkIndex}-${index}`}>
                <div className="rounded-lg border border-line bg-sunken px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="grid size-5 shrink-0 place-items-center rounded bg-brand-soft text-[10px] font-bold text-brand-text">
                      {index + 1}
                    </span>

                    {citation.documentId ? (
                      <button
                        type="button"
                        onClick={() => openDocumentDetail(citation.documentId as string)}
                        className="inline-flex min-w-0 items-center gap-1.5 text-xs font-semibold text-ink hover:text-brand-text"
                        title="Open document details"
                      >
                        <FileTypeIcon filename={citation.fileName} className="size-3.5 shrink-0" />
                        <span className="truncate">{citation.fileName ?? 'Unknown source'}</span>
                      </button>
                    ) : (
                      <span className="inline-flex min-w-0 items-center gap-1.5 text-xs font-semibold text-ink">
                        <FileTypeIcon filename={citation.fileName} className="size-3.5 shrink-0" />
                        <span className="truncate">{citation.fileName ?? 'Unknown source'}</span>
                      </span>
                    )}

                    {location && <span className="ml-auto shrink-0 text-[11px] text-faint">{location}</span>}
                  </div>

                  {citation.snippet && (
                    <p className="mt-2 line-clamp-3 font-mono text-[11px] leading-relaxed text-muted">
                      {citation.snippet}
                    </p>
                  )}
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}
