import { useRef, useState, type DragEvent } from 'react'
import { UploadCloud } from 'lucide-react'
import { ACCEPT_ATTRIBUTE, SUPPORTED_HINT } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { useEnqueueUploads } from '@/hooks/useUploadQueue'
import { useUiStore } from '@/store/useUiStore'

export function UploadDropzone({ className }: { className?: string }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const enqueueUploads = useEnqueueUploads()
  const openUpload = useUiStore((state) => state.openUpload)

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return
    enqueueUploads(files)
    openUpload()
  }

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragging(false)
    handleFiles(event.dataTransfer.files)
  }

  return (
    <div className={cn('px-4 pt-4', className)}>
      <div
        onDragOver={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragLeave={(event) => {
          // Ignore bubbling from children.
          if (event.currentTarget.contains(event.relatedTarget as Node)) return
          setDragging(false)
        }}
        onDrop={onDrop}
        className={cn(
          'rounded-xl border-2 border-dashed px-4 py-7 text-center transition-colors',
          dragging ? 'border-brand bg-brand-soft' : 'border-line hover:border-line-2',
        )}
      >
        <div
          className={cn(
            'mx-auto mb-3 grid size-11 place-items-center rounded-full transition-colors',
            dragging ? 'bg-brand text-white' : 'bg-brand-soft text-brand-text',
          )}
        >
          <UploadCloud className="size-5.5" aria-hidden />
        </div>

        <p className="text-sm text-muted">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="font-semibold text-brand-text underline-offset-2 hover:underline"
          >
            Upload document
          </button>{' '}
          or drag here
        </p>
        <p className="mt-1.5 text-xs text-faint">{SUPPORTED_HINT}</p>

        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPT_ATTRIBUTE}
          className="sr-only"
          onChange={(event) => {
            handleFiles(event.target.files)
            // Allow re-selecting the same file after a failed attempt.
            event.target.value = ''
          }}
        />
      </div>
    </div>
  )
}
