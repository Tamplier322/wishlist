import type { Middleware } from '@reduxjs/toolkit';
import {
  GUEST_SCHEMA_VERSION,
  GUEST_STORAGE_KEY,
  replaceGuestState,
  type GuestState,
} from './guestSlice';

const CHANNEL_NAME = 'wl-guest-sync';

interface GuestChannelMessage {
  type: 'guest-state';
  state: GuestState;
}

const channel = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(CHANNEL_NAME);

function persist(state: GuestState): void {
  localStorage.setItem(
    GUEST_STORAGE_KEY,
    JSON.stringify({ version: GUEST_SCHEMA_VERSION, ...state }),
  );
}

export const guestPersistenceMiddleware: Middleware = (storeApi) => (next) => (action) => {
  const result = next(action);
  const typed = action as { type?: string; meta?: { remote?: boolean } };
  if (typeof typed.type === 'string' && typed.type.startsWith('guest/')) {
    const state = (storeApi.getState() as { guest: GuestState }).guest;
    persist(state);
    if (!typed.meta?.remote) {
      channel?.postMessage({ type: 'guest-state', state } satisfies GuestChannelMessage);
    }
  }
  return result;
};

export function startGuestSync(dispatch: (action: unknown) => void): void {
  channel?.addEventListener('message', (event: MessageEvent<GuestChannelMessage>) => {
    if (event.data?.type !== 'guest-state' || !event.data.state) return;
    dispatch({ type: replaceGuestState.type, payload: event.data.state, meta: { remote: true } });
  });
}

export function exportGuestJson(state: GuestState): void {
  const payload = {
    version: GUEST_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    items: state.items,
    categories: state.categories,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `wishlist-guest-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function importGuestJson(file: File): Promise<GuestState> {
  const text = await file.text();
  const parsed = JSON.parse(text) as { items?: unknown; categories?: unknown };
  if (!Array.isArray(parsed.items) || !Array.isArray(parsed.categories)) {
    throw new Error('Некорректный формат файла');
  }
  return {
    items: parsed.items as GuestState['items'],
    categories: parsed.categories as GuestState['categories'],
  };
}
