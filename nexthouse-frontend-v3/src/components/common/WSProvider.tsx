'use client';
// src/components/common/WSProvider.tsx
import { useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '@/store';
import { wsClient } from '@/lib/ws';
import { appendMessage, setTotalUnread } from '@/store/slices/chatSlice';
import { prepend, setUnread } from '@/store/slices/notifSlice';
import { setOnline, setOffline } from '@/store/slices/presenceSlice';
import { notificationsApi, chatApi } from '@/api';
import toast from 'react-hot-toast';

export default function WSProvider({ children }: { children: React.ReactNode }) {
  const dispatch  = useAppDispatch();
  const { isAuth, user } = useAppSelector(s => s.auth);
  const connected = useRef(false);
  const unsubs    = useRef<Array<() => void>>([]);

  useEffect(() => {
    if (!isAuth || !user) {
      if (connected.current) {
        wsClient.disconnect();
        connected.current = false;
        unsubs.current.forEach(fn => fn());
        unsubs.current = [];
      }
      return;
    }

    if (connected.current) return;

    wsClient.connect(
      () => {
        connected.current = true;

        // Subscribe to personal notifications
        const unsubNotif = wsClient.onNotification(notif => {
          dispatch(prepend(notif));
          if (notif.notificationType === 'SAFETY_ALERT') {
            toast(`🚨 ${notif.title}`, { duration: 8000, style: { background: '#dc2626', color: '#fff', borderRadius: '12px' } });
          }
        });

        // Subscribe to own presence
        const unsubPresence = wsClient.onPresence(user.id, ({ userId, online }) => {
          if (online) dispatch(setOnline(userId));
          else dispatch(setOffline(userId));
        });

        unsubs.current = [unsubNotif, unsubPresence];

        // Load initial unread counts
        notificationsApi.unreadCount().then(n => dispatch(setUnread(n))).catch(() => {});
        chatApi.totalUnread().then(n => dispatch(setTotalUnread(n))).catch(() => {});
      },
      () => { connected.current = false; }
    );

    return () => {
      unsubs.current.forEach(fn => fn());
      unsubs.current = [];
      wsClient.disconnect();
      connected.current = false;
    };
  }, [isAuth, user?.id]); // eslint-disable-line

  return <>{children}</>;
}
