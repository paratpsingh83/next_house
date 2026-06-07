import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { addSub, removeSub } from '@/lib/stompClient';
import type { ChatRoomResponse } from '@/types';

export function useInboxSocket() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const id = 'inbox-socket';

    addSub(id, '/user/queue/chat-update', (body: string) => {
      let roomId: number | undefined;
      let preview: string | undefined;
      let senderName: string | undefined;
      let lastMessageAt: string | undefined;

      try {
        const payload = JSON.parse(body);
        roomId       = payload.roomId;
        preview      = payload.lastMessagePreview;
        senderName   = payload.lastMessageSenderName;
        lastMessageAt = payload.lastMessageAt;
      } catch {
        // old-format or malformed payload — still invalidate
      }

      // Optimistic update: apply preview + sender + unread bump immediately
      if (roomId !== undefined) {
        queryClient.setQueryData(['chat-inbox'], (old: any) => {
          if (!old?.content) return old;
          return {
            ...old,
            content: old.content.map((room: ChatRoomResponse) =>
              room.id === roomId
                ? {
                    ...room,
                    unreadCount:           (room.unreadCount ?? 0) + 1,
                    lastMessagePreview:    preview    ?? room.lastMessagePreview,
                    lastMessageSenderName: senderName ?? room.lastMessageSenderName,
                    lastMessageAt:         lastMessageAt ?? room.lastMessageAt,
                  }
                : room
            ),
          };
        });
      }

      // Always refetch for accurate server-side unread counts
      queryClient.invalidateQueries({ queryKey: ['chat-inbox'] });
    });

    return () => removeSub(id);
  }, []);
}