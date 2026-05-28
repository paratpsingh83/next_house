'use client';
import { useState, useEffect } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useInView } from 'react-intersection-observer';
import { Loader2, MapPin, CalendarDays } from 'lucide-react';
import { activitiesApi } from '@/api';
import type { ActivityResponse } from '@/types';
import { formatDistanceToNow, format } from 'date-fns';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function ActivitiesPage() {
  const [loc, setLoc] = useState({ lat: 3.139, lon: 101.6869 });
  useEffect(() => { navigator.geolocation?.getCurrentPosition(p => setLoc({ lat: p.coords.latitude, lon: p.coords.longitude })); }, []);
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['activities', 'nearby', loc],
    queryFn: ({ pageParam = 0 }) => activitiesApi.nearby(loc.lat, loc.lon, 10000, undefined, pageParam),
    getNextPageParam: l => l.hasNext ? l.page + 1 : undefined,
    initialPageParam: 0,
  });
  const { ref, inView } = useInView({ threshold: 0.1 });
  useEffect(() => { if (inView && hasNextPage && !isFetchingNextPage) fetchNextPage(); }, [inView, hasNextPage, isFetchingNextPage]);
  const items = data?.pages.flatMap(p => p.content) ?? [];
  return (
    <div className="px-4 py-4 space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Nearby Activities</h1>
      {isLoading && <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary-500" size={28}/></div>}
      {!isLoading && items.length === 0 && <div className="text-center py-16 text-gray-400"><CalendarDays size={40} className="mx-auto mb-3 opacity-30"/><p>No activities nearby</p></div>}
      <div className="space-y-3">
        {items.map(a => (
          <Link key={a.id} href={`/activities/${a.id}`}>
            <div className="card p-4 space-y-2 hover:shadow-md transition">
              <div className="flex items-start justify-between">
                <div>
                  <span className="badge bg-primary-50 text-primary-600 text-xs mb-1">{a.activityType}</span>
                  <h3 className="font-semibold text-gray-900">{a.title}</h3>
                </div>
                <span className={`badge text-xs ${a.myJoinStatus === 'APPROVED' ? 'bg-green-50 text-green-600' : a.myJoinStatus === 'PENDING' ? 'bg-yellow-50 text-yellow-600' : 'bg-gray-100 text-gray-500'}`}>
                  {a.myJoinStatus === 'NONE' ? 'Open' : a.myJoinStatus}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span className="flex items-center gap-1"><CalendarDays size={12}/>{format(new Date(a.activityTime), 'MMM d, h:mm a')}</span>
                {a.address && <span className="flex items-center gap-1"><MapPin size={12}/>{a.address}</span>}
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>{a.currentMemberCount}{a.maxMembers ? `/${a.maxMembers}` : ''} members</span>
                <span>by {a.hostUser.name}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
      <div ref={ref} className="h-4"/>
      {isFetchingNextPage && <div className="flex justify-center py-4"><Loader2 className="animate-spin text-primary-400" size={22}/></div>}
    </div>
  );
}
