import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { UserResponse } from '@/types';

// Token management is handled by httpOnly cookies (server-side).
// Redux state only tracks who is logged in — not the tokens themselves.

interface AuthState {
  user: UserResponse | null;
  isAuth: boolean;
  loading: boolean;
}

const initialState: AuthState = {
  user: null,
  isAuth: false,
  loading: true,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{ user: UserResponse }>
    ) => {
      state.user    = action.payload.user;
      state.isAuth  = true;
      state.loading = false;
    },
    setUser: (state, action: PayloadAction<UserResponse>) => {
      state.user = action.payload;
    },
    clearAuth: (state) => {
      state.user    = null;
      state.isAuth  = false;
      state.loading = false;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
  },
});

export const { setCredentials, setUser, clearAuth, setLoading } = authSlice.actions;
export default authSlice.reducer;
