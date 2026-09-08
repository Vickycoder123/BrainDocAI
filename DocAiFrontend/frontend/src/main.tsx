import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import App from '@/App'
import { ApiError } from '@/lib/http'
import { useUiStore } from '@/store/useUiStore'
import '@/index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // A 404 or a validation error will never succeed on retry; a flaky
      // network might. Retry once, and never for client-side errors.
      retry: (failureCount, error) => {
        if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false
        return failureCount < 1
      },
      staleTime: 10_000,
      refetchOnWindowFocus: false,
    },
    mutations: { retry: false },
  },
})

function ThemedToaster() {
  const theme = useUiStore((state) => state.theme)
  return (
    <Toaster
      theme={theme}
      position="bottom-right"
      closeButton
      richColors
      toastOptions={{ style: { fontFamily: 'inherit' } }}
    />
  )
}

const container = document.getElementById('root')
if (!container) throw new Error('Root element #root not found in index.html')

createRoot(container).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <ThemedToaster />
    </QueryClientProvider>
  </StrictMode>,
)
