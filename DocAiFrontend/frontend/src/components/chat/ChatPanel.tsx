import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ArrowDown, Download, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { Composer, type ComposerHandle } from '@/components/chat/Composer'
import { MessageBubble } from '@/components/chat/MessageBubble'
import { WelcomeScreen } from '@/components/chat/WelcomeScreen'
import { Toggle } from '@/components/ui/Toggle'
import { useChatController } from '@/hooks/useChat'
import { useDocuments } from '@/hooks/useDocuments'
import { cn, downloadTextFile, formatPercent } from '@/lib/utils'
import { useUiStore } from '@/store/useUiStore'
import type { ChatMessage } from '@/store/useChatStore'

function buildTranscript(messages: ChatMessage[], scopeLabel: string): string {
  const lines = [
    '# BrainDoc conversation',
    '',
    `- **Context:** ${scopeLabel}`,
    `- **Exported:** ${new Date().toLocaleString()}`,
    '',
    '---',
    '',
  ]

  for (const message of messages) {
    lines.push(message.role === 'user' ? '## You' : '## BrainDoc')
    lines.push('')
    lines.push(message.content || (message.error ? `_${message.error}_` : '_(no content)_'))
    lines.push('')

    const citations = message.citations ?? []
    if (citations.length > 0) {
      lines.push('**Sources**')
      lines.push('')
      citations.forEach((citation, index) => {
        const parts = [
          citation.fileName ?? 'Unknown source',
          citation.pageNumber != null ? `p.${citation.pageNumber}` : null,
          citation.chunkIndex != null ? `chunk #${citation.chunkIndex}` : null,
          citation.similarityScore != null ? formatPercent(citation.similarityScore, 0) : null,
        ].filter(Boolean)
        lines.push(`${index + 1}. ${parts.join(' — ')}`)
      })
      lines.push('')
    }
  }

  return lines.join('\n')
}

function ContextBar({
  scopeLabel,
  messages,
  onClear,
}: {
  scopeLabel: string
  messages: ChatMessage[]
  onClear: () => void
}) {
  const streamTokens = useUiStore((state) => state.streamTokens)
  const setStreamTokens = useUiStore((state) => state.setStreamTokens)
  const hasMessages = messages.length > 0

  const onExport = () => {
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
    downloadTextFile(`braindoc-conversation-${stamp}.md`, buildTranscript(messages, scopeLabel))
    toast.success('Conversation exported')
  }

  return (
    <div className="flex h-[52px] shrink-0 items-center gap-3 border-b border-line bg-panel px-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-2">
        <span className="size-2 shrink-0 rounded-full bg-ok" aria-hidden />
        <span className="shrink-0 text-sm text-muted">Context:</span>
        <span className="truncate text-sm font-semibold text-ink">{scopeLabel}</span>
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-3">
        <Toggle
          checked={streamTokens}
          onChange={setStreamTokens}
          label="Stream Tokens"
          title={
            streamTokens
              ? 'Answers stream token-by-token via /chat/stream'
              : 'Answers arrive in one response via /chat/query'
          }
          className="mr-1"
        />

        <button
          type="button"
          onClick={onExport}
          disabled={!hasMessages}
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-card-2 hover:text-ink disabled:pointer-events-none disabled:opacity-40"
        >
          <Download className="size-3.5" aria-hidden />
          <span className="hidden sm:inline">Export</span>
        </button>

        <button
          type="button"
          onClick={onClear}
          disabled={!hasMessages}
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-card-2 hover:text-ink disabled:pointer-events-none disabled:opacity-40"
        >
          <RotateCcw className="size-3.5" aria-hidden />
          <span className="hidden sm:inline">Clear</span>
        </button>
      </div>
    </div>
  )
}

export function ChatPanel() {
  const [draft, setDraft] = useState('')
  const composerRef = useRef<ComposerHandle>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const stickToBottomRef = useRef(true)
  const [showJump, setShowJump] = useState(false)

  const scopeDocumentId = useUiStore((state) => state.scopeDocumentId)
  const { data: documents } = useDocuments()
  const scoped = scopeDocumentId ? documents?.find((d) => d.id === scopeDocumentId) : undefined
  const scopeLabel = scoped ? scoped.filename : 'All Uploaded Documents'

  const { messages, isBusy, send, stop, clear, retryLast } = useChatController()

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    const element = scrollRef.current
    if (!element) return
    element.scrollTo({ top: element.scrollHeight, behavior })
  }, [])

  const onScroll = () => {
    const element = scrollRef.current
    if (!element) return
    const distance = element.scrollHeight - element.scrollTop - element.clientHeight
    stickToBottomRef.current = distance < 80
    setShowJump(distance > 240)
  }

  // Follow streamed tokens, but never yank the view while the user reads back.
  useLayoutEffect(() => {
    if (stickToBottomRef.current) scrollToBottom(messages.length <= 2 ? 'auto' : 'smooth')
  }, [messages, scrollToBottom])

  // Switching scope switches thread — start at the bottom of the new one.
  useEffect(() => {
    stickToBottomRef.current = true
    scrollToBottom('auto')
    composerRef.current?.focus()
  }, [scopeDocumentId, scrollToBottom])

  const submit = () => {
    if (!draft.trim() || isBusy) return
    send(draft)
    setDraft('')
    stickToBottomRef.current = true
  }

  const lastMessage = messages.at(-1)
  const canRetry = !isBusy && lastMessage?.role === 'assistant' && lastMessage.status === 'error'

  return (
    <section className="flex min-w-0 flex-1 flex-col overflow-hidden bg-app">
      <ContextBar scopeLabel={scopeLabel} messages={messages} onClear={clear} />

      <div className="relative min-h-0 flex-1">
        <div ref={scrollRef} onScroll={onScroll} className="h-full overflow-y-auto scrollbar-thin">
          {messages.length === 0 ? (
            <WelcomeScreen
              scopeLabel={scopeLabel}
              onPick={(prompt) => {
                setDraft(prompt)
                composerRef.current?.focus()
              }}
            />
          ) : (
            <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-6 sm:px-6">
              {messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  canRetry={canRetry && message.id === lastMessage?.id}
                  onRetry={retryLast}
                />
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => {
            stickToBottomRef.current = true
            scrollToBottom()
          }}
          aria-label="Jump to latest message"
          className={cn(
            'absolute bottom-4 left-1/2 grid size-9 -translate-x-1/2 place-items-center rounded-full',
            'border border-line bg-card text-muted shadow-md transition-all hover:text-ink',
            showJump ? 'opacity-100' : 'pointer-events-none opacity-0',
          )}
        >
          <ArrowDown className="size-4" aria-hidden />
        </button>
      </div>

      <Composer
        value={draft}
        onChange={setDraft}
        onSubmit={submit}
        onStop={stop}
        isBusy={isBusy}
        handleRef={composerRef}
        placeholder={
          scoped ? `Ask a question about ${scoped.filename}...` : 'Ask a question across all documents...'
        }
      />
    </section>
  )
}
