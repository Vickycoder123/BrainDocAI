/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Absolute origin for API calls. Empty in dev so the Vite proxy handles /api. */
  readonly VITE_API_BASE_URL?: string
  /** Where Spring Boot actually lives — used for the Swagger link and error copy. */
  readonly VITE_BACKEND_ORIGIN?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
