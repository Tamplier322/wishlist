import { configureStore } from '@reduxjs/toolkit';
import { baseApi } from '../api/baseApi';
import { tokenStorage } from '../api/client';
import { startOfflineSync, type QueuedRequest } from '../utils/offline-queue';
import uiReducer from '../features/ui/uiSlice';
import guestReducer from '../features/guest/guestSlice';
import notificationsReducer from '../features/notifications/notificationsSlice';
import { guestPersistenceMiddleware, startGuestSync } from '../features/guest/guestPersistence';

export const store = configureStore({
  reducer: {
    [baseApi.reducerPath]: baseApi.reducer,
    ui: uiReducer,
    guest: guestReducer,
    notifications: notificationsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(baseApi.middleware, guestPersistenceMiddleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

async function sendQueuedRequest(request: QueuedRequest): Promise<boolean> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = tokenStorage.get();
  if (token) headers.Authorization = `Bearer ${token}`;
  try {
    const response = await fetch(`/api${request.url}`, {
      method: request.method,
      headers,
      body: request.body,
    });
    return response.ok || (response.status >= 400 && response.status < 500);
  } catch {
    return false;
  }
}

startOfflineSync(sendQueuedRequest);
startGuestSync(store.dispatch);

window.addEventListener('offline-queue-flushed', () => {
  store.dispatch(baseApi.util.invalidateTags(['Wishlist', 'Wishlists']));
});
