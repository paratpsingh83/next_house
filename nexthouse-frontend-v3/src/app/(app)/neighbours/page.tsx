'use client';
import { useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Loader2, Users } from 'lucide-react';
import { usersApi, chatApi } from '@/api';
import { useAppSelector } from '@/store';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import UserCard, { type FollowState } from '@/components/profile/UserCard';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { useGeoLocation } from '@/hooks/useGeoLocation';

const RADII = [{ v: 1000, l: '1 km' }, { v: 3000, l: '3 km' }, { v: 5000, l: '5 km' }, { v: 10000, l: '10 km' }];

type Tab = 'nearby' | 'suggestions';

export default function NeighboursPage() {
  const router = useRouter();
  const me     = useAppSelector(s => s.auth.user);
  const loc    = useGeoLocation(({ lat, lon }) => {
    usersApi.updateLocation({ latitude: lat, longitude: lon }).catch(() => {});
  });

  const [tab,    setTab]    = useState<Tab>('nearby');
  const [radius, setRadius] = useState(5000);
  const [followStates,     setFollowStates]     = useState<Record<number, FollowState>>({});
  const [confirmUnfollowId, setConfirmUnfollowId] = useState<number | null>(null);

  const nearbyQ = useInfiniteQuery({
    queryKey: ['users', 'nearby', loc, radius],
    queryFn:  ({ pageParam = 0 }) => usersApi.getNearby(loc.lat, loc.lon, radius, pageParam),
    getNextPageParam: (l: any) => l.hasNext ? l.page + 1 : undefined,
    initialPageParam: 0,
    enabled: tab === 'nearby',
  });

  const suggestQ = useInfiniteQuery({
    queryKey: ['users', 'suggestions'],
    queryFn:  ({ pageParam = 0 }) => usersApi.getSuggestions(pageParam),
    getNextPageParam: (l: any) => l.hasNext ? l.page + 1 : undefined,
    initialPageParam: 0,
    enabled: tab === 'suggestions',
  });

  const active   = tab === 'nearby' ? nearbyQ : suggestQ;
  const rawItems = active.data?.pages.flatMap((p: any) => p.content) ?? [];
  const items    = rawItems.map((item: any) => item.user ?? item);

  const { ref } = useInfiniteScroll(active.fetchNextPage, active.hasNextPage, active.isFetchingNextPage);

  function getFollowState(u: any): FollowState {
    if (followStates[u.id] !== undefined) return followStates[u.id];
    if (u.isFollowing) return 'following';
    if (u.isRequested) return 'requested';
    return 'none';
  }

  const handleFollowClick = async (u: any) => {
    const state = getFollowState(u);
    if (state === 'following') { setConfirmUnfollowId(u.id); return; }
    if (state === 'requested') { toast('Follow request already sent', { icon: '⏳' }); return; }
    setFollowStates(prev => ({ ...prev, [u.id]: 'following' }));
    try {
      const status = await usersApi.follow(u.id);
      setFollowStates(prev => ({ ...prev, [u.id]: status === 'REQUESTED' ? 'requested' : 'following' }));
      if (status === 'REQUESTED') toast('Follow request sent', { icon: '⏳' });
      else toast.success('Following!');
    } catch (e: any) {
      setFollowStates(prev => ({ ...prev, [u.id]: state }));
      toast.error(e?.response?.data?.message ?? 'Failed');
    }
  };

  const confirmUnfollow = async () => {
    const id = confirmUnfollowId!;
    setConfirmUnfollowId(null);
    setFollowStates(prev => ({ ...prev, [id]: 'none' }));
    try { await usersApi.unfollow(id); }
    catch { setFollowStates(prev => ({ ...prev, [id]: 'following' })); toast.error('Failed to unfollow'); }
  };

  const openChat = async (userId: number) => {
    try { const r = await chatApi.directRoom(userId); router.push(`/chat/${r.id}`); }
    catch { toast.error('Failed to open chat'); }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="px-4 pt-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Neighbours</h1>
        <span className="text-xs text-gray-400">{items.length} found</span>
      </div>

      <div className="flex gap-1 mx-4 mt-3 bg-white rounded-xl border border-gray-100 p-1">
        {(['nearby', 'suggestions'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition ${tab === t ? 'bg-primary-500 text-white' : 'text-gray-500'}`}>
            {t === 'nearby' ? '📍 Nearby' : '💡 Suggestions'}
          </button>
        ))}
      </div>

      {tab === 'nearby' && (
        <div className="flex gap-2 px-4 mt-3 overflow-x-auto scrollbar-hide">
          {RADII.map(({ v, l }) => (
            <button key={v} onClick={() => setRadius(v)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border flex-shrink-0 transition ${
                radius === v ? 'bg-primary-500 text-white border-primary-500' : 'border-gray-200 text-gray-600 bg-white'
              }`}>
              {l}
            </button>
          ))}
        </div>
      )}

      <div className="px-4 mt-4 space-y-2">
        {active.isLoading && (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary-500" size={28}/></div>
        )}
        {active.isError && !active.isLoading && (
          <div className="card p-6 text-center">
            <p className="text-sm font-semibold text-red-500 mb-2">Failed to load neighbours</p>
            <button onClick={() => active.refetch()} className="text-xs text-primary-600 font-medium underline">Try again</button>
          </div>
        )}
        {!active.isLoading && !active.isError && items.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <Users size={40} className="mx-auto mb-3 opacity-30"/>
            <p className="font-medium">{tab === 'nearby' ? 'No neighbours found nearby' : 'No suggestions yet'}</p>
            <p className="text-sm mt-1 text-gray-400">Try increasing the radius</p>
          </div>
        )}

        {items.map((u: any) => {
          if (u.id === me?.id) return null;
          return (
            <UserCard
              key={u.id}
              user={u}
              followState={getFollowState(u)}
              onFollow={() => handleFollowClick(u)}
              onChat={() => openChat(u.id)}
            />
          );
        })}

        <div ref={ref} className="h-4"/>
        {active.isFetchingNextPage && <div className="flex justify-center py-4"><Loader2 className="animate-spin text-primary-400" size={22}/></div>}
      </div>

      {/* Unfollow confirmation modal */}
      {confirmUnfollowId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-base font-bold text-gray-900 mb-2">Unfollow?</h3>
            <p className="text-sm text-gray-500 mb-5">Do you want to unfollow this person?</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmUnfollowId(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition">
                Cancel
              </button>
              <button onClick={confirmUnfollow}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition">
                Unfollow
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}