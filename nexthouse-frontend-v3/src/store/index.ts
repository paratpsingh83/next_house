import { configureStore } from '@reduxjs/toolkit';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import authReducer    from './slices/authSlice';
import chatReducer    from './slices/chatSlice';
import notifReducer   from './slices/notifSlice';
import presenceReducer from './slices/presenceSlice';

export const store = configureStore({
  reducer: { auth: authReducer, chat: chatReducer, notif: notifReducer, presence: presenceReducer },
  middleware: g => g({ serializableCheck: false }),
});

export type RootState   = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
