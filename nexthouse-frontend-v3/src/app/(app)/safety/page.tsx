'use client';
import { useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Loader2, Shield, PlusCircle, Siren } from 'lucide-react';
import { safetyApi } from '@/api';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { ActiveAlertCard, ResolvedAlertCard } from '@/components/safety/SafetyAlertCard';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { useGeoLocation } from '@/hooks/useGeoLocation';

const RADIUS_OPTIONS = [
  { v: 1000,  l: '1 km'  },
  { v: 3000,  l: '3 km'  },
  { v: 5000,  l: '5 km'  },
  { v: 10000, l: '10 km' },
];

export default function SafetyPage() {
  const loc = useGeoLocation();
  const [radius, setRadius] = useState(5000);

  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage, refetch } = useInfiniteQuery({
    queryKey: ['safety', 'nearby', loc, radius],
    queryFn:  ({ pageParam = 0 }) => safetyApi.nearby(loc.lat, loc.lon, radius, pageParam),
    getNextPageParam: l => l.hasNext ? l.page + 1 : undefined,
    initialPageParam: 0,
  });

  const items         = data?.pages.flatMap(p => p.content) ?? [];
  const activeItems   = items.filter(a => !a.resolvedAt);
  const resolvedItems = items.filter(a => !!a.resolvedAt);

  const { ref } = useInfiniteScroll(fetchNextPage, hasNextPage, isFetchingNextPage);

  const handleResolve = async (id: number) => {
    try { await safetyApi.resolve(id); toast.success('Alert resolved'); refetch(); }
    catch { toast.error('Failed'); }
  };

  return (
    <div className="pb-4">
      <div className="px-4 pt-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Safety Alerts</h1>
        <Link href="/safety/create"
          className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-bold px-3 py-2 rounded-xl transition">
          <PlusCircle size={14}/>Report
        </Link>
      </div>

      <div className="mx-4 mt-3 p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2">
        <Siren size={16} className="text-red-500 flex-shrink-0"/>
        <p className="text-xs text-red-700">Life-threatening emergency? Call <strong>999</strong> immediately.</p>
      </div>

      <div className="overflow-x-auto scrollbar-hide px-4 mt-3">
        <div className="flex gap-2 w-max">
          {RADIUS_OPTIONS.map(({ v, l }) => (
            <button key={v} onClick={() => setRadius(v)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition flex-shrink-0 ${
                radius === v ? 'bg-primary-500 text-white border-primary-500' : 'border-gray-200 text-gray-600 bg-white'
              }`}>
              📍 {l}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 mt-4 space-y-3">
        {isLoading && <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary-500" size={28}/></div>}

        {isError && !isLoading && (
          <div className="card p-6 text-center">
            <p className="text-sm font-semibold text-red-500 mb-2">Failed to load safety alerts</p>
            <button onClick={() => refetch()} className="text-xs text-primary-600 font-medium underline">Try again</button>
          </div>
        )}

        {!isLoading && !isError && activeItems.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
              <Shield size={28} className="text-green-500"/>
            </div>
            <p className="font-bold text-green-600">All Clear!</p>
            <p className="text-sm text-gray-400 mt-1">No active safety alerts within {radius / 1000} km</p>
            <Link href="/safety/create" className="btn-primary inline-flex mt-4 text-sm gap-1.5">
              <PlusCircle size={14}/>Report an Issue
            </Link>
          </div>
        )}

        {activeItems.length > 0 && (
          <>
            <p className="section-title text-red-500">Active Alerts ({activeItems.length})</p>
            {activeItems.map(a => <ActiveAlertCard key={a.id} alert={a} onResolve={handleResolve}/>)}
          </>
        )}

        {resolvedItems.length > 0 && (
          <>
            <p className="section-title mt-4">Resolved ({resolvedItems.length})</p>
            {resolvedItems.map(a => <ResolvedAlertCard key={a.id} alert={a}/>)}
          </>
        )}

        <div ref={ref} className="h-4"/>
        {isFetchingNextPage && <div className="flex justify-center py-4"><Loader2 className="animate-spin text-primary-400" size={22}/></div>}
      </div>
    </div>
  );
}