import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// The Spring Boot backend runs on 8080 (see application.yml).
// In dev we proxy /api through Vite so the browser sees a same-origin app:
// no CORS preflight, and the token stream from /api/v1/chat/stream is piped through untouched.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backend = env.VITE_BACKEND_ORIGIN || 'http://localhost:8080'

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      port: 5173,
      strictPort: false,
      proxy: {
        '/api': {
          target: backend,
          changeOrigin: true,
          // Long-running RAG calls (embedding + LLM) can easily exceed the default.
          timeout: 300_000,
          proxyTimeout: 300_000,
        },
        '/swagger-ui': { target: backend, changeOrigin: true },
        '/v3/api-docs': { target: backend, changeOrigin: true },
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
    },
  }
})
