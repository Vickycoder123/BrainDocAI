import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  Calendar,
  FileText,
  HardDrive,
  Layers,
  Loader2,
  MessageSquare,
  Trash2,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { CopyButton } from '@/components/ui/CopyButton'
import { EmptyState } from '@/components/ui/EmptyState'
import { FileTypeTile } from '@/components/ui/FileTypeIcon'
import { Modal } from '@/components/ui/Modal'
import { StatusPill } from '@/components/ui/StatusBadge'
import { useDeleteDocument, useDocument, useDocumentChunks } from '@/hooks/useDocuments'
import {
  cn,
  errorMessage,
  formatBytes,
  formatDate,
  formatDateTime,
  formatPercent,
  truncateMiddle,
} from '@/lib/utils'
import { useUiStore } from '@/store/useUiStore'

function StatCard({
  icon: Icon,
  label,
  value,
  title,
}: {
  icon: LucideIcon
  label: string
  value: string
  title?: string
}) {
  return (
    <div className="rounded-xl border border-line bg-card px-3.5 py-3" title={title}>
      <div className="flex items-center gap-2 text-xs text-muted">
        <Icon className="size-4 shrink-0" aria-hidden />
        <span className="truncate">{label}</span>
      </div>
      <p className="mt-1.5 truncate text-base font-bold text-ink">{value}</p>
    </div>
  )
}

export function DocumentDetailModal() {
  const documentId = useUiStore((state) => state.detailDocumentId)
  const closeDocumentDetail = useUiStore((state) => state.closeDocumentDetail)
  const setScope = useUiStore((state) => state.setScope)

  const document = useDocument(documentId)
  const { data: chunks, isPending: chunksPending, isError: chunksError, error } = useDocumentChunks(document)
  const deleteMutation = useDeleteDocument()

  const [confirmingDelete, setConfirmingDelete] = useState(false)

  // Reset the destructive-action guard whenever the dialog switches document.
  useEffect(() => setConfirmingDelete(false), [documentId])

  const open = Boolean(documentId)
  if (!open) return null

  // The document was deleted (or never existed) while the dialog was open.
  if (!document) {
    return (
      <Modal open onClose={closeDocumentDetail} title="Document unavailable" width="md">
        <EmptyState
          icon={AlertTriangle}
          description="This document is no longer in the knowledge base."
          action={<Button onClick={closeDocumentDetail}>Close</Button>}
        />
      </Modal>
    )
  }

  const onDelete = () => {
    if (!confirmingDelete) {
      setConfirmingDelete(true)
      return
    }
    deleteMutation.mutate(document.id, { onSuccess: closeDocumentDetail })
  }

  const onChat = () => {
    setScope(document.id)
    closeDocumentDetail()
  }

  return (
    <Modal
      open
      onClose={closeDocumentDetail}
      width="xl"
      title={document.filename}
      icon={<FileTypeTile filename={document.filename} size="lg" />}
      subtitle={
        <>
          <span className="font-mono text-xs text-faint" title={document.id}>
            {truncateMiddle(document.id, 8, 4)}
          </span>
          <CopyButton value={document.id} label="Copy document ID" iconClassName="size-3.5" />
          <span className="size-1 rounded-full bg-line-2" aria-hidden />
          <StatusPill status={document.status} />
        </>
      }
      bodyClassName=""
      footer={
        <>
          <Button
            variant="danger"
            onClick={onDelete}
            loading={deleteMutation.isPending}
            className={cn(confirmingDelete && 'bg-bad-soft')}
          >
            <Trash2 className="size-4" aria-hidden />
            {confirmingDelete ? 'Confirm delete' : 'Delete Document'}
          </Button>

          {confirmingDelete && !deleteMutation.isPending && (
            <button
              type="button"
              onClick={() => setConfirmingDelete(false)}
              className="text-xs text-muted underline-offset-2 hover:text-ink hover:underline"
            >
              Cancel
            </button>
          )}

          <div className="ml-auto flex items-center gap-2">
            <Button onClick={closeDocumentDetail}>Close</Button>
            <Button variant="primary" onClick={onChat} data-autofocus>
              <MessageSquare className="size-4" aria-hidden />
              Chat with Document
            </Button>
          </div>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3 border-b border-line bg-card-2/40 px-5 py-5 sm:px-6 lg:grid-cols-4">
        <StatCard icon={HardDrive} label="File Size" value={formatBytes(document.fileSize)} />
        <StatCard icon={Layers} label="Vector Chunks" value={`${document.totalChunks ?? 0} Chunks`} />
        <StatCard icon={FileText} label="Total Pages" value={`${document.totalPages ?? 0} Pages`} />
        <StatCard
          icon={Calendar}
          label="Uploaded"
          value={formatDate(document.createdAt)}
          title={formatDateTime(document.createdAt)}
        />
      </div>

      {document.status === 'FAILED' && document.errorMessage && (
        <div className="border-b border-line bg-bad-soft px-5 py-3.5 sm:px-6">
          <p className="flex items-start gap-2 text-sm text-bad">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>{document.errorMessage}</span>
          </p>
        </div>
      )}

      <div className="px-5 py-5 sm:px-6">
        <div className="mb-3.5 flex items-baseline justify-between gap-4">
          <h3 className="text-xs font-bold tracking-wider text-muted uppercase">Indexed Vector Chunks</h3>
          <span className="text-xs font-bold tracking-wider text-faint uppercase">Sample Chunks</span>
        </div>

        {document.status !== 'INDEXED' && (
          <EmptyState
            icon={Layers}
            description="Chunks appear once the document finishes indexing into pgvector."
          />
        )}

        {document.status === 'INDEXED' && chunksPending && (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Loading vector chunks…
          </div>
        )}

        {document.status === 'INDEXED' && chunksError && (
          <EmptyState icon={AlertTriangle} tone="danger" description={errorMessage(error)} />
        )}

        {document.status === 'INDEXED' && !chunksPending && !chunksError && (chunks?.length ?? 0) === 0 && (
          <EmptyState
            icon={Layers}
            description="No chunks came back from the vector store for this document."
          />
        )}

        <div className="space-y-3">
          {chunks?.map((chunk, index) => (
            <article
              key={`${chunk.chunkIndex ?? index}-${index}`}
              className="rounded-xl border border-line bg-card-2/50 px-4 py-3.5"
            >
              <header className="mb-2 flex items-center justify-between gap-3">
                <h4 className="text-sm font-semibold text-ink">
                  Chunk #{chunk.chunkIndex ?? index}
                </h4>
                <div className="flex shrink-0 items-center gap-2.5 text-[11px] text-faint">
                  {chunk.pageNumber != null && <span>page {chunk.pageNumber}</span>}
                  {chunk.similarityScore != null && (
                    <span title="Cosine similarity to the document-title probe query">
                      {formatPercent(chunk.similarityScore, 0)}
                    </span>
                  )}
                  {chunk.snippet && (
                    <CopyButton value={chunk.snippet} label="Copy chunk text" iconClassName="size-3.5" />
                  )}
                </div>
              </header>
              <p className="line-clamp-6 font-mono text-[13px] leading-relaxed break-words whitespace-pre-wrap text-muted">
                {chunk.snippet}
              </p>
            </article>
          ))}
        </div>
      </div>
    </Modal>
  )
}
