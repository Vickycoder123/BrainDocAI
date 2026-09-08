import { cn } from '@/lib/utils'

export interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  /** Hide the text label but keep it as the accessible name. */
  hideLabel?: boolean
  title?: string
  className?: string
}

export function Toggle({ checked, onChange, label, hideLabel, title, className }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={hideLabel ? label : undefined}
      title={title}
      onClick={() => onChange(!checked)}
      className={cn(
        'group inline-flex items-center gap-2.5 rounded-lg text-xs font-medium transition-colors',
        checked ? 'text-ink' : 'text-muted hover:text-ink',
        className,
      )}
    >
      <span
        className={cn(
          'relative h-5 w-9 shrink-0 rounded-full transition-colors duration-200',
          checked ? 'bg-brand' : 'bg-line-2',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow-sm transition-transform duration-200',
            checked && 'translate-x-4',
          )}
        />
      </span>
      {!hideLabel && <span>{label}</span>}
    </button>
  )
}
