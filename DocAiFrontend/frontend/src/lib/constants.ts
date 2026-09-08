/** Matches spring.servlet.multipart.max-file-size in application-dev.yml. */
export const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024
export const MAX_FILE_SIZE_LABEL = '25MB'

/** Everything DocumentParserService can handle (PagePdfDocumentReader + Tika). */
export const ACCEPTED_EXTENSIONS = [
  '.pdf',
  '.doc',
  '.docx',
  '.md',
  '.markdown',
  '.txt',
  '.csv',
  '.rtf',
  '.odt',
  '.ppt',
  '.pptx',
  '.xls',
  '.xlsx',
  '.html',
  '.htm',
  '.json',
  '.xml',
] as const

export const ACCEPT_ATTRIBUTE = ACCEPTED_EXTENSIONS.join(',')

export const SUPPORTED_HINT = `PDF, Word, Markdown, TXT, CSV (max ${MAX_FILE_SIZE_LABEL})`

/** Retrieval defaults; the backend falls back to app.rag.top-k (5) when null. */
export const DEFAULT_CHAT_TOP_K = 5
export const DEFAULT_SEARCH_TOP_K = 8
export const MAX_SAMPLE_CHUNKS = 12

export interface PromptTemplate {
  id: string
  emoji: string
  title: string
  prompt: string
}

/** The four starter cards on the empty chat screen. */
export const PROMPT_TEMPLATES: PromptTemplate[] = [
  {
    id: 'summary',
    emoji: '📄',
    title: 'Summarize Key Points',
    prompt: 'Summarize the key points and executive highlights of this document.',
  },
  {
    id: 'qa',
    emoji: '❓',
    title: 'Interview / Q&A Insights',
    prompt: 'What are the most critical questions and answers covered in this text?',
  },
  {
    id: 'actions',
    emoji: '📝',
    title: 'Action Items & Deadlines',
    prompt: 'List all actionable takeaways, deadlines, and responsibilities mentioned.',
  },
  {
    id: 'concepts',
    emoji: '🔍',
    title: 'Technical Concepts',
    prompt: 'Explain the main technical concepts and architecture described in this document.',
  },
]

// Storage keys are internal identifiers, not UI copy — kept stable across the
// BrainDoc rename so existing saved theme, scope and chat threads survive.
export const THEME_STORAGE_KEY = 'docmind-theme'
