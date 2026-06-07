import React, { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { usersApi } from '@/api';
import { setCredentials, clearAuth } from '@/store/slices/authSlice';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { tokens, onLogout } from '@/lib/apiClient';
import { disconnectStomp } from '@/lib/stompClient';

export default function AuthBootstrap() {
  const dispatch = useAppDispatch();
  const router   = useRouter();
  const segments = useSegments();
  const { isAuth, loading } = useAppSelector(s => s.auth);

  useEffect(() => {
    const bootstrap = async () => {
      const access = await tokens.getAccess();
      if (!access) { dispatch(clearAuth()); return; }
      try {
        const user = await usersApi.getMe();
        const refresh = (await tokens.getRefresh()) ?? '';
        // tokens already persisted in SecureStore — just hydrate Redux state
        dispatch(setCredentials({ user, accessToken: access, refreshToken: refresh }));
      } catch {
        await tokens.clear();
        dispatch(clearAuth());
      }
    };
    bootstrap();
    return onLogout(async () => { disconnectStomp(); await tokens.clear(); dispatch(clearAuth()); });
  }, []);

  useEffect(() => {
    if (loading) return;
    const inAuth = segments[0] === '(auth)';
    if (!isAuth && !inAuth) router.replace('/(auth)/login');
    if (isAuth && inAuth)  router.replace('/(tabs)');
  }, [isAuth, loading, segments]);

  return null;
}
