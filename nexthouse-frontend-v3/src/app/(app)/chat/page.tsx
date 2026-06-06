'use client';
import { useQuery } from '@tanstack/react-query';
import { Loader2, MessageCircle, Users } from 'lucide-react';
import { chatApi } from '@/api';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { useAppSelector } from '@/store';

export default function ChatPage() {
  const { data, isLoading } = useQuery({ queryKey:['chat','inbox'], queryFn:()=>chatApi.inbox() });
  const rooms = data?.content ?? [];
  const me = useAppSelector(s=>s.auth.user);
  return (
    <div>
      <div className="px-4 py-4">
        <h1 className="text-xl font-bold text-gray-900 mb-4">Messages</h1>
        {isLoading&&<div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary-500" size={28}/></div>}
        {!isLoading&&rooms.length===0&&<div className="text-center py-16 text-gray-400"><MessageCircle size={40} className="mx-auto mb-3 opacity-30"/><p>No conversations yet</p></div>}
        <div className="space-y-1">
          {rooms.map(room=>{
            const otherMember = room.roomType==='DIRECT' ? room.members?.find(m=>m.id!==me?.id) : null;
            const displayName = room.title ?? otherMember?.name ?? (room.roomType==='GROUP'?'Group Chat':'Chat');
            const displayAvatar = room.avatarUrl ?? otherMember?.profileImage ?? null;
            return (
            <Link key={room.id} href={`/chat/${room.id}`}>
              <div className="flex items-center gap-3 px-2 py-3 rounded-xl hover:bg-gray-100 transition">
                <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0 relative overflow-hidden">
                  {displayAvatar?<img src={displayAvatar} className="w-full h-full object-cover" alt=""/>:
                    room.roomType==='GROUP'?<Users size={22} className="text-primary-500"/>:<span className="text-primary-600 font-bold text-lg">{displayName[0].toUpperCase()}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between"><span className="font-semibold text-gray-900 truncate">{displayName}</span>
                    {room.lastMessageAt&&<span className="text-xs text-gray-400 flex-shrink-0 ml-2">{formatDistanceToNow(new Date(room.lastMessageAt),{addSuffix:true})}</span>}
                  </div>
                  <p className="text-sm text-gray-400 truncate">{room.lastMessagePreview??'No messages yet'}</p>
                </div>
                {(room.unreadCount??0)>0&&<span className="min-w-5 h-5 bg-primary-500 text-white text-xs rounded-full flex items-center justify-center px-1">{(room.unreadCount??0)>99?'99+':(room.unreadCount??0)>9?'9+':room.unreadCount}</span>}
              </div>
            </Link>
          );})}
        </div>
      </div>
    </div>
  );
}
