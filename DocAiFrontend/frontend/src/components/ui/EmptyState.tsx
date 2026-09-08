import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface EmptyStateProps {
  icon: LucideIcon
  title?: ReactNode
  description: ReactNode
  action?: ReactNode
  className?: string
  tone?: 'muted' | 'danger'
}

export function EmptyState({ icon: Icon, title, description, action, className, tone = 'muted' }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-14 text-center', className)}>
      <Icon
        className={cn('mb-4 size-9', tone === 'danger' ? 'text-bad' : 'text-faint')}
        strokeWidth={1.5}
        aria-hidden
      />
      {title && <p className="mb-1 text-sm font-semibold text-ink">{title}</p>}
      <p className={cn('max-w-sm text-sm', tone === 'danger' ? 'text-bad' : 'text-muted')}>{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-lg bg-card-2', className)} />
}
