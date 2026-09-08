import { AlertCircle, CheckCircle2, Loader2, UploadCloud } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DocumentStatus } from '@/types/api'

const STATUS_META: Record<
  DocumentStatus,
  { label: string; icon: typeof CheckCircle2; className: string; spin?: boolean }
> = {
  INDEXED: { label: 'Indexed', icon: CheckCircle2, className: 'text-ok' },
  PROCESSING: { label: 'Processing', icon: Loader2, className: 'text-warn', spin: true },
  UPLOADING: { label: 'Uploading', icon: UploadCloud, className: 'text-brand-text' },
  FAILED: { label: 'Failed', icon: AlertCircle, className: 'text-bad' },
}

export function StatusBadge({
  status,
  className,
}: {
  status: DocumentStatus
  className?: string
}) {
  const meta = STATUS_META[status] ?? STATUS_META.FAILED
  const Icon = meta.icon
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs font-medium', meta.className, className)}>
      <Icon className={cn('size-3.5', meta.spin && 'animate-spin')} aria-hidden />
      {meta.label}
    </span>
  )
}

/** The pill form used in the document detail dialog header. */
export function StatusPill({ status }: { status: DocumentStatus }) {
  const meta = STATUS_META[status] ?? STATUS_META.FAILED
  const Icon = meta.icon
  const tone =
    status === 'INDEXED'
      ? 'bg-ok-soft border-ok-line text-ok'
      : status === 'FAILED'
        ? 'bg-bad-soft border-bad/30 text-bad'
        : 'bg-warn-soft border-warn/30 text-warn'

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1',
        'text-[11px] font-bold tracking-wide uppercase',
        tone,
      )}
    >
      <Icon className={cn('size-3.5', meta.spin && 'animate-spin')} aria-hidden />
      {status}
    </span>
  )
}
