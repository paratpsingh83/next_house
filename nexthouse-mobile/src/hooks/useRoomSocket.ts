import { useEffect, useRef } from 'react';
import { addSub, removeSub } from '@/lib/stompClient';
import type { ChatMessageResponse } from '@/types';

export function useRoomSocket(
  roomId: string | number | undefined,
  onMessage: (msg: ChatMessageResponse) => void
) {
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    if (!roomId) return;

    const id = `room-socket-${roomId}`;

    addSub(id, `/topic/rooms/${roomId}/messages`, body => {
      try {
        onMessageRef.current(JSON.parse(body) as ChatMessageResponse);
      } catch {}
    });

    return () => removeSub(id);
  }, [String(roomId)]);
}