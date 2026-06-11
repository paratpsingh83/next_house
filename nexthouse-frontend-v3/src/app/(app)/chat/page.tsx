'use client';
import { useQuery } from '@tanstack/react-query';
import { Loader2, MessageCircle, Users } from 'lucide-react';
import { chatApi } from '@/api';
import { useAppSelector } from '@/store';
import ChatRoomRow from '@/components/chat/ChatRoomRow';
import Link from 'next/link';

export default function ChatPage() {
  const { data, isLoading } = useQuery({ queryKey: ['chat', 'inbox'], queryFn: () => chatApi.inbox() });
  const rooms = data?.content ?? [];
  const me    = useAppSelector(s => s.auth.user);

  return (
    <div className="px-4 py-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-900">Messages</h1>
        <Link
          href="/chat/new-group"
          className="flex items-center gap-1.5 text-sm font-semibold text-primary-600 hover:text-primary-700 transition"
        >
          <Users size={16}/>
          New Group
        </Link>
      </div>

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
