// src/lib/ws.ts — STOMP over SockJS WebSocket
import { Client, IMessage } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { tokens } from './apiClient';
import type { ChatMessageResponse, NotificationResponse } from '@/types';

const WS_URL = `${process.env.NEXT_PUBLIC_WS_URL ?? 'http://localhost:8080'}/ws`;

let client: Client | null = null;
let heartbeatInterval: ReturnType<typeof setInterval> | null = null;

// Callbacks waiting for the next successful connection (drained on each connect)
const connectQueue: Set<() => void> = new Set();

function drainConnectQueue() {
  connectQueue.forEach(cb => cb());
  connectQueue.clear();
}

export const wsClient = {

  connect(onConnected?: () => void, onDisconnected?: () => void): void {
    const token = tokens.getAccess();
    if (!token) return;
    if (client?.connected) return;

    client = new Client({
      webSocketFactory: () => new (SockJS as any)(WS_URL),
      // beforeConnect runs before every connect attempt (including reconnects),
      // so the token is always fresh even after an HTTP token refresh.
      beforeConnect: () => {
        const freshToken = tokens.getAccess();
        if (client) client.connectHeaders = { Authorization: `Bearer ${freshToken}` };
      },
      connectHeaders: { Authorization: `Bearer ${token}` },
      heartbeatIncoming: 25000,
      heartbeatOutgoing: 25000,
      reconnectDelay: 5000,
      onConnect: () => {
        console.info('[WS] Connected');
        heartbeatInterval = setInterval(() => {
          if (client?.connected) {
            client.publish({ destination: '/app/presence/heartbeat', body: '{}' });
          }
        }, 60000);
        // Re-establish any subscriptions that were registered before connection was ready
        drainConnectQueue();
        onConnected?.();
      },
      onDisconnect: () => {
        console.info('[WS] Disconnected');
        if (heartbeatInterval) { clearInterval(heartbeatInterval); heartbeatInterval = null; }
        onDisconnected?.();
      },
      onStompError: frame => {
        console.error('[WS] STOMP error:', frame.headers?.message);
      },
    });

    client.activate();
  },

  disconnect(): void {
    if (heartbeatInterval) { clearInterval(heartbeatInterval); heartbeatInterval = null; }
    connectQueue.clear();
    client?.deactivate();
    client = null;
  },

  isConnected: (): boolean => client?.connected ?? false,

  // Runs cb immediately if connected, otherwise defers until next connect event.
  // Returns a cancel function (call on component unmount to prevent stale subscriptions).
  onceConnected(cb: () => void): () => void {
    if (client?.connected) { cb(); return () => {}; }
    connectQueue.add(cb);
    return () => connectQueue.delete(cb);
  },

  // Subscribe to room messages → /topic/rooms/{roomId}/messages
  onRoomMessage(roomId: number, handler: (msg: ChatMessageResponse) => void): () => void {
    if (!client?.connected) return () => {};
    const sub = client.subscribe(`/topic/rooms/${roomId}/messages`, (frame: IMessage) => {
      handler(JSON.parse(frame.body));
    });
    return () => sub.unsubscribe();
  },

  // Subscribe to typing indicators → /topic/rooms/{roomId}/typing
  onTyping(roomId: number, handler: (payload: { userId: number; typing: boolean }) => void): () => void {
    if (!client?.connected) return () => {};
    const sub = client.subscribe(`/topic/rooms/${roomId}/typing`, (frame: IMessage) => {
      handler(JSON.parse(frame.body));
    });
    return () => sub.unsubscribe();
  },

  // Subscribe to personal notifications → /user/queue/notifications
  onNotification(handler: (notif: NotificationResponse) => void): () => void {
    if (!client?.connected) return () => {};
    const sub = client.subscribe('/user/queue/notifications', (frame: IMessage) => {
      handler(JSON.parse(frame.body));
    });
    return () => sub.unsubscribe();
  },

  // Subscribe to presence changes → /topic/presence/{userId}
  onPresence(userId: number, handler: (p: { userId: number; online: boolean }) => void): () => void {
    if (!client?.connected) return () => {};
    const sub = client.subscribe(`/topic/presence/${userId}`, (frame: IMessage) => {
      handler(JSON.parse(frame.body));
    });
    return () => sub.unsubscribe();
  },

  // Send a chat message → /app/chat/rooms/{roomId}/send
  sendMessage(roomId: number, payload: { messageType?: string; message?: string; replyToMessageId?: number }): void {
    if (client?.connected) client.publish({ destination: `/app/chat/rooms/${roomId}/send`, body: JSON.stringify(payload) });
  },

  // Send typing indicator → /app/chat/rooms/{roomId}/typing
  sendTyping(roomId: number, typing: boolean): void {
    if (client?.connected) client.publish({ destination: `/app/chat/rooms/${roomId}/typing`, body: JSON.stringify({ typing }) });
  },

  // Mark room as read → /app/chat/rooms/{roomId}/read
  markRead(roomId: number): void {
    if (client?.connected) client.publish({ destination: `/app/chat/rooms/${roomId}/read`, body: '{}' });
  },
};
