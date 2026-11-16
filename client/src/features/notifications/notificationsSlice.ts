import { createSlice, type PayloadAction } from '@reduxjs/toolkit';



export type ToastKind = 'info' | 'success' | 'error';

export interface Toast {
  id: number;
  text: string;
  kind: ToastKind;
}

export interface NotificationEntry {
  id: number;
  text: string;
  kind: ToastKind;
  createdAt: string;
  read: boolean;
}

interface NotificationsState {
  toasts: Toast[];
  history: NotificationEntry[];
}

const HISTORY_KEY = 'wl_notifications_history';
const HISTORY_LIMIT = 50;

function loadHistory(): NotificationEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as NotificationEntry[];
    return Array.isArray(parsed) ? parsed.slice(0, HISTORY_LIMIT) : [];
  } catch {
    return [];
  }
}

function saveHistory(history: NotificationEntry[]): void {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, HISTORY_LIMIT)));
}

const initialState: NotificationsState = {
  toasts: [],
  history: loadHistory(),
};

let nextId = 1;

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    pushToast(state, action: PayloadAction<{ text: string; kind?: ToastKind }>) {
      state.toasts.push({
        id: nextId++,
        text: action.payload.text,
        kind: action.payload.kind ?? 'info',
      });
      if (state.toasts.length > 4) state.toasts = state.toasts.slice(-4);
    },
    dismissToast(state, action: PayloadAction<number>) {
      state.toasts = state.toasts.filter((toast) => toast.id !== action.payload);
    },
    pushEvent(state, action: PayloadAction<{ text: string; kind?: ToastKind }>) {
      const kind = action.payload.kind ?? 'info';
      state.history.unshift({
        id: nextId++,
        text: action.payload.text,
        kind,
        createdAt: new Date().toISOString(),
        read: false,
      });
      if (state.history.length > HISTORY_LIMIT) state.history = state.history.slice(0, HISTORY_LIMIT);
      saveHistory(state.history);

      state.toasts.push({ id: nextId++, text: action.payload.text, kind });
      if (state.toasts.length > 4) state.toasts = state.toasts.slice(-4);
    },
    markAllRead(state) {
      state.history = state.history.map((entry) => ({ ...entry, read: true }));
      saveHistory(state.history);
    },
    clearHistory(state) {
      state.history = [];
      saveHistory(state.history);
    },
  },
});

export const { pushToast, dismissToast, pushEvent, markAllRead, clearHistory } =
  notificationsSlice.actions;
export default notificationsSlice.reducer;

export const selectUnreadCount = (state: { notifications: NotificationsState }): number =>
  state.notifications.history.filter((entry) => !entry.read).length;
