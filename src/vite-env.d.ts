/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SAVE_WORKER_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
