'use client';
import type { ChatRoomResponse } from '@/types';
import { Users } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

interface Props {
  room: ChatRoomResponse;
  currentUserId?: number;
}

export default function ChatRoomRow({ room, currentUserId }: Props) {
  const otherMember   = room.roomType === 'DIRECT' ? room.members?.find(m => m.id !== currentUserId) : null;
  const displayName   = room.title ?? otherMember?.name ?? (room.roomType === 'GROUP' ? 'Group Chat' : 'Chat');
  const displayAvatar = room.avatarUrl ?? otherMember?.profileImage ?? null;
  const unread        = room.unreadCount ?? 0;

  return (
    <Link href={`/chat/${room.id}`}>
      <div className="flex items-center gap-3 px-2 py-3 rounded-xl hover:bg-gray-100 transition">
        <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0 relative overflow-hidden">
          {displayAvatar
            ? <img src={displayAvatar} className="w-full h-full object-cover" alt=""/>
            : room.roomType === 'GROUP'
              ? <Users size={22} className="text-primary-500"/>
              : <span className="text-primary-600 font-bold text-lg">{displayName[0].toUpperCase()}</span>
          }
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-gray-900 truncate">{displayName}</span>
            {room.lastMessageAt && (
              <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                {formatDistanceToNow(new Date(room.lastMessageAt), { addSuffix: true })}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-400 truncate">{room.lastMessagePreview ?? 'No messages yet'}</p>
        </div>
        {unread > 0 && (
          <span className="min-w-5 h-5 bg-primary-500 text-white text-xs rounded-full flex items-center justify-center px-1">
            {unread > 99 ? '99+' : unread > 9 ? '9+' : unread}
          </span>
        )}
      </div>
    </Link>
  );
}