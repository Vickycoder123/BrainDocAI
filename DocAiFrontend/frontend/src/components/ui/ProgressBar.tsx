import { cn } from '@/lib/utils'

export interface ProgressBarProps {
  /** 0-100. Ignored when `indeterminate` is set. */
  value: number
  indeterminate?: boolean
  tone?: 'brand' | 'ok' | 'bad' | 'muted'
  className?: string
  label?: string
}

const TONES = {
  brand: 'bg-brand',
  ok: 'bg-ok',
  bad: 'bg-bad',
  muted: 'bg-line-2',
} as const

export function ProgressBar({ value, indeterminate, tone = 'brand', className, label }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value))

  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={indeterminate ? undefined : clamped}
      aria-label={label}
      className={cn('relative h-1.5 w-full overflow-hidden rounded-full bg-sunken', className)}
    >
      {indeterminate ? (
        <div className={cn('absolute inset-y-0 w-1/3 rounded-full animate-indeterminate', TONES[tone])} />
      ) : (
        <div
          className={cn('h-full rounded-full transition-[width] duration-200 ease-out', TONES[tone])}
          style={{ width: `${clamped}%` }}
        />
      )}
    </div>
  )
}
