import { useRef, useState, type DragEvent } from 'react'
import { AlertCircle, CheckCircle2, RotateCw, Trash2, UploadCloud, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { FileTypeTile } from '@/components/ui/FileTypeIcon'
import { ACCEPT_ATTRIBUTE, SUPPORTED_HINT } from '@/lib/constants'
import { cn, formatBytes, pluralize } from '@/lib/utils'
import { useEnqueueUploads } from '@/hooks/useUploadQueue'
import { isActive, useUploadStore, type UploadItem } from '@/store/useUploadStore'
import { useUiStore } from '@/store/useUiStore'

function statusLine(item: UploadItem): { text: string; tone: string } {
  switch (item.status) {
    case 'queued':
      return { text: 'Queued', tone: 'text-faint' }
    case 'uploading':
      return { text: `Uploading… ${item.progress}%`, tone: 'text-brand-text' }
    case 'indexing':
      return { text: 'Parsing, chunking & embedding…', tone: 'text-warn' }
    case 'success':
      return {
        text: `Indexed • ${pluralize(item.chunksCreated ?? 0, 'vector chunk')}`,
        tone: 'text-ok',
      }
    case 'canceled':
      return { text: 'Canceled', tone: 'text-muted' }
    case 'rejected':
    case 'error':
      return { text: item.error ?? 'Upload failed', tone: 'text-bad' }
    default:
      return { text: '', tone: 'text-muted' }
  }
}

function UploadRow({ item }: { item: UploadItem }) {
  const cancel = useUploadStore((state) => state.cancel)
  const retry = useUploadStore((state) => state.retry)
  const remove = useUploadStore((state) => state.remove)

  const { text, tone } = statusLine(item)
  const active = isActive(item)
  const failed = item.status === 'error' || item.status === 'rejected'
  const retryable = item.status === 'error' || item.status === 'canceled'

  return (
    <li className="flex items-start gap-3 rounded-xl border border-line bg-card px-3 py-3">
      <FileTypeTile filename={item.name} size="sm" className="mt-0.5" />

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <p className="min-w-0 flex-1 truncate text-sm font-medium text-ink" title={item.name}>
            {item.name}
          </p>
          <span className="shrink-0 text-xs text-faint">{formatBytes(item.size)}</span>
        </div>

        <div className="mt-2">
          {item.status === 'indexing' ? (
            <ProgressBar value={100} indeterminate tone="brand" label={`Indexing ${item.name}`} />
          ) : (
            <ProgressBar
              value={item.status === 'success' ? 100 : item.progress}
              tone={item.status === 'success' ? 'ok' : failed ? 'bad' : item.status === 'canceled' ? 'muted' : 'brand'}
              label={`Upload progress for ${item.name}`}
            />
          )}
        </div>

        <p className={cn('mt-1.5 text-xs', tone)}>{text}</p>
      </div>

      <div className="flex shrink-0 items-center gap-1 pt-0.5">
        {item.status === 'success' && <CheckCircle2 className="size-4 text-ok" aria-hidden />}
        {failed && <AlertCircle className="size-4 text-bad" aria-hidden />}

        {active && (
          <button
            type="button"
            onClick={() => cancel(item.id)}
            aria-label={`Cancel upload of ${item.name}`}
            title="Cancel"
            className="grid size-7 place-items-center rounded-md text-faint transition-colors hover:bg-card-2 hover:text-ink"
          >
            <X className="size-4" aria-hidden />
          </button>
        )}

        {retryable && (
          <button
            type="button"
            onClick={() => retry(item.id)}
            aria-label={`Retry upload of ${item.name}`}
            title="Retry"
            className="grid size-7 place-items-center rounded-md text-faint transition-colors hover:bg-card-2 hover:text-ink"
          >
            <RotateCw className="size-4" aria-hidden />
          </button>
        )}

        {!active && (
          <button
            type="button"
            onClick={() => remove(item.id)}
            aria-label={`Remove ${item.name} from the list`}
            title="Remove from list"
            className="grid size-7 place-items-center rounded-md text-faint transition-colors hover:bg-card-2 hover:text-bad"
          >
            <Trash2 className="size-4" aria-hidden />
          </button>
        )}
      </div>
    </li>
  )
}

export function UploadDialog() {
  const open = useUiStore((state) => state.uploadOpen)
  const closeUpload = useUiStore((state) => state.closeUpload)

  const items = useUploadStore((state) => state.items)
  const clearFinished = useUploadStore((state) => state.clearFinished)
  const cancelAll = useUploadStore((state) => state.cancelAll)
  const enqueueUploads = useEnqueueUploads()

  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const inFlight = items.filter(isActive).length
  const succeeded = items.filter((item) => item.status === 'success').length
  const failed = items.filter((item) => item.status === 'error' || item.status === 'rejected').length

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragging(false)
    enqueueUploads(event.dataTransfer.files)
  }

  return (
    <Modal
      open={open}
      onClose={closeUpload}
      width="lg"
      title="Upload Documents"
      subtitle={
        <span className="text-muted">
          Each file is parsed, chunked and embedded into pgvector before it becomes searchable.
        </span>
      }
      icon={
        <div className="grid size-10 shrink-0 place-items-center rounded-xl border border-brand-line bg-brand-soft text-brand-text">
          <UploadCloud className="size-5" aria-hidden />
        </div>
      }
      bodyClassName="px-5 py-5 sm:px-6"
      footer={
        <>
          <p className="text-xs text-muted">
            {items.length === 0
              ? 'No files selected yet.'
              : [
                  inFlight > 0 ? `${inFlight} in progress` : null,
                  succeeded > 0 ? `${succeeded} indexed` : null,
                  failed > 0 ? `${failed} failed` : null,
                ]
                  .filter(Boolean)
                  .join(' • ') || `${items.length} queued`}
          </p>

          <div className="ml-auto flex items-center gap-2">
            {inFlight > 0 && (
              <Button variant="ghost" size="sm" onClick={cancelAll}>
                Cancel all
              </Button>
            )}
            {items.length > inFlight && (
              <Button variant="ghost" size="sm" onClick={clearFinished}>
                Clear finished
              </Button>
            )}
            <Button variant="primary" onClick={closeUpload} data-autofocus>
              {inFlight > 0 ? 'Continue in background' : 'Done'}
            </Button>
          </div>
        </>
      }
    >
      <div
        onDragOver={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragLeave={(event) => {
          if (event.currentTarget.contains(event.relatedTarget as Node)) return
          setDragging(false)
        }}
        onDrop={onDrop}
        className={cn(
          'rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors',
          dragging ? 'border-brand bg-brand-soft' : 'border-line',
        )}
      >
        <div
          className={cn(
            'mx-auto mb-3 grid size-12 place-items-center rounded-full transition-colors',
            dragging ? 'bg-brand text-white' : 'bg-brand-soft text-brand-text',
          )}
        >
          <UploadCloud className="size-6" aria-hidden />
        </div>
        <p className="text-sm text-muted">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="font-semibold text-brand-text underline-offset-2 hover:underline"
          >
            Choose files
          </button>{' '}
          or drop them here — single or multiple.
        </p>
        <p className="mt-1.5 text-xs text-faint">{SUPPORTED_HINT}</p>

        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPT_ATTRIBUTE}
          className="sr-only"
          onChange={(event) => {
            enqueueUploads(event.target.files)
            event.target.value = ''
          }}
        />
      </div>

      {items.length > 0 && (
        <ul className="mt-4 space-y-2.5">
          {items.map((item) => (
            <UploadRow key={item.id} item={item} />
          ))}
        </ul>
      )}
    </Modal>
  )
}
