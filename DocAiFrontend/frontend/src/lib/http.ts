import { MAX_FILE_SIZE_LABEL } from '@/lib/constants'
import type { ApiResponse } from '@/types/api'

/**
 * Empty by default: requests go to a relative `/api/...` which Vite proxies to
 * Spring Boot in dev (see vite.config.ts). Set VITE_API_BASE_URL to hit the
 * backend directly instead (its CORS config already allows any origin).
 */
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '')

export const BACKEND_ORIGIN = import.meta.env.VITE_BACKEND_ORIGIN ?? 'http://localhost:8080'

export const SWAGGER_URL = `${API_BASE_URL || BACKEND_ORIGIN}/swagger-ui/index.html`

export function apiUrl(path: string): string {
  return `${API_BASE_URL}${path}`
}

export class ApiError extends Error {
  readonly status: number
  /** Field-level messages from MethodArgumentNotValidException handling. */
  readonly fieldErrors?: Record<string, string>

  constructor(message: string, status: number, fieldErrors?: Record<string, string>) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

function isRecordOfStrings(value: unknown): value is Record<string, string> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.values(value).every((v) => typeof v === 'string')
  )
}

/** Builds an ApiError from a raw error body, reading the ApiResponse envelope when present. */
export function apiErrorFromBody(status: number, text: string, fallback?: string): ApiError {
  let message = fallback ?? `Request failed with status ${status}`
  let fieldErrors: Record<string, string> | undefined

  if (text) {
    try {
      const body = JSON.parse(text) as Partial<ApiResponse<unknown>> & { error?: string }
      if (typeof body.message === 'string' && body.message.trim()) {
        message = body.message
      } else if (typeof body.error === 'string' && body.error.trim()) {
        message = body.error
      }
      if (isRecordOfStrings(body.data)) {
        fieldErrors = body.data
        const first = Object.values(body.data)[0]
        if (first && message.toLowerCase().startsWith('validation')) message = `${message}: ${first}`
      }
    } catch {
      // Not JSON (e.g. a container-level HTML error page) — keep a trimmed snippet.
      const snippet = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
      if (snippet) message = snippet.slice(0, 300)
    }
  }

  if (status === 413) message = `File is larger than the ${MAX_FILE_SIZE_LABEL} limit accepted by the server.`

  // A 5xx with no body means the exception escaped GlobalExceptionHandler —
  // typically thrown inside the streaming Flux, after the response committed.
  // There is nothing to show the user, so point them at where the detail lives.
  if (status >= 500 && !text.trim()) {
    message = `Backend error ${status} with no details in the response. Check the Spring Boot console for the stack trace — turning off Stream Tokens routes the same question through /chat/query, which does return a readable error.`
  }

  return new ApiError(message, status, fieldErrors)
}

/** Turns any non-2xx Response into an ApiError. */
export async function toApiError(response: Response, fallback?: string): Promise<ApiError> {
  let text = ''
  try {
    text = await response.text()
  } catch {
    /* body already consumed or unreadable — fall back to the status message */
  }
  return apiErrorFromBody(response.status, text, fallback)
}

/** Normalises the "backend unreachable" case, which otherwise surfaces as a bare TypeError. */
export function toNetworkError(error: unknown): Error {
  if (error instanceof ApiError) return error
  if (error instanceof DOMException && error.name === 'AbortError') return error
  return new ApiError(
    `Cannot reach the BrainDoc backend${API_BASE_URL ? ` at ${API_BASE_URL}` : ''}. Is it running on ${BACKEND_ORIGIN}?`,
    0,
  )
}

/** Performs a JSON request and unwraps the ApiResponse<T> envelope. */
export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response
  try {
    response = await fetch(apiUrl(path), {
      ...init,
      headers: {
        Accept: 'application/json',
        ...(init.body !== undefined && !(init.body instanceof FormData)
          ? { 'Content-Type': 'application/json' }
          : {}),
        ...init.headers,
      },
    })
  } catch (error) {
    throw toNetworkError(error)
  }

  if (!response.ok) throw await toApiError(response)

  if (response.status === 204) return undefined as T

  const text = await response.text()
  if (!text) return undefined as T

  const body = JSON.parse(text) as ApiResponse<T> | T

  if (body && typeof body === 'object' && 'success' in body && 'data' in body) {
    const envelope = body as ApiResponse<T>
    if (envelope.success === false) {
      throw new ApiError(envelope.message ?? 'Request failed', response.status)
    }
    return envelope.data
  }

  return body as T
}
