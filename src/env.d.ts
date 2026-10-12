/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_KEY: string
  readonly VITE_API_ID: string
  readonly VITE_API_DOMAIN: string
  readonly VITE_PROJECT_ID: string
  readonly VITE_STORAGE_BACKET: string
  readonly VITE_MESSAGING_SENDER_ID: string
  /** the Cloudflare Worker (worker/), e.g. https://bible-worker.<account>.workers.dev */
  readonly VITE_WORKER_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
