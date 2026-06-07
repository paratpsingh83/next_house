import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import chatReducer from './slices/chatSlice';
import notifReducer from './slices/notifSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    chat: chatReducer,
    notif: notifReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
