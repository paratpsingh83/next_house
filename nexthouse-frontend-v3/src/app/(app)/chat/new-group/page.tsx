'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ArrowLeft, Search, Check, Loader2, Users } from 'lucide-react';
import { userApi, chatApi } from '@/api';
import { useAppSelector } from '@/store';
import toast from 'react-hot-toast';
import type { UserSummaryDTO } from '@/types';

export default function NewGroupPage() {
  const router  = useRouter();
  const me      = useAppSelector(s => s.auth.user);
  const [query,     setQuery]     = useState('');
  const [selected,  setSelected]  = useState<UserSummaryDTO[]>([]);
  const [groupName, setGroupName] = useState('');
  const [step,      setStep]      = useState<'select' | 'name'>('select');

  const { data, isFetching } = useQuery({
    queryKey: ['user-search-group', query],
    queryFn:  () => userApi.search(query, 0, 30),
    enabled:  query.length >= 1,
  });

  const users = (data?.content ?? []).filter(u => u.id !== me?.id);

  const toggle = (user: UserSummaryDTO) => {
    setSelected(prev =>
      prev.find(u => u.id === user.id)
        ? prev.filter(u => u.id !== user.id)
        : [...prev, user]
    );
  };

  const { mutate: createGroup, isPending } = useMutation({
    mutationFn: () => chatApi.createGroup({
      roomType:  'GROUP',
      title:     groupName.trim() || selected.map(u => u.name.split(' ')[0]).join(', '),
      memberIds: selected.map(u => u.id),
    }),
    onSuccess: (room) => {
      toast.success('Group created!');
      router.replace(`/chat/${room.id}`);
    },
    onError: () => toast.error('Failed to create group'),
  });

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 h-14 flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 -ml-2 rounded-xl hover:bg-gray-100 transition">
          <ArrowLeft size={22} className="text-gray-700"/>
        </button>
        <h1 className="text-lg font-bold text-gray-900 flex-1">
          {step === 'select' ? 'Add Members' : 'Group Name'}
        </h1>
        {step === 'select' && selected.length >= 2 && (
          <button
            onClick={() => setStep('name')}
            className="text-sm font-semibold text-primary-600 hover:text-primary-700"
          >
            Next
          </button>
        )}
      </div>

      {step === 'select' ? (
        <>
          {/* Selected chips */}
          {selected.length > 0 && (
            <div className="flex gap-2 px-4 pt-3 pb-1 overflow-x-auto scrollbar-hide flex-shrink-0">
              {selected.map(u => (
                <button
                  key={u.id}
                  onClick={() => toggle(u)}
                  className="flex items-center gap-1.5 bg-primary-100 text-primary-700 text-xs font-semibold px-3 py-1.5 rounded-full flex-shrink-0"
                >
                  {u.name.split(' ')[0]}
                  <span className="text-primary-400">×</span>
                </button>
              ))}
            </div>
          )}

          {/* Search bar */}
          <div className="px-4 py-3">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search people…"
                className="input pl-9 w-full"
                autoFocus
              />
            </div>
          </div>

          {/* User list */}
          <div className="flex-1 overflow-y-auto px-4 space-y-1 pb-4">
            {isFetching && (
              <div className="flex justify-center py-6">
                <Loader2 size={24} className="animate-spin text-primary-400"/>
              </div>
            )}
            {!isFetching && query && users.length === 0 && (
              <p className="text-center text-gray-400 text-sm py-8">No users found</p>
            )}
            {!query && (
              <p className="text-center text-gray-400 text-sm py-8">Search for people to add</p>
            )}
            {users.map(user => {
              const isSelected = !!selected.find(u => u.id === user.id);
              return (
                <button
                  key={user.id}
                  onClick={() => toggle(user)}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-white transition text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-primary-100 overflow-hidden flex-shrink-0 flex items-center justify-center">
                    {user.profileImage
                      ? <img src={user.profileImage} className="w-full h-full object-cover" alt=""/>
                      : <span className="text-primary-600 font-bold">{user.name[0]}</span>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{user.name}</p>
                    <p className="text-xs text-gray-400">@{user.username}</p>
                  </div>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition ${
                    isSelected ? 'bg-primary-500 border-primary-500' : 'border-gray-300'
                  }`}>
                    {isSelected && <Check size={13} className="text-white"/>}
                  </div>
                </button>
              );
            })}
          </div>
        </>
      ) : (
        /* Step 2: Group name */
        <div className="flex-1 px-4 pt-6 space-y-6">
          <div className="flex flex-col items-center gap-3">
            <div className="w-20 h-20 rounded-full bg-primary-100 flex items-center justify-center">
              <Users size={36} className="text-primary-500"/>
            </div>
            <p className="text-sm text-gray-500">{selected.length} members</p>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Group name</label>
            <input
              value={groupName}
              onChange={e => setGroupName(e.target.value)}
              placeholder={selected.map(u => u.name.split(' ')[0]).join(', ')}
              className="input mt-2 w-full"
              maxLength={100}
              autoFocus
            />
            <p className="text-xs text-gray-400 mt-1">Leave blank to use member names</p>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep('select')} className="flex-1 btn-outline py-3">
              Back
            </button>
            <button
              onClick={() => createGroup()}
              disabled={isPending}
              className="flex-1 btn-primary py-3 gap-2"
            >
              {isPending ? <Loader2 size={16} className="animate-spin"/> : <Users size={16}/>}
              Create Group
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
