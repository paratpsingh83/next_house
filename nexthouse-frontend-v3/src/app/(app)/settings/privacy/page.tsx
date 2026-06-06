'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ChevronLeft, Lock, Globe, Shield, UserX,
  Loader2, AlertCircle,
} from 'lucide-react';
import { usersApi } from '@/api';
import { useAppSelector, useAppDispatch } from '@/store';
import { setUser } from '@/store/slices/authSlice';
import toast from 'react-hot-toast';

export default function PrivacySettingsPage() {
  const router   = useRouter();
  const dispatch = useAppDispatch();
  const qc       = useQueryClient();
  const me       = useAppSelector(s => s.auth.user);

  const [isPrivate, setIsPrivate] = useState<boolean>(me?.isPrivate ?? false);
  const [unblocking, setUnblocking] = useState<number | null>(null);

  // Fetch blocked users
  const { data: blockedUsers = [], isLoading: loadingBlocked } = useQuery({
    queryKey: ['blocked-users'],
    queryFn:  () => usersApi.getBlockedUsers(),
  });

  // Toggle private account
  const privacyMutation = useMutation({
    mutationFn: (val: boolean) => usersApi.updatePrivacy(val),
    onSuccess: (updatedUser) => {
      const val = updatedUser.isPrivate ?? false;
      setIsPrivate(val);
      dispatch(setUser(updatedUser));
      toast.success(val ? 'Account set to private' : 'Account set to public');
    },
    onError: () => toast.error('Failed to update privacy'),
  });

  const handlePrivacyToggle = () => {
    const next = !isPrivate;
    privacyMutation.mutate(next);
  };

  // Unblock a user
  const handleUnblock = async (userId: number, name: string) => {
    setUnblocking(userId);
    try {
      await usersApi.unblock(userId);
      qc.invalidateQueries({ queryKey: ['blocked-users'] });
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
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 h-14 flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 -ml-2 rounded-xl hover:bg-gray-100 transition">
          <ChevronLeft size={22} className="text-gray-700"/>
        </button>
        <h1 className="text-lg font-bold text-gray-900">Privacy</h1>
      </div>

      <div className="px-4 py-5 space-y-5">

        {/* Account Privacy */}
        <div>
          <p className="section-title">Account visibility</p>
          <div className="card overflow-hidden">
            <button
              onClick={handlePrivacyToggle}
              disabled={privacyMutation.isPending}
              className="w-full flex items-center gap-3 px-4 py-4 hover:bg-gray-50 transition text-left"
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                isPrivate ? 'bg-amber-100' : 'bg-primary-100'
              }`}>
                {isPrivate
                  ? <Lock size={18} className="text-amber-600"/>
                  : <Globe size={18} className="text-primary-600"/>
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800">
                  {isPrivate ? 'Private account' : 'Public account'}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {isPrivate
                    ? 'Only approved followers can see your posts and activities'
                    : 'Anyone on NexHouse can see your posts and activities'}
                </p>
              </div>
              {privacyMutation.isPending
                ? <Loader2 size={18} className="animate-spin text-gray-400 flex-shrink-0"/>
                : (
                  <div className={`relative w-12 h-6 rounded-full transition-colors duration-200 flex-shrink-0 ${
                    isPrivate ? 'bg-amber-500' : 'bg-gray-200'
                  }`}>
                    <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                      isPrivate ? 'translate-x-6' : 'translate-x-0.5'
                    }`}/>
                  </div>
                )
              }
            </button>
          </div>

          {isPrivate && (
            <div className="mt-2 flex items-start gap-2 px-1">
              <AlertCircle size={14} className="text-amber-500 flex-shrink-0 mt-0.5"/>
              <p className="text-xs text-gray-500">
                When private, new followers must send a request. Your existing followers are not affected.
              </p>
            </div>
          )}
        </div>

        {/* Blocked Users */}
        <div>
          <p className="section-title">Blocked accounts ({blockedUsers.length})</p>
          <div className="card overflow-hidden">
            {loadingBlocked ? (
              <div className="flex justify-center py-8">
                <Loader2 className="animate-spin text-primary-500" size={24}/>
              </div>
            ) : blockedUsers.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10">
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                  <Shield size={22} className="text-gray-400"/>
                </div>
                <p className="text-sm text-gray-500 font-medium">No blocked accounts</p>
                <p className="text-xs text-gray-400">Users you block won&apos;t be able to interact with you</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {blockedUsers.map(user => (
                  <div key={user.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center flex-shrink-0">
                      {user.profileImage
                        ? <img src={user.profileImage} className="w-full h-full object-cover" alt=""/>
                        : <span className="text-gray-500 font-semibold text-sm">{user.name?.[0]}</span>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{user.name}</p>
                      <p className="text-xs text-gray-400">@{user.username}</p>
                    </div>
                    <button
                      onClick={() => handleUnblock(user.id, user.name)}
                      disabled={unblocking === user.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:border-red-300 hover:text-red-500 hover:bg-red-50 transition disabled:opacity-50"
                    >
                      {unblocking === user.id
                        ? <Loader2 size={12} className="animate-spin"/>
                        : <UserX size={13}/>
                      }
                      Unblock
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Safety note */}
        <p className="text-xs text-gray-400 text-center pb-4">
          Blocked users cannot follow you, see your posts, or message you.
        </p>
      </div>
    </div>
  );
}