import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { ChatMessageResponse, ChatRoomResponse } from '@/types';

interface ChatState {
  rooms: ChatRoomResponse[];
  messages: Record<number, ChatMessageResponse[]>;
  totalUnread: number;
}

const chatSlice = createSlice({
  name: 'chat',
  initialState: { rooms: [], messages: {}, totalUnread: 0 } as ChatState,
  reducers: {
    setRooms: (s, a: PayloadAction<ChatRoomResponse[]>) => { s.rooms = a.payload; },
    upsertRoom: (s, a: PayloadAction<ChatRoomResponse>) => {
      const idx = s.rooms.findIndex(r => r.id === a.payload.id);
      if (idx >= 0) s.rooms[idx] = a.payload; else s.rooms.unshift(a.payload);
    },
    setMessages: (s, a: PayloadAction<{ roomId: number; messages: ChatMessageResponse[] }>) => {
      s.messages[a.payload.roomId] = a.payload.messages;
    },
    appendMessage: (s, a: PayloadAction<{ roomId: number; message: ChatMessageResponse }>) => {
      if (!s.messages[a.payload.roomId]) s.messages[a.payload.roomId] = [];
      s.messages[a.payload.roomId].push(a.payload.message);
      const room = s.rooms.find(r => r.id === a.payload.roomId);
      if (room) {
        room.lastMessagePreview = a.payload.message.message ?? '📎 Media';
        room.lastMessageSenderName = a.payload.message.sender.name;
        room.lastMessageAt = a.payload.message.createdAt;
      }
    },
    setTotalUnread: (s, a: PayloadAction<number>) => { s.totalUnread = a.payload; },
  },
});

export const { setRooms, upsertRoom, setMessages, appendMessage, setTotalUnread } = chatSlice.actions;
export default chatSlice.reducer;
