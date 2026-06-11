'use client';
import { useState } from 'react';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/api';
import { Loader2, Ban, CheckCircle, Trash2, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import type { UserResponse } from '@/types';

export default function AdminUsersPage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [bannedFilter, setBannedFilter] = useState<boolean | undefined>(undefined);

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['admin', 'users', statusFilter, bannedFilter],
    queryFn:  ({ pageParam = 0 }) => adminApi.getUsers(statusFilter || undefined, bannedFilter, pageParam),
    getNextPageParam: l => l.hasNext ? l.page + 1 : undefined,
    initialPageParam: 0,
  });

  const banMut = useMutation({
    mutationFn: (userId: number) => adminApi.banUser(userId),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['admin', 'users'] }); toast.success('User banned'); },
    onError:    () => toast.error('Failed'),
  });

  const unbanMut = useMutation({
    mutationFn: (userId: number) => adminApi.unbanUser(userId),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['admin', 'users'] }); toast.success('User unbanned'); },
    onError:    () => toast.error('Failed'),
  });

  const deleteMut = useMutation({
    mutationFn: (userId: number) => adminApi.deleteUser(userId),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['admin', 'users'] }); toast.success('Account deleted'); },
    onError:    () => toast.error('Failed'),
  });

  const users = data?.pages.flatMap(p => p.content) ?? [];
  const { ref } = useInfiniteScroll(fetchNextPage, hasNextPage, isFetchingNextPage);

  const confirmDelete = (u: UserResponse) => {
    if (confirm(`Delete ${u.name}'s account permanently? This cannot be undone.`)) {
      deleteMut.mutate(u.id);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Users</h1>
        <span className="text-sm text-gray-400">{data?.pages[0]?.totalElements ?? 0} total</span>
      </div>

      {/* Filters */}
      <div className="card p-3 flex flex-wrap gap-2">
        {[
          { label: 'All',    val: undefined },
          { label: 'Banned', val: true     },
          { label: 'Active', val: false    },
        ].map(({ label, val }) => (
          <button
            key={label}
            onClick={() => setBannedFilter(val)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
              bannedFilter === val ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200 text-gray-600'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Users list */}
      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-primary-500" size={28}/></div>
      ) : users.length === 0 ? (
        <div className="text-center py-12 text-gray-400">No users found</div>
      ) : (
        <div className="space-y-2">
          {users.map((u: UserResponse) => (
            <div key={u.id} className="card p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary-100 overflow-hidden flex items-center justify-center flex-shrink-0">
                {u.profileImage
                  ? <img src={u.profileImage} className="w-full h-full object-cover" alt=""/>
                  : <span className="font-bold text-primary-700">{u.name[0]}</span>
                }
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-gray-900 text-sm">{u.name}</span>
                  <span className="text-xs text-gray-400">@{u.username}</span>
                  <span className={`badge text-xs ${u.accountStatus === 'ACTIVE' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                    {u.accountStatus}
                  </span>
                  {u.addressVerified && <span className="badge bg-blue-50 text-blue-600 text-xs">✓ Verified</span>}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">Trust score: {u.trustScore} · Joined {new Date(u.createdAt).toLocaleDateString()}</p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                {u.accountStatus !== 'BANNED' ? (
                  <button
                    onClick={() => banMut.mutate(u.id)}
                    disabled={banMut.isPending}
                    title="Ban user"
                    className="p-2 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition"
                  >
                    <Ban size={14}/>
                  </button>
                ) : (
                  <button
                    onClick={() => unbanMut.mutate(u.id)}
                    disabled={unbanMut.isPending}
                    title="Unban user"
                    className="p-2 rounded-lg border border-green-200 text-green-600 hover:bg-green-50 transition"
                  >
                    <CheckCircle size={14}/>
                  </button>
                )}
                <button
                  onClick={() => confirmDelete(u)}
                  disabled={deleteMut.isPending}
                  title="Delete account"
                  className="p-2 rounded-lg border border-gray-200 text-gray-400 hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition"
                >
                  <Trash2 size={14}/>
                </button>
              </div>
            </div>
          ))}
          <div ref={ref} className="h-4"/>
          {isFetchingNextPage && <div className="flex justify-center py-4"><Loader2 className="animate-spin text-primary-400" size={22}/></div>}
        </div>
      )}
    </div>
  );
}