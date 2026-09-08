import { Sparkles } from 'lucide-react'
import { PROMPT_TEMPLATES, type PromptTemplate } from '@/lib/constants'

function TemplateCard({ template, onPick }: { template: PromptTemplate; onPick: (prompt: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onPick(template.prompt)}
      className="group rounded-xl border border-line bg-card p-4 text-left transition-colors hover:border-brand-line hover:bg-card-2"
    >
      <span className="flex items-center gap-2 text-sm font-semibold text-brand-text">
        <span aria-hidden>{template.emoji}</span>
        {template.title}
      </span>
      <span className="mt-1.5 block text-sm leading-relaxed text-muted">{template.prompt}</span>
    </button>
  )
}

export function WelcomeScreen({
  scopeLabel,
  onPick,
}: {
  scopeLabel: string
  onPick: (prompt: string) => void
}) {
  return (
    <div className="flex min-h-full flex-col items-center justify-center px-6 py-10">
      <div className="w-full max-w-3xl text-center">
        <div className="mx-auto mb-6 grid size-16 place-items-center rounded-2xl bg-brand text-white shadow-lg shadow-brand/20">
          <Sparkles className="size-8" aria-hidden />
        </div>

        <h2 className="text-3xl font-bold tracking-tight text-ink">BrainDoc AI Document Assistant</h2>
        <p className="mx-auto mt-3 max-w-xl text-[15px] leading-relaxed text-muted">
          Upload PDF reports, Word files, or notes and chat naturally with grounded facts, source citations,
          and page numbers.
        </p>
        <p className="mt-2 text-xs text-faint">
          Answering from <span className="font-medium text-muted">{scopeLabel}</span>
        </p>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {PROMPT_TEMPLATES.map((template) => (
            <TemplateCard key={template.id} template={template} onPick={onPick} />
          ))}
        </div>
      </div>
    </div>
  )
}
