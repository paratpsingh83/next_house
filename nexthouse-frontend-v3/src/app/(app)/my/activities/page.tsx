'use client';
import { useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Loader2, CalendarDays, MapPin, Users, PlusCircle, Crown, Zap } from 'lucide-react';
import { activitiesApi } from '@/api';
import { format, isPast } from 'date-fns';
import Link from 'next/link';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { TYPE_EMOJI, STATUS_COLOR } from '@/components/activity/ActivityCard';

type Tab = 'joined' | 'hosting';

export default function MyActivitiesPage() {
  const [tab, setTab] = useState<Tab>('joined');

  const joinedQ = useInfiniteQuery({
    queryKey: ['activities', 'joined'],
    queryFn:  ({ pageParam = 0 }) => activitiesApi.myJoined(pageParam),
    getNextPageParam: l => l.hasNext ? l.page + 1 : undefined,
    initialPageParam: 0,
    enabled: tab === 'joined',
  });

  const hostingQ = useInfiniteQuery({
    queryKey: ['activities', 'hosting'],
    queryFn:  ({ pageParam = 0 }) => activitiesApi.myHosting(pageParam),
    getNextPageParam: l => l.hasNext ? l.page + 1 : undefined,
    initialPageParam: 0,
    enabled: tab === 'hosting',
  });

  const active   = tab === 'joined' ? joinedQ : hostingQ;
  const items    = active.data?.pages.flatMap(p => p.content) ?? [];
  const upcoming = items.filter(a => !isPast(new Date(a.activityTime)));
  const past     = items.filter(a =>  isPast(new Date(a.activityTime)));

  const { ref } = useInfiniteScroll(active.fetchNextPage, active.hasNextPage, active.isFetchingNextPage);

  const ActivityRow = ({ a }: { a: any }) => (
    <Link href={`/activities/${a.id}`}>
      <div className="card p-4 hover:shadow-md transition space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-primary-50 flex items-center justify-center text-xl flex-shrink-0">
            {TYPE_EMOJI[a.activityType] ?? '📌'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-bold text-gray-900 text-sm leading-snug truncate">{a.title}</h3>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {a.isHost && <span className="badge bg-yellow-50 text-yellow-600 text-xs gap-0.5"><Crown size={9}/>Host</span>}
                <span className={`badge text-xs ${STATUS_COLOR[a.status] ?? 'bg-gray-100 text-gray-500'}`}>{a.status}</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <CalendarDays size={11}/>
                {format(new Date(a.activityTime), 'MMM d, h:mm a')}
              </span>
              {a.address && (
                <span className="flex items-center gap-1 truncate max-w-[140px]">
                  <MapPin size={11}/>{a.address}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Users size={11}/>{a.currentMemberCount}{a.maxMembers ? `/${a.maxMembers}` : ''}
              </span>
            </div>
          </div>
        </div>
        {tab === 'joined' && a.myJoinStatus && a.myJoinStatus !== 'NONE' && (
          <div className={`text-xs font-semibold px-2 py-1 rounded-lg w-fit ${
            a.myJoinStatus === 'APPROVED' ? 'bg-green-50 text-green-600' :
            a.myJoinStatus === 'PENDING'  ? 'bg-yellow-50 text-yellow-600' :
            'bg-gray-100 text-gray-500'
          }`}>
            {a.myJoinStatus === 'APPROVED' ? '✓ Joined' : a.myJoinStatus}
          </div>
        )}
      </div>
    </Link>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-4 h-14 flex items-center justify-between sticky top-0 z-10">
        <h1 className="font-bold text-gray-900">My Activities</h1>
        <Link href="/activities/create" className="btn-primary text-xs px-3 py-2 gap-1.5">
          <PlusCircle size={14}/>Create
        </Link>
      </div>

      <div className="flex gap-1 mx-4 mt-4 bg-white rounded-xl border border-gray-100 p-1">
        {(['joined', 'hosting'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition capitalize ${
              tab === t ? 'bg-primary-500 text-white' : 'text-gray-500'
            }`}>
            {t === 'joined' ? '✅ Joined' : '👑 Hosting'}
          </button>
        ))}
      </div>

      <div className="px-4 mt-4 space-y-4">
        {active.isLoading && (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin text-primary-500" size={28}/>
          </div>
        )}

        {!active.isLoading && items.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <Zap size={40} className="mx-auto mb-3 opacity-30"/>
            <p className="font-medium">
              {tab === 'joined' ? "You haven't joined any activities" : "You haven't hosted any activities"}
            </p>
            <Link href={tab === 'joined' ? '/activities' : '/activities/create'}
              className="btn-primary inline-flex mt-4 text-sm gap-1.5">
              {tab === 'joined' ? 'Browse activities' : 'Create activity'}
            </Link>
          </div>
        )}

        {upcoming.length > 0 && (
          <div>
            <p className="section-title">Upcoming ({upcoming.length})</p>
            <div className="space-y-3">
              {upcoming.map(a => <ActivityRow key={a.id} a={a}/>)}
            </div>
          </div>
        )}

        {past.length > 0 && (
          <div>
            <p className="section-title">Past</p>
            <div className="space-y-3 opacity-60">
              {past.map(a => <ActivityRow key={a.id} a={a}/>)}
            </div>
          </div>
        )}

        <div ref={ref} className="h-4"/>
        {active.isFetchingNextPage && (
          <div className="flex justify-center py-4">
            <Loader2 className="animate-spin text-primary-400" size={22}/>
          </div>
        )}
      </div>
    </div>
  );
}