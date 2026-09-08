import { useEffect, useRef, useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { cn, copyToClipboard } from '@/lib/utils'

export interface CopyButtonProps {
  value: string
  label?: string
  className?: string
  iconClassName?: string
  children?: React.ReactNode
}

export function CopyButton({ value, label = 'Copy', className, iconClassName, children }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)
  const timerRef = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(timerRef.current), [])

  const handleCopy = async () => {
    const ok = await copyToClipboard(value)
    if (!ok) return
    setCopied(true)
    window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => setCopied(false), 1600)
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={copied ? 'Copied' : label}
      aria-label={copied ? 'Copied' : label}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg text-faint transition-colors hover:text-ink',
        className,
      )}
    >
      {copied ? (
        <Check className={cn('size-4 text-ok', iconClassName)} aria-hidden />
      ) : (
        <Copy className={cn('size-4', iconClassName)} aria-hidden />
      )}
      {children}
    </button>
  )
}
