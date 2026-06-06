'use client';
import { UserPlus, UserCheck, MessageCircle, MapPin, Shield, Clock } from 'lucide-react';
import Link from 'next/link';

export type FollowState = 'none' | 'following' | 'requested';

interface UserCardUser {
  id: number;
  name: string;
  username: string;
  profileImage?: string;
  bio?: string;
  online?: boolean;
  addressVerified?: boolean;
  identityVerified?: boolean;
}

interface Props {
  user: UserCardUser;
  followState: FollowState;
  onFollow: () => void;
  onChat: () => void;
}

export default function UserCard({ user: u, followState, onFollow, onChat }: Props) {
  return (
    <div className="card p-4 flex items-center gap-3">
      <Link href={`/profile/${u.id}`} className="flex-shrink-0">
        <div className="w-12 h-12 rounded-full bg-primary-100 overflow-hidden flex items-center justify-center relative">
          {u.profileImage
            ? <img src={u.profileImage} className="w-full h-full object-cover" alt={u.name}/>
            : <span className="text-primary-600 font-bold text-lg">{u.name[0]}</span>
          }
          {u.online && (
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-white"/>
          )}
        </div>
      </Link>

      <Link href={`/profile/${u.id}`} className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="font-semibold text-sm text-gray-900 truncate">{u.name}</p>
          {u.addressVerified  && <MapPin  size={11} className="text-blue-500 flex-shrink-0"/>}
          {u.identityVerified && <Shield  size={11} className="text-green-500 flex-shrink-0"/>}
        </div>
        <p className="text-xs text-gray-400">@{u.username}</p>
        {u.bio && <p className="text-xs text-gray-500 mt-0.5 truncate">{u.bio}</p>}
      </Link>

      <div className="flex items-center gap-1.5 flex-shrink-0">
        <button
          onClick={onChat}
          className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-primary-50 hover:text-primary-600 transition"
        >
          <MessageCircle size={15}/>
        </button>
        <button
          onClick={onFollow}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
            followState === 'following'  ? 'bg-gray-100 text-gray-600'
            : followState === 'requested' ? 'bg-gray-100 text-gray-500'
            : 'bg-primary-500 text-white hover:bg-primary-600'
          }`}
        >
          {followState === 'following'  ? <><UserCheck size={13}/> Following</>
           : followState === 'requested' ? <><Clock    size={13}/> Requested</>
           : <><UserPlus size={13}/> Follow</>}
        </button>
      </div>
    </div>
  );
}