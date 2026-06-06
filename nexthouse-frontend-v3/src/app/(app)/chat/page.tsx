'use client';
import { useQuery } from '@tanstack/react-query';
import { Loader2, MessageCircle } from 'lucide-react';
import { chatApi } from '@/api';
import { useAppSelector } from '@/store';
import ChatRoomRow from '@/components/chat/ChatRoomRow';

export default function ChatPage() {
  const { data, isLoading } = useQuery({ queryKey: ['chat', 'inbox'], queryFn: () => chatApi.inbox() });
  const rooms = data?.content ?? [];
  const me    = useAppSelector(s => s.auth.user);

  return (
    <div className="px-4 py-4">
      <h1 className="text-xl font-bold text-gray-900 mb-4">Messages</h1>

      {isLoading && (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin text-primary-500" size={28}/>
        </div>
      )}

      {!isLoading && rooms.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <MessageCircle size={40} className="mx-auto mb-3 opacity-30"/>
          <p>No conversations yet</p>
        </div>
      )}

      <div className="space-y-1">
        {rooms.map(room => (
          <ChatRoomRow key={room.id} room={room} currentUserId={me?.id}/>
        ))}
      </div>
    </div>
  );
}