import { useCallback, useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { uploadDocument } from '@/api/documents'
import { documentKeys } from '@/hooks/useDocuments'
import { errorMessage, isAbortError, pluralize } from '@/lib/utils'
import { useUploadStore } from '@/store/useUploadStore'

/**
 * Two at a time: enough to hide latency on small files without hammering the
 * embedding API, which the backend calls synchronously during upload.
 */
const UPLOAD_CONCURRENCY = 2

/**
 * Drains the upload queue. Mounted once at the app root so uploads keep running
 * (and keep updating the sidebar) even after the upload dialog is closed.
 */
export function useUploadQueueProcessor(): void {
  const items = useUploadStore((state) => state.items)
  const patch = useUploadStore((state) => state.patch)
  const registerController = useUploadStore((state) => state.registerController)
  const queryClient = useQueryClient()
  const runningRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    const running = runningRef.current

    const startNext = () => {
      while (running.size < UPLOAD_CONCURRENCY) {
        const next = useUploadStore
          .getState()
          .items.find((item) => item.status === 'queued' && !running.has(item.id))
        if (!next) return

        running.add(next.id)
        const controller = new AbortController()
        registerController(next.id, controller)
        patch(next.id, { status: 'uploading', progress: 0, error: undefined })

        uploadDocument(next.file, {
          signal: controller.signal,
          onProgress: (progress) => patch(next.id, { progress }),
          onIndexingStart: () => patch(next.id, { status: 'indexing', progress: 100 }),
        })
          .then((response) => {
            patch(next.id, {
              status: 'success',
              progress: 100,
              documentId: response.id,
              chunksCreated: response.chunksCreated ?? 0,
            })
            toast.success(`Indexed ${next.name}`, {
              description: `${pluralize(response.chunksCreated ?? 0, 'vector chunk')} written to pgvector.`,
            })
            void queryClient.invalidateQueries({ queryKey: documentKeys.all })
          })
          .catch((error: unknown) => {
            if (isAbortError(error)) {
              patch(next.id, { status: 'canceled' })
              return
            }
            const message = errorMessage(error, 'Upload failed.')
            patch(next.id, { status: 'error', error: message })
            toast.error(`Could not index ${next.name}`, { description: message })
            // A partially-created row may exist server-side; refresh either way.
            void queryClient.invalidateQueries({ queryKey: documentKeys.all })
          })
          .finally(() => {
            running.delete(next.id)
            // Freeing a slot doesn't re-render on its own; the patch above does,
            // but call through anyway so a no-op patch can't stall the queue.
            startNext()
          })
      }
    }

    startNext()
  }, [items, patch, registerController, queryClient])
}

/** Opens the upload dialog and enqueues files, reporting anything rejected up front. */
export function useEnqueueUploads() {
  const enqueue = useUploadStore((state) => state.enqueue)

  return useCallback(
    (files: File[] | FileList | null | undefined): number => {
      const list = Array.from(files ?? [])
      if (list.length === 0) return 0

      const created = enqueue(list)
      const rejected = created.filter((item) => item.status === 'rejected')
      if (rejected.length > 0) {
        toast.error(`${pluralize(rejected.length, 'file')} skipped`, {
          description: rejected.map((item) => `${item.name} — ${item.error}`).join('\n'),
        })
      }
      return created.length - rejected.length
    },
    [enqueue],
  )
}
