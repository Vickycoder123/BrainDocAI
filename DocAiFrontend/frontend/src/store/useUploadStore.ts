import { create } from 'zustand'
import { ACCEPTED_EXTENSIONS, MAX_FILE_SIZE_BYTES, MAX_FILE_SIZE_LABEL } from '@/lib/constants'
import { fileExtension, formatBytes, uid } from '@/lib/utils'

export type UploadStatus =
  | 'queued'
  | 'uploading'
  /** Bytes are sent; the server is now parsing, chunking and embedding. */
  | 'indexing'
  | 'success'
  | 'error'
  | 'canceled'
  /** Failed client-side validation, never sent. */
  | 'rejected'

export interface UploadItem {
  id: string
  file: File
  name: string
  size: number
  /** 0-100, bytes sent. */
  progress: number
  status: UploadStatus
  error?: string
  documentId?: string
  chunksCreated?: number
}

export const ACTIVE_UPLOAD_STATUSES: readonly UploadStatus[] = ['queued', 'uploading', 'indexing']

export function isActive(item: UploadItem): boolean {
  return ACTIVE_UPLOAD_STATUSES.includes(item.status)
}

/** Client-side gate so obviously-bad files never hit the 25MB multipart limit. */
export function validateFile(file: File): string | null {
  if (file.size === 0) return 'File is empty.'
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return `${formatBytes(file.size)} exceeds the ${MAX_FILE_SIZE_LABEL} limit.`
  }
  const extension = fileExtension(file.name)
  if (!extension) return 'File has no extension, so the server cannot pick a parser.'
  if (!ACCEPTED_EXTENSIONS.includes(`.${extension}` as (typeof ACCEPTED_EXTENSIONS)[number])) {
    return `.${extension} files are not supported.`
  }
  return null
}

interface UploadState {
  items: UploadItem[]
  /** Abort controllers for in-flight requests, keyed by item id. */
  controllers: Map<string, AbortController>

  enqueue: (files: File[]) => UploadItem[]
  patch: (id: string, patch: Partial<UploadItem>) => void
  registerController: (id: string, controller: AbortController) => void
  cancel: (id: string) => void
  cancelAll: () => void
  retry: (id: string) => void
  remove: (id: string) => void
  clearFinished: () => void
}

export const useUploadStore = create<UploadState>((set, get) => ({
  items: [],
  controllers: new Map(),

  enqueue: (files) => {
    const created: UploadItem[] = files.map((file) => {
      const error = validateFile(file)
      return {
        id: uid('upl'),
        file,
        name: file.name,
        size: file.size,
        progress: 0,
        status: error ? ('rejected' as const) : ('queued' as const),
        error: error ?? undefined,
      }
    })
    set((state) => ({ items: [...state.items, ...created] }))
    return created
  },

  patch: (id, patch) =>
    set((state) => ({
      items: state.items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    })),

  registerController: (id, controller) =>
    set((state) => {
      const controllers = new Map(state.controllers)
      controllers.set(id, controller)
      return { controllers }
    }),

  cancel: (id) => {
    const controller = get().controllers.get(id)
    controller?.abort()
    set((state) => {
      const controllers = new Map(state.controllers)
      controllers.delete(id)
      return {
        controllers,
        items: state.items.map((item) =>
          item.id === id && isActive(item) ? { ...item, status: 'canceled', error: undefined } : item,
        ),
      }
    })
  },

  cancelAll: () => {
    for (const controller of get().controllers.values()) controller.abort()
    set((state) => ({
      controllers: new Map(),
      items: state.items.map((item) => (isActive(item) ? { ...item, status: 'canceled' } : item)),
    }))
  },

  retry: (id) =>
    set((state) => ({
      items: state.items.map((item) =>
        item.id === id && validateFile(item.file) === null
          ? { ...item, status: 'queued', progress: 0, error: undefined }
          : item,
      ),
    })),

  remove: (id) => {
    get().controllers.get(id)?.abort()
    set((state) => {
      const controllers = new Map(state.controllers)
      controllers.delete(id)
      return { controllers, items: state.items.filter((item) => item.id !== id) }
    })
  },

  clearFinished: () => set((state) => ({ items: state.items.filter((item) => isActive(item)) })),
}))
