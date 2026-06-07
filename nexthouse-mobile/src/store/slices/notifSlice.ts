import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface NotifState {
  unreadCount: number;
}

const notifSlice = createSlice({
  name: 'notif',
  initialState: { unreadCount: 0 } as NotifState,
  reducers: {
    setUnreadCount: (s, a: PayloadAction<number>) => { s.unreadCount = a.payload; },
    decrementUnread: (s) => { if (s.unreadCount > 0) s.unreadCount -= 1; },
    clearUnread: (s) => { s.unreadCount = 0; },
  },
});

export const { setUnreadCount, decrementUnread, clearUnread } = notifSlice.actions;
export default notifSlice.reducer;
