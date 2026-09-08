import {
  FileCode2,
  FileSpreadsheet,
  FileText,
  FileType2,
  Presentation,
  type LucideIcon,
} from 'lucide-react'
import { cn, fileExtension } from '@/lib/utils'

const ICON_BY_EXTENSION: Record<string, LucideIcon> = {
  pdf: FileType2,
  doc: FileText,
  docx: FileText,
  odt: FileText,
  rtf: FileText,
  md: FileText,
  markdown: FileText,
  txt: FileText,
  csv: FileSpreadsheet,
  xls: FileSpreadsheet,
  xlsx: FileSpreadsheet,
  ppt: Presentation,
  pptx: Presentation,
  json: FileCode2,
  xml: FileCode2,
  html: FileCode2,
  htm: FileCode2,
}

export function FileTypeIcon({
  filename,
  className,
}: {
  filename: string | null | undefined
  className?: string
}) {
  const Icon = ICON_BY_EXTENSION[fileExtension(filename)] ?? FileText
  return <Icon className={cn('size-4', className)} aria-hidden />
}

/** The rounded tinted square used in the sidebar rows and the detail dialog. */
export function FileTypeTile({
  filename,
  size = 'md',
  className,
}: {
  filename: string | null | undefined
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const box = size === 'lg' ? 'size-12 rounded-xl' : size === 'sm' ? 'size-7 rounded-lg' : 'size-9 rounded-lg'
  const icon = size === 'lg' ? 'size-6' : size === 'sm' ? 'size-3.5' : 'size-4.5'

  return (
    <span
      className={cn(
        'grid shrink-0 place-items-center border border-brand-line bg-brand-soft text-brand-text',
        box,
        className,
      )}
    >
      <FileTypeIcon filename={filename} className={icon} />
    </span>
  )
}
