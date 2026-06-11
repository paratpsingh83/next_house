'use client';
import Link from 'next/link';
import { Search, Bell, UserPlus } from 'lucide-react';
import { useAppSelector } from '@/store';

interface Props {
  followReqCount: number;
  onMenuToggle: () => void;
}

export default function AppHeader({ followReqCount, onMenuToggle }: Props) {
  const { user }    = useAppSelector(s => s.auth);
  const notifUnread = useAppSelector(s => s.notif.unread);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-100 px-4 h-14 flex items-center justify-between">
      <Link href="/feed" className="flex items-center gap-2 no-tap">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-500 to-teal-500 flex items-center justify-center shadow-sm">
          <span className="text-white text-sm font-black">N</span>
        </div>
        <span className="font-black text-gray-900 text-base tracking-tight">
          Next<span className="text-primary-500">House</span>
        </span>
      </Link>

      <div className="flex items-center gap-0.5">
        <Link href="/search" className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 transition no-tap">
          <Search size={20}/>
        </Link>
        <Link href="/settings/follow-requests" className="relative p-2 rounded-xl text-gray-500 hover:bg-gray-100 transition no-tap">
          <UserPlus size={20}/>
          {followReqCount > 0 && (
            <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-primary-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5 animate-pop-in">
              {followReqCount > 9 ? '9+' : followReqCount}
            </span>
          )}
        </Link>
        <Link href="/notifications" className="relative p-2 rounded-xl text-gray-500 hover:bg-gray-100 transition no-tap">
          <Bell size={20}/>
          {notifUnread > 0 && (
            <span className="absolute top-1 right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 animate-pop-in">
              {notifUnread > 99 ? '99+' : notifUnread}
            </span>
          )}
        </Link>

        <button
          onClick={onMenuToggle}
          className="ml-1 w-8 h-8 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0 border-2 border-gray-200 transition hover:border-primary-300 no-tap"
        >
          {user?.profileImage
            ? <img src={user.profileImage} className="w-full h-full object-cover" alt=""/>
            : <span className="text-primary-600 font-bold text-sm">{user?.name?.[0]}</span>
          }
        </button>
      </div>
    </header>
  );
}