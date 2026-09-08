import { Info, Layers } from 'lucide-react'
import { FileTypeTile } from '@/components/ui/FileTypeIcon'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { cn, formatBytes, pluralize } from '@/lib/utils'
import type { DocumentMetadataDto } from '@/types/api'

export interface DocumentCardProps {
  document: DocumentMetadataDto
  selected: boolean
  onSelect: () => void
  onOpenDetails: () => void
}

export function DocumentCard({ document, selected, onSelect, onOpenDetails }: DocumentCardProps) {
  const pages = document.totalPages ? `${document.totalPages}p` : null
  const meta = [formatBytes(document.fileSize), pages].filter(Boolean).join(' • ')

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-xl border transition-colors',
        selected ? 'border-brand-line bg-brand-soft' : 'border-line bg-card hover:border-line-2',
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        title={`Scope chat to ${document.filename}`}
        className="flex w-full items-start gap-3 px-3 py-3 text-left"
      >
        <FileTypeTile filename={document.filename} size="sm" className="mt-0.5" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-ink">{document.filename}</span>
          <span className="mt-0.5 block text-xs text-faint">{meta}</span>
        </span>
      </button>

      <div className="flex items-center justify-between border-t border-line px-3 py-2">
        <span className="inline-flex items-center gap-1.5 text-xs text-muted">
          <Layers className="size-3.5" aria-hidden />
          {pluralize(document.totalChunks ?? 0, 'chunk')}
        </span>

        <div className="flex items-center gap-1">
          <StatusBadge status={document.status} />
          <button
            type="button"
            onClick={onOpenDetails}
            aria-label={`View details for ${document.filename}`}
            title="View chunks & details"
            className={cn(
              'grid size-6 place-items-center rounded-md text-faint transition-all',
              'opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:bg-card-2 hover:text-ink',
              selected && 'opacity-100',
            )}
          >
            <Info className="size-3.5" aria-hidden />
          </button>
        </div>
      </div>

      {document.status === 'FAILED' && document.errorMessage && (
        <p className="border-t border-line bg-bad-soft px-3 py-2 text-xs text-bad">{document.errorMessage}</p>
      )}
    </div>
  )
}
