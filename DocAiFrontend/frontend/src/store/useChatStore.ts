import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CitationDto } from '@/types/api'

export type MessageRole = 'user' | 'assistant'
export type MessageStatus = 'pending' | 'streaming' | 'done' | 'error'

export interface ChatMessage {
  id: string
  role: MessageRole
  content: string
  createdAt: number
  status: MessageStatus
  citations?: CitationDto[]
  responseTimeMs?: number | null
  /** True when the answer arrived via /chat/stream rather than /chat/query. */
  streamed?: boolean
  error?: string
}

export interface ChatThread {
  messages: ChatMessage[]
  /** Echoed back to the backend so it can keep a stable conversation id. */
  conversationId: string | null
}

/** Threads are keyed by retrieval scope, so switching documents switches context. */
export const ALL_DOCUMENTS_SCOPE = 'all'

export function scopeKey(documentId: string | null): string {
  return documentId ?? ALL_DOCUMENTS_SCOPE
}

const emptyThread: ChatThread = { messages: [], conversationId: null }

interface ChatState {
  threads: Record<string, ChatThread>
  appendMessage: (scope: string, message: ChatMessage) => void
  updateMessage: (scope: string, messageId: string, patch: Partial<ChatMessage>) => void
  removeMessage: (scope: string, messageId: string) => void
  setConversationId: (scope: string, conversationId: string | null) => void
  clearThread: (scope: string) => void
  dropThread: (scope: string) => void
}

export const useChatStore = create<ChatState>()(
  persist(
    (set) => ({
      threads: {},

      appendMessage: (scope, message) =>
        set((state) => {
          const thread = state.threads[scope] ?? emptyThread
          return {
            threads: {
              ...state.threads,
              [scope]: { ...thread, messages: [...thread.messages, message] },
            },
          }
        }),

      updateMessage: (scope, messageId, patch) =>
        set((state) => {
          const thread = state.threads[scope]
          if (!thread) return state
          return {
            threads: {
              ...state.threads,
              [scope]: {
                ...thread,
                messages: thread.messages.map((m) => (m.id === messageId ? { ...m, ...patch } : m)),
              },
            },
          }
        }),

      removeMessage: (scope, messageId) =>
        set((state) => {
          const thread = state.threads[scope]
          if (!thread) return state
          return {
            threads: {
              ...state.threads,
              [scope]: { ...thread, messages: thread.messages.filter((m) => m.id !== messageId) },
            },
          }
        }),

      setConversationId: (scope, conversationId) =>
        set((state) => ({
          threads: {
            ...state.threads,
            [scope]: { ...(state.threads[scope] ?? emptyThread), conversationId },
          },
        })),

      clearThread: (scope) =>
        set((state) => ({
          threads: { ...state.threads, [scope]: { messages: [], conversationId: null } },
        })),

      /** Used when a document is deleted — its thread is meaningless afterwards. */
      dropThread: (scope) =>
        set((state) => {
          if (!(scope in state.threads)) return state
          const next = { ...state.threads }
          delete next[scope]
          return { threads: next }
        }),
    }),
    {
      name: 'docmind-chat',
      version: 1,
      // A message interrupted by a reload can never resume — settle it on rehydrate.
      merge: (persisted, current) => {
        const state = { ...current, ...(persisted as Partial<ChatState>) }
        const threads: Record<string, ChatThread> = {}
        for (const [key, thread] of Object.entries(state.threads ?? {})) {
          threads[key] = {
            conversationId: thread.conversationId ?? null,
            messages: (thread.messages ?? []).map((message) =>
              message.status === 'pending' || message.status === 'streaming'
                ? {
                    ...message,
                    status: message.content ? ('done' as const) : ('error' as const),
                    error: message.content ? undefined : 'Interrupted before the answer arrived.',
                  }
                : message,
            ),
          }
        }
        return { ...state, threads }
      },
    },
  ),
)
