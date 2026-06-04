'use client';
// src/app/(app)/safety/page.tsx
import { useState, useEffect } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useInView } from 'react-intersection-observer';
import { Loader2, Shield, AlertTriangle, PlusCircle, Siren, CheckCircle } from 'lucide-react';
import { safetyApi } from '@/api';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import toast from 'react-hot-toast';

const SEVERITY_COLOR: Record<string, string> = {
  LOW:      'bg-blue-50 text-blue-600 border-blue-100',
  MEDIUM:   'bg-yellow-50 text-yellow-700 border-yellow-100',
  HIGH:     'bg-orange-50 text-orange-700 border-orange-100',
  CRITICAL: 'bg-red-50 text-red-600 border-red-100',
};

const ALERT_EMOJI: Record<string, string> = {
  FIRE:'🔥', FLOOD:'🌊', ACCIDENT:'🚗', THEFT:'🔓',
  SUSPICIOUS:'👁️', MEDICAL:'🏥', INFRASTRUCTURE:'🏗️', OTHER:'⚠️',
};

type Tab = 'nearby' | 'all';

export default function SafetyPage() {
  const [tab, setTab] = useState<Tab>('nearby');
  const [radius, setRadius] = useState(5000);
  const [loc, setLoc] = useState({ lat: 3.139, lon: 101.6869 });

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      p => setLoc({ lat: p.coords.latitude, lon: p.coords.longitude })
    );
  }, []);

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage, refetch } = useInfiniteQuery({
    queryKey: ['safety', 'nearby', loc, radius],
    queryFn:  ({ pageParam = 0 }) => safetyApi.nearby(loc.lat, loc.lon, radius, pageParam),
    getNextPageParam: l => l.hasNext ? l.page + 1 : undefined,
    initialPageParam: 0,
  });

  const items = data?.pages.flatMap(p => p.content) ?? [];
  const activeItems   = items.filter(a => !a.resolvedAt);
  const resolvedItems = items.filter(a => !!a.resolvedAt);

  const { ref, inView } = useInView({ threshold: 0.1 });
  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [inView, hasNextPage, isFetchingNextPage]);

  const handleResolve = async (id: number) => {
    try { await safetyApi.resolve(id); toast.success('Alert resolved'); refetch(); }
    catch { toast.error('Failed'); }
  };

  const RADIUS_OPTIONS = [
    { v: 1000,  l: '1 km' },
    { v: 3000,  l: '3 km' },
    { v: 5000,  l: '5 km' },
    { v: 10000, l: '10 km' },
  ];

  return (
    <div className="pb-4">
      {/* Header */}
      <div className="px-4 pt-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Safety Alerts</h1>
        <Link href="/safety/create"
          className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-bold px-3 py-2 rounded-xl transition">
          <PlusCircle size={14}/>Report
        </Link>
      </div>

      {/* Emergency callout */}
      <div className="mx-4 mt-3 p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2">
        <Siren size={16} className="text-red-500 flex-shrink-0"/>
        <p className="text-xs text-red-700">Life-threatening emergency? Call <strong>999</strong> immediately.</p>
      </div>

      {/* Radius filter */}
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

      {/* Content */}
      <div className="px-4 mt-4 space-y-3">
        {isLoading && <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary-500" size={28}/></div>}

        {/* All clear state */}
        {!isLoading && activeItems.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
              <Shield size={28} className="text-green-500"/>
            </div>
            <p className="font-bold text-green-600">All Clear!</p>
            <p className="text-sm text-gray-400 mt-1">No active safety alerts within {radius/1000} km</p>
            <Link href="/safety/create" className="btn-primary inline-flex mt-4 text-sm gap-1.5">
              <PlusCircle size={14}/>Report an Issue
            </Link>
          </div>
        )}

        {/* Active alerts */}
        {activeItems.length > 0 && (
          <>
            <p className="section-title text-red-500">Active Alerts ({activeItems.length})</p>
            {activeItems.map(a => (
              <div key={a.id}
                className={`card p-4 space-y-3 border ${a.emergency ? 'border-red-300 bg-red-50/60' : SEVERITY_COLOR[a.severity]?.split(' ')[2] ?? 'border-gray-100'}`}>
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-xl ${a.emergency ? 'bg-red-100' : 'bg-gray-100'}`}>
                    {ALERT_EMOJI[a.alertType ?? ''] ?? '⚠️'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {a.emergency && (
                            <span className="badge bg-red-500 text-white text-xs animate-pulse gap-1">
                              <Siren size={10}/>EMERGENCY
                            </span>
                          )}
                          <span className={`badge text-xs ${SEVERITY_COLOR[a.severity] ?? 'bg-gray-100 text-gray-600'}`}>
                            {a.severity}
                          </span>
                          {a.verified && <span className="badge bg-green-50 text-green-600 text-xs gap-1"><CheckCircle size={9}/>Verified</span>}
                        </div>
                        <h3 className="font-bold text-gray-900 mt-1">{a.title}</h3>
                        {a.description && <p className="text-sm text-gray-600 mt-1 leading-relaxed">{a.description}</p>}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400 mt-2">
                      <span>by {a.reportedBy.name}</span>
                      <span>{formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}</span>
                      {a.address && <span>📍 {a.address}</span>}
                    </div>
                  </div>
                </div>
                <button onClick={() => handleResolve(a.id)}
                  className="text-xs text-gray-500 hover:text-green-600 border border-gray-200 hover:border-green-300 px-3 py-1.5 rounded-lg transition flex items-center gap-1.5">
                  <CheckCircle size={12}/>Mark as Resolved
                </button>
              </div>
            ))}
          </>
        )}

        {/* Resolved alerts */}
        {resolvedItems.length > 0 && (
          <>
            <p className="section-title mt-4">Resolved ({resolvedItems.length})</p>
            {resolvedItems.map(a => (
              <div key={a.id} className="card p-4 opacity-60">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{ALERT_EMOJI[a.alertType ?? ''] ?? '⚠️'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-gray-700 truncate">{a.title}</p>
                    <p className="text-xs text-gray-400">{formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}</p>
                  </div>
                  <span className="badge bg-green-50 text-green-600 text-xs gap-1"><Shield size={10}/>Resolved</span>
                </div>
              </div>
            ))}
          </>
        )}

        <div ref={ref} className="h-4"/>
        {isFetchingNextPage && <div className="flex justify-center py-4"><Loader2 className="animate-spin text-primary-400" size={22}/></div>}
      </div>
    </div>
  );
}
