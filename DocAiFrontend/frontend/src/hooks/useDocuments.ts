import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { deleteDocument, listDocuments } from '@/api/documents'
import { searchSimilarChunks } from '@/api/chat'
import { MAX_SAMPLE_CHUNKS } from '@/lib/constants'
import { errorMessage } from '@/lib/utils'
import { scopeKey, useChatStore } from '@/store/useChatStore'
import { useUiStore } from '@/store/useUiStore'
import type { CitationDto, DocumentMetadataDto } from '@/types/api'

export const documentKeys = {
  all: ['documents'] as const,
  list: () => [...documentKeys.all, 'list'] as const,
  chunks: (id: string) => [...documentKeys.all, 'chunks', id] as const,
}

export function useDocuments() {
  return useQuery({
    queryKey: documentKeys.list(),
    queryFn: ({ signal }) => listDocuments(signal),
    staleTime: 15_000,
    refetchOnWindowFocus: true,
  })
}

export function useDocument(id: string | null): DocumentMetadataDto | undefined {
  const { data } = useDocuments()
  if (!id) return undefined
  return data?.find((document) => document.id === id)
}

/**
 * There is no "list chunks for a document" endpoint, so we reuse the similarity
 * search scoped to this document. With no threshold set the vector store simply
 * returns the topK nearest chunks — a representative sample, which is what the
 * detail dialog labels them.
 */
export function useDocumentChunks(document: DocumentMetadataDto | undefined | null) {
  const id = document?.id ?? null
  // The filename makes a decent semantic anchor for "what is this document about".
  const query = (document?.filename ?? '').replace(/\.[^.]+$/, '').replace(/[_\-.]+/g, ' ').trim()

  return useQuery({
    queryKey: documentKeys.chunks(id ?? 'none'),
    enabled: Boolean(id) && document?.status === 'INDEXED',
    staleTime: 60_000,
    queryFn: async ({ signal }): Promise<CitationDto[]> => {
      const result = await searchSimilarChunks(
        {
          query: query || 'document overview',
          documentId: id,
          topK: Math.min(document?.totalChunks ?? MAX_SAMPLE_CHUNKS, MAX_SAMPLE_CHUNKS),
        },
        signal,
      )
      const matches = result.matches ?? []
      // Present them in document order rather than by similarity.
      return [...matches].sort((a, b) => (a.chunkIndex ?? 0) - (b.chunkIndex ?? 0))
    },
  })
}

export function useDeleteDocument() {
  const queryClient = useQueryClient()
  const scopeDocumentId = useUiStore((state) => state.scopeDocumentId)
  const setScope = useUiStore((state) => state.setScope)
  const dropThread = useChatStore((state) => state.dropThread)

  return useMutation({
    mutationFn: (id: string) => deleteDocument(id),
    onSuccess: (_data, id) => {
      // Its vectors are gone, so a scoped chat over it no longer means anything.
      if (scopeDocumentId === id) setScope(null)
      dropThread(scopeKey(id))
      queryClient.removeQueries({ queryKey: documentKeys.chunks(id) })
      void queryClient.invalidateQueries({ queryKey: documentKeys.all })
      toast.success('Document deleted', { description: 'Its vector chunks were purged from pgvector.' })
    },
    onError: (error) => {
      toast.error('Could not delete document', { description: errorMessage(error) })
    },
  })
}
