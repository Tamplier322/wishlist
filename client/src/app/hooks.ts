import { useCallback } from 'react';
import { useDispatch, useSelector, type TypedUseSelectorHook } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { baseApi, useGetMeQuery, useLogoutMutation } from '../api/baseApi';
import { tokenStorage } from '../api/client';
import type { User } from '../types';
import type { store, RootState } from './store';


export type AppDispatch = typeof store.dispatch;
export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

export interface AuthStateInfo {
  status: 'checking' | 'authenticated' | 'anonymous' | 'unreachable';
  user: User | null;
}


export function useAuthStatus(): AuthStateInfo {
  const token = tokenStorage.get();
  const query = useGetMeQuery(undefined, { skip: !token });

  if (!token) return { status: 'anonymous', user: null };
  if (query.isUninitialized || query.isLoading) return { status: 'checking', user: null };

  if (query.isError) {
    const errorStatus = (query.error as { status?: unknown })?.status;
    const isAuthError = errorStatus === 401 || errorStatus === 403 || errorStatus === 404;
    if (isAuthError) {
      tokenStorage.clear();
      return { status: 'anonymous', user: null };
    }
    return { status: 'unreachable', user: null };
  }

  if (!query.data) {
    tokenStorage.clear();
    return { status: 'anonymous', user: null };
  }

  return { status: 'authenticated', user: query.data };
}


export function useLogout(): () => void {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [logoutOnServer] = useLogoutMutation();

  return useCallback(() => {
    void logoutOnServer()
      .unwrap()
      .catch(() => undefined);
    tokenStorage.clear();
    dispatch(baseApi.util.resetApiState());
    navigate('/');
  }, [dispatch, navigate, logoutOnServer]);
}
