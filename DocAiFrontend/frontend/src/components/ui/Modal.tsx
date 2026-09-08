import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

const WIDTHS = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-3xl',
  xl: 'max-w-4xl',
} as const

export interface ModalProps {
  open: boolean
  onClose: () => void
  title?: ReactNode
  /** Rendered under the title inside the header block. */
  subtitle?: ReactNode
  icon?: ReactNode
  width?: keyof typeof WIDTHS
  children: ReactNode
  footer?: ReactNode
  /** Set false for flows that must not be dismissed by a stray backdrop click. */
  dismissOnBackdrop?: boolean
  bodyClassName?: string
}

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  icon,
  width = 'md',
  children,
  footer,
  dismissOnBackdrop = true,
  bodyClassName,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const titleId = useId()

  useEffect(() => {
    if (!open) return

    const previouslyFocused = document.activeElement as HTMLElement | null

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose()
        return
      }
      if (event.key !== 'Tab') return

      // Keep focus inside the dialog.
      const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )
      if (!focusable || focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown, true)

    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'

    // Focus the first meaningful control rather than the close button.
    const timer = window.setTimeout(() => {
      const target = panelRef.current?.querySelector<HTMLElement>('[data-autofocus]')
      ;(target ?? panelRef.current)?.focus()
    }, 30)

    return () => {
      document.removeEventListener('keydown', onKeyDown, true)
      document.body.style.overflow = overflow
      window.clearTimeout(timer)
      previouslyFocused?.focus?.()
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div
        className="absolute inset-0 bg-[var(--overlay)] backdrop-blur-[2px] animate-fade-in"
        onClick={dismissOnBackdrop ? onClose : undefined}
        aria-hidden
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
        className={cn(
          'relative flex max-h-[calc(100dvh-3rem)] w-full flex-col overflow-hidden rounded-2xl',
          'border border-line bg-panel shadow-[var(--shadow-modal)] outline-none animate-pop',
          WIDTHS[width],
        )}
      >
        {(title || icon) && (
          <header className="flex items-start gap-3.5 border-b border-line px-5 py-4 sm:px-6">
            {icon}
            <div className="min-w-0 flex-1">
              <h2 id={titleId} className="truncate text-lg font-semibold tracking-tight text-ink">
                {title}
              </h2>
              {subtitle && <div className="mt-1 flex items-center gap-2 text-xs">{subtitle}</div>}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              className="-mr-1 -mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg text-faint transition-colors hover:bg-card-2 hover:text-ink"
            >
              <X className="size-5" />
            </button>
          </header>
        )}

        <div className={cn('min-h-0 flex-1 overflow-y-auto scrollbar-thin', bodyClassName)}>{children}</div>

        {footer && (
          <footer className="flex items-center gap-3 border-t border-line bg-card-2/60 px-5 py-4 sm:px-6">
            {footer}
          </footer>
        )}
      </div>
    </div>,
    document.body,
  )
}
