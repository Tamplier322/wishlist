import type { Middleware } from '@reduxjs/toolkit';
import { GUEST_STORAGE_KEY } from './guestSlice';


export const guestPersistenceMiddleware: Middleware = (storeApi) => (next) => (action) => {
  const result = next(action);
  if (typeof action === 'object' && action !== null && 'type' in action) {
    const type = String(action.type);
    if (type.startsWith('guest/')) {
      const state = storeApi.getState().guest;
      localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(state));
    }
  }
  return result;
};
