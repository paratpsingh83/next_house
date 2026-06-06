'use client';
import { useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Loader2, CalendarDays, PlusCircle } from 'lucide-react';
import { activitiesApi } from '@/api';
import type { ActivityType } from '@/types';
import Link from 'next/link';
import ActivityCard, { TYPE_EMOJI } from '@/components/activity/ActivityCard';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { useGeoLocation } from '@/hooks/useGeoLocation';

const FILTERS = ['ALL', 'SOCIAL', 'SPORTS', 'LEARNING', 'FOOD', 'ARTS', 'OUTDOOR', 'OTHER'] as const;

type Tab = 'nearby' | 'mine';

export default function ActivitiesPage() {
  const loc = useGeoLocation();
  const [tab,        setTab]        = useState<Tab>('nearby');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  const nearbyQ = useInfiniteQuery({
    queryKey: ['activities', 'nearby', loc, typeFilter],
    queryFn: ({ pageParam = 0 }) =>
      activitiesApi.nearby(loc.lat, loc.lon, 10000, typeFilter === 'ALL' ? undefined : typeFilter as ActivityType, pageParam),
    getNextPageParam: l => l.hasNext ? l.page + 1 : undefined,
    initialPageParam: 0,
    enabled: tab === 'nearby',
  });

  const mineQ = useInfiniteQuery({
    queryKey: ['activities', 'my-joined'],
    queryFn: ({ pageParam = 0 }) => activitiesApi.myJoined(pageParam),
    getNextPageParam: l => l.hasNext ? l.page + 1 : undefined,
    initialPageParam: 0,
    enabled: tab === 'mine',
  });

  const active = tab === 'nearby' ? nearbyQ : mineQ;
  const items  = active.data?.pages.flatMap(p => p.content) ?? [];

  const { ref } = useInfiniteScroll(active.fetchNextPage, active.hasNextPage, active.isFetchingNextPage);

  return (
    <div className="pb-4">
      <div className="px-4 pt-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Activities</h1>
        <Link href="/activities/create" className="btn-primary text-xs px-3 py-2 gap-1.5">
          <PlusCircle size={14}/>Create
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mx-4 mt-4 bg-white rounded-xl border border-gray-100 p-1">
        {(['nearby', 'mine'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition ${tab === t ? 'bg-primary-500 text-white' : 'text-gray-500 hover:text-gray-700'}`}>
            {t === 'nearby' ? '📍 Nearby' : '✅ Joined'}
          </button>
        ))}
      </div>

      {/* Type filter */}
      {tab === 'nearby' && (
        <div className="overflow-x-auto scrollbar-hide px-4 mt-3">
          <div className="flex gap-2 w-max">
            {FILTERS.map(f => (
              <button key={f} onClick={() => setTypeFilter(f)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border transition flex-shrink-0 ${
                  typeFilter === f ? 'bg-primary-500 text-white border-primary-500' : 'border-gray-200 text-gray-600 bg-white hover:border-primary-300'
                }`}>
                <span>{TYPE_EMOJI[f]}</span>{f}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="px-4 mt-4 space-y-3">
        {active.isLoading && (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary-500" size={28}/></div>
        )}
        {active.isError && !active.isLoading && (
          <div className="card p-6 text-center">
            <p className="text-sm font-semibold text-red-500 mb-2">Failed to load activities</p>
            <button onClick={() => active.refetch()} className="text-xs text-primary-600 font-medium underline">Try again</button>
          </div>
        )}
        {!active.isLoading && !active.isError && items.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <CalendarDays size={40} className="mx-auto mb-3 opacity-30"/>
            <p className="font-medium">{tab === 'nearby' ? 'No activities nearby' : "You haven't joined any activities"}</p>
            <Link href="/activities/create" className="btn-primary inline-flex mt-4 text-sm">Create one!</Link>
          </div>
        )}

        {items.map(a => <ActivityCard key={a.id} activity={a}/>)}

        <div ref={ref} className="h-4"/>
        {active.isFetchingNextPage && (
          <div className="flex justify-center py-4"><Loader2 className="animate-spin text-primary-400" size={22}/></div>
        )}
      </div>
    </div>
  );
}