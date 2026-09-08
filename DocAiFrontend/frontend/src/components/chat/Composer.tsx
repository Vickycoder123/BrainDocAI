import { useEffect, useImperativeHandle, useRef, type KeyboardEvent, type RefObject } from 'react'
import { Send, Square, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

const MAX_TEXTAREA_HEIGHT = 200

export interface ComposerHandle {
  focus: () => void
  setValue: (value: string) => void
}

export interface ComposerProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  onStop: () => void
  isBusy: boolean
  placeholder: string
  handleRef?: RefObject<ComposerHandle | null>
}

export function Composer({
  value,
  onChange,
  onSubmit,
  onStop,
  isBusy,
  placeholder,
  handleRef,
}: ComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useImperativeHandle(handleRef, () => ({
    focus: () => textareaRef.current?.focus(),
    setValue: (next: string) => {
      onChange(next)
      requestAnimationFrame(() => textareaRef.current?.focus())
    },
  }))

  // Grow with the content, up to a cap, then scroll.
  useEffect(() => {
    const element = textareaRef.current
    if (!element) return
    element.style.height = 'auto'
    element.style.height = `${Math.min(element.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`
  }, [value])

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      onSubmit()
    }
  }

  const canSend = value.trim().length > 0 && !isBusy

  return (
    <div className="shrink-0 border-t border-line bg-panel px-4 py-4 sm:px-6">
      <div className="mx-auto w-full max-w-4xl">
        <div
          className={cn(
            'flex items-end gap-2 rounded-xl border border-line bg-card p-2 pl-4 transition-colors',
            'focus-within:border-brand focus-within:ring-2 focus-within:ring-[var(--ring)]',
          )}
        >
          <textarea
            ref={textareaRef}
            rows={1}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            aria-label="Ask a question about your documents"
            className="max-h-[200px] min-h-[2.25rem] flex-1 resize-none bg-transparent py-2 text-[15px] leading-relaxed outline-none scrollbar-thin"
          />

          {isBusy ? (
            <button
              type="button"
              onClick={onStop}
              title="Stop generating"
              aria-label="Stop generating"
              className="grid size-10 shrink-0 place-items-center rounded-lg border border-line bg-card-2 text-muted transition-colors hover:text-ink"
            >
              <Square className="size-4 fill-current" aria-hidden />
            </button>
          ) : (
            <button
              type="button"
              onClick={onSubmit}
              disabled={!canSend}
              title="Send message"
              aria-label="Send message"
              className="grid size-10 shrink-0 place-items-center rounded-lg bg-brand text-white transition-colors hover:bg-brand-2 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-brand"
            >
              <Send className="size-4.5" aria-hidden />
            </button>
          )}
        </div>

        <div className="mt-2 flex items-center justify-between gap-4 px-1">
          <p className="text-xs text-faint">
            Press <Kbd>Enter</Kbd> to send, <Kbd>Shift+Enter</Kbd> for newline
          </p>
          <span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-medium text-brand-text">
            <Zap className="size-3.5" aria-hidden />
            Grounded RAG
          </span>
        </div>
      </div>
    </div>
  )
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border border-line bg-sunken px-1.5 py-0.5 text-[10px] text-muted">{children}</kbd>
  )
}
