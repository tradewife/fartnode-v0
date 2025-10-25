/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly ACTION_WORKER_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
