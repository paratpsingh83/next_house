'use client';
// src/components/auth/AuthProvider.tsx
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppDispatch } from '@/store';
import { setCredentials, clearAuth, setLoading } from '@/store/slices/authSlice';
import { tokens } from '@/lib/apiClient';
import { usersApi } from '@/api';

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  const router   = useRouter();

  useEffect(() => {
    // Listen for forced logout events (token refresh failed)
    const handleLogout = () => {
      dispatch(clearAuth());
      router.push('/login');
    };
    window.addEventListener('nh:logout', handleLogout);

    // Hydrate session on mount
    const access  = tokens.getAccess();
    const refresh = tokens.getRefresh();

    if (!access || !refresh) {
      dispatch(setLoading(false));
    } else {
      usersApi.getMe()
        .then(user => {
          dispatch(setCredentials({ user, accessToken: access, refreshToken: refresh }));
        })
        .catch(() => {
          dispatch(clearAuth());
        });
    }

    return () => window.removeEventListener('nh:logout', handleLogout);
  }, []); // eslint-disable-line

  return <>{children}</>;
}
