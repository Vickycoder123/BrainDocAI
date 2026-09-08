import { useCallback, useEffect, useRef, useState } from 'react'
import { askQuestion, searchSimilarChunks, streamAnswer } from '@/api/chat'
import { DEFAULT_CHAT_TOP_K } from '@/lib/constants'
import { errorMessage, isAbortError, uid } from '@/lib/utils'
import { scopeKey, useChatStore, type ChatMessage } from '@/store/useChatStore'
import { useUiStore } from '@/store/useUiStore'
import type { ChatRequestDto } from '@/types/api'

const EMPTY_MESSAGES: ChatMessage[] = []

export interface ChatController {
  messages: ChatMessage[]
  isBusy: boolean
  send: (question: string) => void
  stop: () => void
  clear: () => void
  retryLast: () => void
}

export function useChatController(): ChatController {
  const scopeDocumentId = useUiStore((state) => state.scopeDocumentId)
  const streamTokens = useUiStore((state) => state.streamTokens)
  const key = scopeKey(scopeDocumentId)

  const messages = useChatStore((state) => state.threads[key]?.messages) ?? EMPTY_MESSAGES
  const appendMessage = useChatStore((state) => state.appendMessage)
  const updateMessage = useChatStore((state) => state.updateMessage)
  const removeMessage = useChatStore((state) => state.removeMessage)
  const setConversationId = useChatStore((state) => state.setConversationId)
  const clearThread = useChatStore((state) => state.clearThread)

  const [isBusy, setIsBusy] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  // Switching scope switches thread; any in-flight answer belongs to the old one.
  useEffect(() => {
    return () => {
      abortRef.current?.abort()
      abortRef.current = null
    }
  }, [key])

  const stop = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
  }, [])

  const run = useCallback(
    async (question: string, assistantId: string) => {
      const controller = new AbortController()
      abortRef.current = controller
      setIsBusy(true)

      const existingConversationId = useChatStore.getState().threads[key]?.conversationId ?? null
      const conversationId = existingConversationId ?? uid('conv')
      if (!existingConversationId) setConversationId(key, conversationId)

      const request: ChatRequestDto = {
        question,
        documentId: scopeDocumentId,
        topK: DEFAULT_CHAT_TOP_K,
        conversationId,
      }

      const startedAt = performance.now()

      try {
        if (streamTokens) {
          // /chat/stream emits tokens only. It retrieves with the same query,
          // scope and topK as the similarity endpoint, so running that in
          // parallel reproduces exactly the chunks this answer was grounded on.
          const citationsPromise = searchSimilarChunks(
            { query: question, documentId: scopeDocumentId, topK: DEFAULT_CHAT_TOP_K },
            controller.signal,
          ).catch(() => null)

          const answer = await streamAnswer(request, {
            signal: controller.signal,
            onToken: (_chunk, accumulated) => updateMessage(key, assistantId, { content: accumulated }),
          })

          const citations = (await citationsPromise)?.matches ?? undefined
          updateMessage(key, assistantId, {
            content: answer,
            status: 'done',
            citations,
            responseTimeMs: Math.round(performance.now() - startedAt),
          })
        } else {
          const response = await askQuestion(request, controller.signal)
          updateMessage(key, assistantId, {
            content: response.answer ?? '',
            status: 'done',
            citations: response.citations ?? undefined,
            responseTimeMs: response.responseTimeMs ?? Math.round(performance.now() - startedAt),
          })
          if (response.conversationId) setConversationId(key, response.conversationId)
        }
      } catch (error) {
        const partial = useChatStore.getState().threads[key]?.messages.find((m) => m.id === assistantId)

        if (isAbortError(error)) {
          // Keep whatever streamed before the user hit stop.
          updateMessage(key, assistantId, {
            status: partial?.content ? 'done' : 'error',
            error: partial?.content ? undefined : 'Stopped before the answer started.',
          })
        } else {
          updateMessage(key, assistantId, { status: 'error', error: errorMessage(error) })
        }
      } finally {
        abortRef.current = null
        setIsBusy(false)
      }
    },
    [key, scopeDocumentId, streamTokens, setConversationId, updateMessage],
  )

  const send = useCallback(
    (question: string) => {
      const text = question.trim()
      if (!text || isBusy) return

      appendMessage(key, {
        id: uid('msg'),
        role: 'user',
        content: text,
        createdAt: Date.now(),
        status: 'done',
      })

      const assistantId = uid('msg')
      appendMessage(key, {
        id: assistantId,
        role: 'assistant',
        content: '',
        createdAt: Date.now(),
        status: streamTokens ? 'streaming' : 'pending',
        streamed: streamTokens,
      })

      void run(text, assistantId)
    },
    [appendMessage, isBusy, key, run, streamTokens],
  )

  const clear = useCallback(() => {
    stop()
    clearThread(key)
  }, [clearThread, key, stop])

  /** Drops a failed answer and re-asks the question above it. */
  const retryLast = useCallback(() => {
    if (isBusy) return
    const thread = useChatStore.getState().threads[key]
    const last = thread?.messages.at(-1)
    if (!last || last.role !== 'assistant') return

    const question = thread?.messages.at(-2)
    if (!question || question.role !== 'user') return

    removeMessage(key, last.id)
    const assistantId = uid('msg')
    appendMessage(key, {
      id: assistantId,
      role: 'assistant',
      content: '',
      createdAt: Date.now(),
      status: streamTokens ? 'streaming' : 'pending',
      streamed: streamTokens,
    })
    void run(question.content, assistantId)
  }, [appendMessage, isBusy, key, removeMessage, run, streamTokens])

  return { messages, isBusy, send, stop, clear, retryLast }
}
