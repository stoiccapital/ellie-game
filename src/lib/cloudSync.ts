// Mirror zustand/persist's localStorage snapshot to a Cloudflare Worker, keyed by an anonymous UUID.
//
// Flow:
//   1. On boot: if the Worker URL is configured and we have a client id, GET the remote blob.
//      If remote is newer than local (or local is empty), overlay it into the persist key and
//      reload the store from storage. Then local → cloud sync kicks in.
//   2. On every state change (zustand subscribe): debounce ~1.5s, then PUT the current blob.

import { useGame } from '../store';

const STORAGE_KEY = 'ellie-money-house:v1';
const CLIENT_ID_KEY = 'ellie-money-house:client-id';
const WORKER_URL = import.meta.env.VITE_SAVE_WORKER_URL as string | undefined;

function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function getClientId(): string {
  let id = localStorage.getItem(CLIENT_ID_KEY);
  if (!id) {
    id = uuid();
    localStorage.setItem(CLIENT_ID_KEY, id);
  }
  return id;
}

export function getSaveUrl(): string | null {
  if (!WORKER_URL) return null;
  return `${WORKER_URL.replace(/\/$/, '')}/save/${getClientId()}`;
}

interface PersistEnvelope {
  state: Record<string, unknown>;
  version: number;
}

function readLocal(): PersistEnvelope | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function remoteIsNewer(remote: PersistEnvelope, local: PersistEnvelope | null): boolean {
  if (!local) return true;
  const rMonth = typeof remote.state?.month === 'number' ? remote.state.month : -1;
  const lMonth = typeof local.state?.month === 'number' ? local.state.month : -1;
  return rMonth > lMonth;
}

export async function hydrateFromCloud(): Promise<void> {
  const url = getSaveUrl();
  if (!url) return;
  try {
    const res = await fetch(url, { method: 'GET' });
    if (res.status === 404) return; // no remote save yet
    if (!res.ok) return;
    const remote = (await res.json()) as PersistEnvelope;
    const local = readLocal();
    if (remoteIsNewer(remote, local)) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(remote));
      await useGame.persist.rehydrate();
    }
  } catch {
    // Offline / worker down — fall back to localStorage silently.
  }
}

export function startCloudAutosave(): () => void {
  const url = getSaveUrl();
  if (!url) return () => {};

  let timer: ReturnType<typeof setTimeout> | null = null;
  const push = () => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    fetch(url, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: raw,
      keepalive: true,
    }).catch(() => {
      // Silent — localStorage still has the save.
    });
  };

  const unsub = useGame.subscribe(() => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(push, 1500);
  });

  // Final flush on page hide so a quick close still ships the latest state.
  const onHide = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    push();
  };
  window.addEventListener('pagehide', onHide);
  window.addEventListener('beforeunload', onHide);

  return () => {
    unsub();
    window.removeEventListener('pagehide', onHide);
    window.removeEventListener('beforeunload', onHide);
    if (timer) clearTimeout(timer);
  };
}
