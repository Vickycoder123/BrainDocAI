import { useEffect, useState } from 'react'
import { useEnqueueUploads } from '@/hooks/useUploadQueue'
import { useUiStore } from '@/store/useUiStore'

function carriesFiles(event: DragEvent): boolean {
  return Array.from(event.dataTransfer?.types ?? []).includes('Files')
}

/**
 * Lets files be dropped anywhere in the window, not just on the sidebar
 * dropzone. Returns whether a drag is currently hovering the page.
 */
export function useGlobalFileDrop(): boolean {
  const [dragging, setDragging] = useState(false)
  const enqueueUploads = useEnqueueUploads()
  const openUpload = useUiStore((state) => state.openUpload)

  useEffect(() => {
    // dragenter/dragleave fire per element, so count them to know when the
    // pointer has genuinely left the window.
    let depth = 0

    const onDragEnter = (event: DragEvent) => {
      if (!carriesFiles(event)) return
      depth += 1
      setDragging(true)
    }

    const onDragOver = (event: DragEvent) => {
      if (!carriesFiles(event)) return
      // Required, otherwise the browser opens the file instead of dropping it.
      event.preventDefault()
    }

    const onDragLeave = (event: DragEvent) => {
      if (!carriesFiles(event)) return
      depth = Math.max(0, depth - 1)
      if (depth === 0) setDragging(false)
    }

    const onDrop = (event: DragEvent) => {
      if (!carriesFiles(event)) return
      event.preventDefault()
      depth = 0
      setDragging(false)
      const files = event.dataTransfer?.files
      if (files && files.length > 0) {
        enqueueUploads(files)
        openUpload()
      }
    }

    window.addEventListener('dragenter', onDragEnter)
    window.addEventListener('dragover', onDragOver)
    window.addEventListener('dragleave', onDragLeave)
    window.addEventListener('drop', onDrop)

    return () => {
      window.removeEventListener('dragenter', onDragEnter)
      window.removeEventListener('dragover', onDragOver)
      window.removeEventListener('dragleave', onDragLeave)
      window.removeEventListener('drop', onDrop)
    }
  }, [enqueueUploads, openUpload])

  return dragging
}
