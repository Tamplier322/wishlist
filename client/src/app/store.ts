import { configureStore } from '@reduxjs/toolkit';
import { baseApi } from '../api/baseApi';
import uiReducer from '../features/ui/uiSlice';
import guestReducer from '../features/guest/guestSlice';
import notificationsReducer from '../features/notifications/notificationsSlice';
import { guestPersistenceMiddleware } from '../features/guest/guestPersistence';

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
