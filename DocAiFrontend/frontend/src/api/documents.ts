import { ApiError, apiErrorFromBody, apiRequest, apiUrl, BACKEND_ORIGIN } from '@/lib/http'
import type { ApiResponse, DocumentMetadataDto, DocumentResponseDto } from '@/types/api'

/** GET /api/v1/documents — newest first (backend orders by createdAt desc). */
export function listDocuments(signal?: AbortSignal): Promise<DocumentMetadataDto[]> {
  return apiRequest<DocumentMetadataDto[]>('/api/v1/documents', { signal }).then((docs) => docs ?? [])
}

/** DELETE /api/v1/documents/{id} — also purges the document's vectors from pgvector. */
export function deleteDocument(id: string): Promise<void> {
  return apiRequest<void>(`/api/v1/documents/${id}`, { method: 'DELETE' })
}

export interface UploadOptions {
  /** 0-100, reflecting bytes sent. Reaches 100 before server-side indexing finishes. */
  onProgress?: (percent: number) => void
  /** Fires once the request body is fully sent and the server starts parsing/embedding. */
  onIndexingStart?: () => void
  signal?: AbortSignal
}

/**
 * POST /api/v1/documents/upload (one file).
 *
 * Uses XMLHttpRequest rather than fetch because only XHR exposes upload
 * progress events, which the upload dialog's per-file progress bar needs.
 * Files are uploaded one request each (instead of /upload-multiple) so every
 * file gets its own bar, status and error message; the backend loops over a
 * batch sequentially anyway, so nothing is lost.
 */
export function uploadDocument(file: File, options: UploadOptions = {}): Promise<DocumentResponseDto> {
  const { onProgress, onIndexingStart, signal } = options

  return new Promise<DocumentResponseDto>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Upload aborted', 'AbortError'))
      return
    }

    const xhr = new XMLHttpRequest()
    const form = new FormData()
    form.append('file', file, file.name)

    const abort = () => xhr.abort()
    signal?.addEventListener('abort', abort, { once: true })
    const cleanup = () => signal?.removeEventListener('abort', abort)

    xhr.open('POST', apiUrl('/api/v1/documents/upload'), true)
    xhr.setRequestHeader('Accept', 'application/json')
    // Embedding a large PDF can take a while; don't let the browser give up early.
    xhr.timeout = 10 * 60 * 1000

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress?.(Math.min(99, Math.round((event.loaded / event.total) * 100)))
      }
    }

    xhr.upload.onload = () => {
      onProgress?.(100)
      onIndexingStart?.()
    }

    xhr.onload = () => {
      cleanup()
      const status = xhr.status
      const text = xhr.responseText ?? ''

      if (status < 200 || status >= 300) {
        reject(apiErrorFromBody(status, text))
        return
      }

      try {
        const body = JSON.parse(text) as ApiResponse<DocumentResponseDto>
        if (body?.success === false) {
          reject(new ApiError(body.message ?? 'Upload failed', status))
          return
        }
        resolve(body.data)
      } catch {
        reject(new ApiError('The server returned a malformed upload response.', status))
      }
    }

    xhr.onerror = () => {
      cleanup()
      reject(new ApiError(`Cannot reach the BrainDoc backend at ${BACKEND_ORIGIN}. Is it running?`, 0))
    }

    xhr.ontimeout = () => {
      cleanup()
      reject(new ApiError('Upload timed out while the server was indexing the document.', 0))
    }

    xhr.onabort = () => {
      cleanup()
      reject(new DOMException('Upload aborted', 'AbortError'))
    }

    xhr.send(form)
  })
}
