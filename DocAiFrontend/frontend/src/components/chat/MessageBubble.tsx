import { AlertTriangle, Bot, RotateCw, User, Zap } from 'lucide-react'
import { Citations } from '@/components/chat/Citations'
import { Markdown } from '@/components/chat/Markdown'
import { CopyButton } from '@/components/ui/CopyButton'
import { cn, formatDuration } from '@/lib/utils'
import type { ChatMessage } from '@/store/useChatStore'

function Avatar({ role }: { role: 'user' | 'assistant' }) {
  return role === 'user' ? (
    <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-line bg-card text-muted">
      <User className="size-4.5" aria-hidden />
    </span>
  ) : (
    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand text-white">
      <Bot className="size-4.5" aria-hidden />
    </span>
  )
}

function ThinkingDots() {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-muted">
      <span className="flex gap-1">
        {[0, 150, 300].map((delay) => (
          <span
            key={delay}
            className="size-1.5 animate-bounce rounded-full bg-faint"
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </span>
      Retrieving grounded context…
    </span>
  )
}

export interface MessageBubbleProps {
  message: ChatMessage
  onRetry?: () => void
  canRetry?: boolean
}

export function MessageBubble({ message, onRetry, canRetry }: MessageBubbleProps) {
  if (message.role === 'user') {
    return (
      <div className="flex animate-rise justify-end gap-3">
        <div className="max-w-[min(46rem,78%)] rounded-2xl rounded-tr-md bg-brand px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap text-white shadow-sm">
          {message.content}
        </div>
        <Avatar role="user" />
      </div>
    )
  }

  const isStreaming = message.status === 'streaming'
  const isError = message.status === 'error'
  const isPending = !isError && (message.status === 'pending' || (isStreaming && !message.content))
  const citations = message.citations ?? []
  const showFooter = !isPending

  return (
    <div className="flex animate-rise gap-3">
      <Avatar role="assistant" />

      <div
        className={cn(
          'min-w-0 max-w-[min(52rem,86%)] flex-1 overflow-hidden rounded-2xl rounded-tl-md border',
          isError ? 'border-bad/40 bg-bad-soft' : 'border-line bg-card',
        )}
      >
        <div className="px-4 py-3.5">
          {isPending && <ThinkingDots />}

          {isError && (
            <div className="flex items-start gap-2.5 text-sm text-bad">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
              <div className="min-w-0">
                <p className="font-semibold">Could not complete the answer</p>
                <p className="mt-0.5 opacity-90">{message.error}</p>
              </div>
            </div>
          )}

          {!isPending && !isError && (
            <>
              <Markdown content={message.content} />
              {isStreaming && (
                <span
                  className="ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 animate-blink bg-brand align-middle"
                  aria-hidden
                />
              )}
            </>
          )}
        </div>

        {!isError && citations.length > 0 && (
          <div className="px-4 pb-3">
            <Citations citations={citations} />
          </div>
        )}

        {showFooter && (
          <div className="flex items-center gap-3 border-t border-line px-4 py-2.5">
            {message.responseTimeMs != null && !isError && (
              <span className="text-[11px] text-faint">{formatDuration(message.responseTimeMs)}</span>
            )}
            {message.streamed && !isError && (
              <span className="inline-flex items-center gap-1 text-[11px] text-faint">
                <Zap className="size-3" aria-hidden />
                streamed
              </span>
            )}

            <div className="ml-auto flex items-center gap-1">
              {isError && canRetry && onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-bad transition-colors hover:bg-bad/10"
                >
                  <RotateCw className="size-3.5" aria-hidden />
                  Retry
                </button>
              )}
              {!isError && message.content && (
                <CopyButton value={message.content} label="Copy answer" className="p-1" />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
