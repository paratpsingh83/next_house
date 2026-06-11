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
    // Forced logout (token refresh failed)
    const handleLogout = () => {
      tokens.clear();
      dispatch(clearAuth());
      router.push('/login');
    };
    window.addEventListener('nh:logout', handleLogout);

    // Hydrate session via httpOnly cookie — no token check needed client-side
    usersApi.getMe()
      .then(user => {
        dispatch(setCredentials({ user }));
      })
      .catch(() => {
        // Not logged in (401) — that's fine, not an error
        dispatch(setLoading(false));
      });

    return () => window.removeEventListener('nh:logout', handleLogout);
  }, []); // eslint-disable-line

  return <>{children}</>;
}
