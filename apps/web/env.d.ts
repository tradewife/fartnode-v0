/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ACTION_WORKER_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
