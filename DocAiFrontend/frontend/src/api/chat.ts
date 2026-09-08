import { apiRequest, apiUrl, toApiError, toNetworkError } from '@/lib/http'
import type { ChatRequestDto, ChatResponseDto, SearchRequestDto, SearchResultDto } from '@/types/api'

/** Strips nulls so the backend applies its own app.rag defaults for absent fields. */
function compact<T extends object>(value: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, v]) => v !== null && v !== undefined && v !== ''),
  ) as Partial<T>
}

/** POST /api/v1/chat/query — blocking answer, comes back with citations. */
export function askQuestion(request: ChatRequestDto, signal?: AbortSignal): Promise<ChatResponseDto> {
  return apiRequest<ChatResponseDto>('/api/v1/chat/query', {
    method: 'POST',
    body: JSON.stringify(compact(request)),
    signal,
  })
}

/** POST /api/v1/chat/search/similarity — raw vector-chunk matches, no LLM call. */
export function searchSimilarChunks(
  request: SearchRequestDto,
  signal?: AbortSignal,
): Promise<SearchResultDto> {
  return apiRequest<SearchResultDto>('/api/v1/chat/search/similarity', {
    method: 'POST',
    body: JSON.stringify(compact(request)),
    signal,
  })
}

export interface StreamOptions {
  onToken: (chunk: string, accumulated: string) => void
  signal?: AbortSignal
}

export interface TokenDecoder {
  /** Returns the answer text contained in this network chunk (may be ''). */
  push: (chunk: string) => string
  /** Returns anything still buffered once the stream ends. */
  flush: () => string
}

/**
 * Spring MVC picks its Flux<String> rendering from content negotiation: a
 * text/plain (or star) Accept streams the raw tokens, while text/event-stream
 * wraps them in SSE frames. We ask for text/plain, but decode whatever we
 * actually get so the client can't break if that negotiation ever changes.
 */
export function createTokenDecoder(contentType: string | null | undefined): TokenDecoder {
  if (!(contentType ?? '').toLowerCase().includes('text/event-stream')) {
    return { push: (chunk) => chunk, flush: () => '' }
  }

  let buffer = ''

  const payloadOf = (frame: string): string =>
    frame
      .split(/\r?\n/)
      .filter((line) => line.startsWith('data:'))
      // Deliberately not stripping a leading space. The SSE spec treats one
      // space after the colon as a separator, but Spring's SseEmitter writes
      // `data:` with no space — so here a leading space is real content, and
      // dropping it would swallow the gaps between streamed word tokens.
      .map((line) => line.slice(5))
      .join('\n')

  return {
    push(chunk) {
      buffer += chunk
      let out = ''
      for (;;) {
        const separator = /\r?\n\r?\n/.exec(buffer)
        if (!separator) break
        out += payloadOf(buffer.slice(0, separator.index))
        buffer = buffer.slice(separator.index + separator[0].length)
      }
      return out
    },
    flush() {
      // A final frame that never got its blank-line terminator.
      const rest = payloadOf(buffer)
      buffer = ''
      return rest
    },
  }
}

/**
 * POST /api/v1/chat/stream.
 *
 * The controller returns Flux<String>. Spring MVC only wraps that in SSE when
 * the client asks for text/event-stream — and its SSE framing mangles tokens
 * that contain newlines, which markdown answers are full of. Requesting
 * text/plain instead takes the ResponseBodyEmitter path, giving us the raw
 * concatenated token stream with whitespace and line breaks intact.
 *
 * Resolves with the full answer text.
 */
export async function streamAnswer(request: ChatRequestDto, options: StreamOptions): Promise<string> {
  const { onToken, signal } = options

  let response: Response
  try {
    response = await fetch(apiUrl('/api/v1/chat/stream'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/plain',
      },
      body: JSON.stringify(compact(request)),
      signal,
    })
  } catch (error) {
    throw toNetworkError(error)
  }

  if (!response.ok) throw await toApiError(response)

  if (!response.body) {
    // No streaming support (or an empty body) — fall back to the whole text at once.
    const text = await response.text()
    if (text) onToken(text, text)
    return text
  }

  const reader = response.body.getReader()
  const textDecoder = new TextDecoder()
  const tokens = createTokenDecoder(response.headers.get('content-type'))
  let accumulated = ''

  const emit = (text: string) => {
    if (!text) return
    accumulated += text
    onToken(text, accumulated)
  }

  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      // `stream: true` keeps multi-byte characters intact across chunk boundaries.
      emit(tokens.push(textDecoder.decode(value, { stream: true })))
    }
    emit(tokens.push(textDecoder.decode()))
    emit(tokens.flush())
  } finally {
    reader.releaseLock()
  }

  return accumulated
}
