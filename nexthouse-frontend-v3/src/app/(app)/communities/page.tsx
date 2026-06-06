'use client';
import { useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Loader2, Users, Search } from 'lucide-react';
import { communitiesApi } from '@/api';
import Link from 'next/link';
import toast from 'react-hot-toast';
import CommunityCard from '@/components/community/CommunityCard';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { useGeoLocation } from '@/hooks/useGeoLocation';

export default function CommunitiesPage() {
  const loc = useGeoLocation();
  const [tab, setTab] = useState<'mine' | 'discover'>('mine');
  const [q,   setQ]   = useState('');

  const mine = useInfiniteQuery({
    queryKey: ['communities', 'mine'],
    queryFn:  ({ pageParam = 0 }) => communitiesApi.mine(pageParam),
    getNextPageParam: l => l.hasNext ? l.page + 1 : undefined,
    initialPageParam: 0,
    enabled: tab === 'mine',
  });

  const discover = useInfiniteQuery({
    queryKey: ['communities', 'search', q, loc.lat, loc.lon],
    queryFn:  ({ pageParam = 0 }) =>
      q.length > 1
        ? communitiesApi.search(q, pageParam)
        : communitiesApi.nearby(loc.lat, loc.lon, 10000, pageParam),
    getNextPageParam: l => l.hasNext ? l.page + 1 : undefined,
    initialPageParam: 0,
    enabled: tab === 'discover',
  });

  const active = tab === 'mine' ? mine : discover;
  const items  = active.data?.pages.flatMap(p => p.content) ?? [];

  const { ref } = useInfiniteScroll(active.fetchNextPage, active.hasNextPage, active.isFetchingNextPage);

  const join = async (id: number, e: React.MouseEvent) => {
    e.preventDefault();
    try {
      await communitiesApi.join(id);
      toast.success('Join request sent!');
      mine.refetch();
      discover.refetch();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed');
    }
  };

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="flex gap-2">
        {(['mine', 'discover'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition ${
              tab === t ? 'bg-primary-500 text-white' : 'bg-white border border-gray-200 text-gray-600'
            }`}>
            {t === 'mine' ? 'My Groups' : 'Discover'}
          </button>
        ))}
      </div>

      {tab === 'discover' && (
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search communities..." className="input pl-9 text-sm"/>
        </div>
      )}

      {active.isLoading && (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary-500" size={28}/></div>
      )}
      {active.isError && !active.isLoading && (
        <div className="card p-6 text-center">
          <p className="text-sm font-semibold text-red-500 mb-2">Failed to load communities</p>
          <button onClick={() => active.refetch()} className="text-xs text-primary-600 font-medium underline">Try again</button>
        </div>
      )}
      {!active.isLoading && !active.isError && items.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <Users size={40} className="mx-auto mb-3 opacity-30"/>
          <p>{tab === 'mine' ? "You haven't joined any groups yet" : 'No communities found'}</p>
        </div>
      )}

      <div className="space-y-3">
        {items.map(c => <CommunityCard key={c.id} community={c} onJoin={join}/>)}
      </div>

      <div ref={ref} className="h-4"/>
      {active.isFetchingNextPage && (
        <div className="flex justify-center py-4"><Loader2 className="animate-spin text-primary-400" size={22}/></div>
      )}
    </div>
  );
}