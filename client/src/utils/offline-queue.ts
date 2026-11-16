export interface QueuedRequest {
  id: string;
  url: string;
  method: string;
  body?: string;
  createdAt: number;
}

export type OfflineSender = (request: QueuedRequest) => Promise<boolean>;

const DB_NAME = 'wl-offline-queue';
const DB_VERSION = 1;
const STORE = 'requests';
const SYNC_TAG = 'wl-offline-sync';

function createId(): string {
  return typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `q-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function openDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: 'id' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

function withStore<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T> | null,
): Promise<T | null> {
  return openDb().then(
    (db) =>
      new Promise<T | null>((resolve) => {
        if (!db) {
          resolve(null);
          return;
        }
        try {
          const transaction = db.transaction(STORE, mode);
          const request = action(transaction.objectStore(STORE));
          if (!request) {
            resolve(null);
            return;
          }
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => resolve(null);
        } catch {
          resolve(null);
        }
      }),
  );
}

export async function enqueueRequest(request: Omit<QueuedRequest, 'id' | 'createdAt'>): Promise<void> {
  await withStore('readwrite', (store) =>
    store.put({ ...request, id: createId(), createdAt: Date.now() }),
  );
}

export function pendingRequests(): Promise<QueuedRequest[]> {
  return withStore<QueuedRequest[]>('readonly', (store) => store.getAll()).then(
    (rows) => rows ?? [],
  );
}

export async function pendingRequestsCount(): Promise<number> {
  const rows = await pendingRequests();
  return rows.length;
}

async function removeRequest(id: string): Promise<void> {
  await withStore('readwrite', (store) => store.delete(id));
}

let sender: OfflineSender | null = null;
let flushing = false;

export function setOfflineSender(next: OfflineSender): void {
  sender = next;
}

export async function flushOfflineQueue(): Promise<number> {
  if (flushing || !sender || typeof navigator === 'undefined' || !navigator.onLine) return 0;
  flushing = true;
  let sent = 0;
  try {
    const queue = (await pendingRequests()).sort((left, right) => left.createdAt - right.createdAt);
    for (const request of queue) {
      let ok = false;
      try {
        ok = await sender(request);
      } catch {
        ok = false;
      }
      if (!ok) break;
      await removeRequest(request.id);
      sent += 1;
    }
  } finally {
    flushing = false;
  }
  if (sent > 0) {
    window.dispatchEvent(new CustomEvent('offline-queue-flushed', { detail: { sent } }));
  }
  return sent;
}

export function startOfflineSync(next: OfflineSender): void {
  setOfflineSender(next);

  window.addEventListener('online', () => {
    void flushOfflineQueue();
  });
  window.addEventListener('offline-queue-flushed', () => {
    void flushOfflineQueue();
  });
  void flushOfflineQueue();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => {
        const sync = (
          registration as ServiceWorkerRegistration & {
            sync?: { register(tag: string): Promise<void> };
          }
        ).sync;
        void sync?.register(SYNC_TAG).catch(() => undefined);
      })
      .catch(() => undefined);
    navigator.serviceWorker.addEventListener('message', (event) => {
      const data = event.data as { type?: string } | null;
      if (data?.type === 'wl-flush-queue') void flushOfflineQueue();
    });
  }
}

export function isNetworkFailure(status: unknown): boolean {
  return status === 'FETCH_ERROR' || status === 'TIMEOUT_ERROR';
}
