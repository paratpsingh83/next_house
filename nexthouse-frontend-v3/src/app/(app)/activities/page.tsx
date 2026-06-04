'use client';
// src/app/(app)/activities/page.tsx
import { useState, useEffect } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useInView } from 'react-intersection-observer';
import { Loader2, MapPin, CalendarDays, PlusCircle, Users } from 'lucide-react';
import { activitiesApi } from '@/api';
import type { ActivityType } from '@/types';
import { format } from 'date-fns';
import Link from 'next/link';

const TYPE_EMOJI: Record<string, string> = {
  SOCIAL:'🎉', SPORTS:'⚽', LEARNING:'📚', VOLUNTEERING:'🤝',
  FOOD:'🍜', ARTS:'🎨', OUTDOOR:'🌿', NEIGHBORHOOD_WATCH:'👀', OTHER:'📌', ALL:'🗂️',
};
const FILTERS = ['ALL','SOCIAL','SPORTS','LEARNING','FOOD','ARTS','OUTDOOR','OTHER'] as const;

type Tab = 'nearby' | 'mine';

export default function ActivitiesPage() {
  const [loc, setLoc] = useState({ lat: 3.139, lon: 101.6869 });
  const [tab, setTab] = useState<Tab>('nearby');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      p => setLoc({ lat: p.coords.latitude, lon: p.coords.longitude })
    );
  }, []);

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

  const { ref, inView } = useInView({ threshold: 0.1 });
  useEffect(() => {
    if (inView && active.hasNextPage && !active.isFetchingNextPage) active.fetchNextPage();
  }, [inView, active.hasNextPage, active.isFetchingNextPage]);

  const STATUS_COLOR: Record<string, string> = {
    PUBLISHED:'bg-green-50 text-green-600', FULL:'bg-orange-50 text-orange-600',
    CANCELLED:'bg-red-50 text-red-600', COMPLETED:'bg-gray-100 text-gray-500',
  };

  return (
    <div className="pb-4">
      {/* Header */}
      <div className="px-4 pt-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Activities</h1>
        <Link href="/activities/create" className="btn-primary text-xs px-3 py-2 gap-1.5">
          <PlusCircle size={14}/>Create
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mx-4 mt-4 bg-white rounded-xl border border-gray-100 p-1">
        {(['nearby','mine'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition ${tab===t?'bg-primary-500 text-white':'text-gray-500 hover:text-gray-700'}`}>
            {t === 'nearby' ? '📍 Nearby' : '✅ Joined'}
          </button>
        ))}
      </div>

      {/* Type filter (only for nearby) */}
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

      {/* List */}
      <div className="px-4 mt-4 space-y-3">
        {active.isLoading && (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary-500" size={28}/></div>
        )}
        {!active.isLoading && items.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <CalendarDays size={40} className="mx-auto mb-3 opacity-30"/>
            <p className="font-medium">{tab === 'nearby' ? 'No activities nearby' : "You haven't joined any activities"}</p>
            <Link href="/activities/create" className="btn-primary inline-flex mt-4 text-sm">Create one!</Link>
          </div>
        )}

        {items.map(a => (
          <Link key={a.id} href={`/activities/${a.id}`}>
            <div className="card p-4 hover:shadow-md transition space-y-3">
              {/* Top row */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{TYPE_EMOJI[a.activityType] ?? '📌'}</span>
                    <span className="badge bg-primary-50 text-primary-600 text-xs">{a.activityType}</span>
                    {a.status !== 'PUBLISHED' && (
                      <span className={`badge text-xs ${STATUS_COLOR[a.status] ?? 'bg-gray-100 text-gray-500'}`}>{a.status}</span>
                    )}
                  </div>
                  <h3 className="font-bold text-gray-900 leading-snug">{a.title}</h3>
                </div>
                <div className={`badge text-xs flex-shrink-0 ${
                  a.myJoinStatus === 'APPROVED' ? 'bg-green-50 text-green-600' :
                  a.myJoinStatus === 'PENDING'  ? 'bg-yellow-50 text-yellow-600' :
                  a.isHost ? 'bg-yellow-50 text-yellow-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  {a.isHost ? '👑 Host' : a.myJoinStatus === 'NONE' ? 'Open' : a.myJoinStatus}
                </div>
              </div>

              {/* Details */}
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                <span className="flex items-center gap-1"><CalendarDays size={11}/>{format(new Date(a.activityTime),'MMM d, h:mm a')}</span>
                {a.address && <span className="flex items-center gap-1"><MapPin size={11}/>{a.address}</span>}
                <span className="flex items-center gap-1">
                  <Users size={11}/>
                  {a.currentMemberCount}{a.maxMembers ? `/${a.maxMembers}` : ''} people
                </span>
              </div>

              {/* Host */}
              <div className="flex items-center gap-2 pt-1 border-t border-gray-50">
                <div className="w-5 h-5 rounded-full bg-primary-100 overflow-hidden flex items-center justify-center flex-shrink-0">
                  {a.hostUser.profileImage
                    ? <img src={a.hostUser.profileImage} className="w-full h-full object-cover" alt=""/>
                    : <span className="text-primary-600 font-bold text-[9px]">{a.hostUser.name[0]}</span>
                  }
                </div>
                <span className="text-xs text-gray-400">by <span className="font-medium text-gray-600">{a.hostUser.name}</span></span>
              </div>
            </div>
          </Link>
        ))}

        <div ref={ref} className="h-4"/>
        {active.isFetchingNextPage && (
          <div className="flex justify-center py-4"><Loader2 className="animate-spin text-primary-400" size={22}/></div>
        )}
      </div>
    </div>
  );
}
