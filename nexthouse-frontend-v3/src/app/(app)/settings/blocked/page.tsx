'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, UserX, Loader2, ShieldOff } from 'lucide-react';
import { usersApi } from '@/api';
import type { UserSummaryDTO } from '@/types';
import toast from 'react-hot-toast';

export default function BlockedUsersPage() {
  const router = useRouter();
  const qc     = useQueryClient();
  const [unblocking, setUnblocking] = useState<number | null>(null);

  const { data: blocked = [], isLoading } = useQuery<UserSummaryDTO[]>({
    queryKey: ['blocked-users'],
    queryFn:  usersApi.getBlockedUsers,
  });

  const handleUnblock = async (userId: number, name: string) => {
    setUnblocking(userId);
    try {
      await usersApi.unblock(userId);
      qc.setQueryData<UserSummaryDTO[]>(['blocked-users'], prev =>
        (prev ?? []).filter(u => u.id !== userId)
      );
      toast.success(`${name} unblocked`);
    } catch {
      toast.error('Failed to unblock');
    } finally {
      setUnblocking(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <div className="flex items-center gap-3 px-4 h-14 bg-white border-b border-gray-100 sticky top-0 z-10">
        <button onClick={() => router.back()} className="p-1.5 rounded-xl text-gray-500 hover:bg-gray-100">
          <ArrowLeft size={20}/>
        </button>
        <p className="font-bold text-gray-900">Blocked Users</p>
      </div>

      <div className="px-4 py-4">

        {isLoading && (
          <div className="flex justify-center py-16">
            <Loader2 className="animate-spin text-primary-500" size={28}/>
          </div>
        )}

        {!isLoading && blocked.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <ShieldOff size={48} className="mb-3 opacity-30"/>
            <p className="font-medium text-gray-500">No blocked users</p>
            <p className="text-sm mt-1">Users you block will appear here</p>
          </div>
        )}

        {!isLoading && blocked.length > 0 && (
          <>
            <p className="text-xs text-gray-400 mb-3">
              {blocked.length} blocked {blocked.length === 1 ? 'user' : 'users'} — they cannot follow you, message you, or see your posts
            </p>
            <div className="space-y-2">
              {blocked.map(user => (
                <div key={user.id} className="card p-3 flex items-center gap-3">
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden flex-shrink-0 flex items-center justify-center">
                    {user.profileImage
                      ? <img src={user.profileImage} alt={user.name} className="w-full h-full object-cover"/>
                      : <span className="text-gray-500 font-bold text-base">{user.name[0].toUpperCase()}</span>
                    }
                  </div>

                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-900 truncate">{user.name}</p>
                    <p className="text-xs text-gray-400 truncate">@{user.username}</p>
                  </div>

                  {/* Unblock button */}
                  <button
                    onClick={() => handleUnblock(user.id, user.name)}
                    disabled={unblocking === user.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition disabled:opacity-50 flex-shrink-0"
                  >
                    {unblocking === user.id
                      ? <Loader2 size={14} className="animate-spin"/>
                      : <UserX size={14}/>
                    }
                    Unblock
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
