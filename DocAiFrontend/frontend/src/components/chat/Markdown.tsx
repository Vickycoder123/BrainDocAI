import { lazy, Suspense } from 'react'
import { cn } from '@/lib/utils'

const load = () => import('@/components/chat/MarkdownRenderer')

const MarkdownRenderer = lazy(load)

/**
 * react-markdown and its micromark dependencies are roughly half the bundle, and
 * nothing renders markdown until the first answer arrives. Splitting it keeps
 * the initial load lean; `preloadMarkdown()` fetches the chunk during idle time
 * so the fallback below is effectively never seen.
 */
export function preloadMarkdown(): void {
  const run = () => void load()
  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(run, { timeout: 2000 })
  } else {
    setTimeout(run, 500)
  }
}

export function Markdown({ content, className }: { content: string; className?: string }) {
  return (
    <Suspense
      fallback={
        <div className={cn('md-body whitespace-pre-wrap', className)}>{content}</div>
      }
    >
      <MarkdownRenderer content={content} className={className} />
    </Suspense>
  )
}
