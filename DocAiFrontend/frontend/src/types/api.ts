/**
 * Mirrors com.vikas.docai.dto.* from the Spring Boot backend.
 * Field names match the JSON exactly — including the `filename` (list/detail)
 * vs `fileName` (upload response) inconsistency in the backend DTOs.
 */

export type DocumentStatus = 'UPLOADING' | 'PROCESSING' | 'INDEXED' | 'FAILED'

/** Envelope returned by every JSON endpoint, including error responses. */
export interface ApiResponse<T> {
  success: boolean
  message: string | null
  data: T
  timestamp: string
}

/** GET /api/v1/documents, GET /api/v1/documents/{id} */
export interface DocumentMetadataDto {
  id: string
  filename: string
  contentType: string
  fileSize: number | null
  totalPages: number | null
  totalChunks: number | null
  status: DocumentStatus
  errorMessage: string | null
  createdAt: string
  updatedAt: string | null
}

/** POST /api/v1/documents/upload */
export interface DocumentResponseDto {
  id: string
  fileName: string
  fileSize: number | null
  status: DocumentStatus
  chunksCreated: number | null
  message: string | null
}

export interface CitationDto {
  documentId: string | null
  fileName: string | null
  chunkIndex: number | null
  pageNumber: number | null
  snippet: string | null
  similarityScore: number | null
  metadata: Record<string, unknown> | null
}

/** POST /api/v1/chat/query and /api/v1/chat/stream */
export interface ChatRequestDto {
  question: string
  documentId?: string | null
  topK?: number | null
  minSimilarity?: number | null
  conversationId?: string | null
}

export interface ChatResponseDto {
  answer: string
  conversationId: string
  citations: CitationDto[] | null
  responseTimeMs: number | null
}

/** POST /api/v1/chat/search/similarity */
export interface SearchRequestDto {
  query: string
  documentId?: string | null
  topK?: number | null
  /** Backend field name is `similaritySearch` (it is a threshold, not a flag). */
  similaritySearch?: number | null
}

export interface SearchResultDto {
  query: string
  totalMatches: number
  matches: CitationDto[] | null
}
