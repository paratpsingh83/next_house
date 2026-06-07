import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { UserResponse } from '@/types';

interface AuthState {
  user: UserResponse | null;
  isAuth: boolean;
  loading: boolean;
}

// Reducers must be pure and synchronous.
// Callers are responsible for calling tokens.set() / tokens.clear() BEFORE dispatching.
const authSlice = createSlice({
  name: 'auth',
  initialState: { user: null, isAuth: false, loading: true } as AuthState,
  reducers: {
    setCredentials: (s, a: PayloadAction<{ user: UserResponse; accessToken: string; refreshToken: string }>) => {
      s.user = a.payload.user;
      s.isAuth = true;
      s.loading = false;
    },
    setUser: (s, a: PayloadAction<UserResponse>) => { s.user = a.payload; },
    clearAuth: (s) => {
      s.user = null;
      s.isAuth = false;
      s.loading = false;
    },
    setLoading: (s, a: PayloadAction<boolean>) => { s.loading = a.payload; },
  },
});

export const { setCredentials, setUser, clearAuth, setLoading } = authSlice.actions;
export default authSlice.reducer;
