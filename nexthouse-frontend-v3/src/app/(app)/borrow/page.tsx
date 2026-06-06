'use client';
// src/app/(app)/borrow/page.tsx
// Like Nextdoor's "For Sale & Free" borrow/lend section
import { useState } from 'react';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { useInView } from 'react-intersection-observer';
import { useEffect } from 'react';
import { Loader2, PlusCircle, Package, XCircle } from 'lucide-react';
import { borrowApi, neighborhoodsApi } from '@/api';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import toast from 'react-hot-toast';

const STATUS_COLOR: Record<string, string> = {
  OPEN:      'bg-green-50 text-green-600',
  ACCEPTED:  'bg-blue-50 text-blue-600',
  REJECTED:  'bg-red-50 text-red-600',
  RETURNED:  'bg-gray-100 text-gray-500',
  CLOSED:    'bg-gray-100 text-gray-400',
};

type Tab = 'nearby' | 'mine';

export default function BorrowPage() {
  const [tab, setTab] = useState<Tab>('nearby');
  const [loc, setLoc] = useState({ lat: 3.139, lon: 101.6869 });
  const qc = useQueryClient();

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      p => setLoc({ lat: p.coords.latitude, lon: p.coords.longitude })
    );
  }, []);

  const { data: neighborhood } = useQuery({
    queryKey: ['neighborhood', 'detect', loc],
    queryFn:  () => neighborhoodsApi.detect(loc.lat, loc.lon),
    staleTime: 5 * 60 * 1000,
  });

  const nearbyQ = useInfiniteQuery({
    queryKey: ['borrow', 'nearby', neighborhood?.id],
    queryFn:  ({ pageParam = 0 }) => borrowApi.byNeighborhood(neighborhood?.id ?? 0, undefined, pageParam),
    getNextPageParam: (l: any) => l.hasNext ? l.page + 1 : undefined,
    initialPageParam: 0,
    enabled: tab === 'nearby' && !!neighborhood?.id,
  });

  const mineQ = useInfiniteQuery({
    queryKey: ['borrow', 'mine'],
    queryFn:  ({ pageParam = 0 }) => borrowApi.mine(pageParam),
    getNextPageParam: (l: any) => l.hasNext ? l.page + 1 : undefined,
    initialPageParam: 0,
    enabled: tab === 'mine',
  });

  const active = tab === 'mine' ? mineQ : nearbyQ;
  const items  = active.data?.pages.flatMap((p: any) => p.content) ?? [];

  const { ref, inView } = useInView({ threshold: 0.1 });
  useEffect(() => {
    if (inView && active.hasNextPage && !active.isFetchingNextPage) active.fetchNextPage();
  }, [inView, active.hasNextPage, active.isFetchingNextPage]);

  const handleClose = async (id: number) => {
    try { await borrowApi.close(id); toast.success('Request closed'); qc.invalidateQueries({ queryKey: ['borrow'] }); }
    catch { toast.error('Failed'); }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="px-4 pt-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Borrow & Lend</h1>
        <Link href="/borrow/create" className="btn-primary text-xs px-3 py-2 gap-1.5">
          <PlusCircle size={14}/>Request
        </Link>
      </div>

      {/* Info banner */}
      <div className="mx-4 mt-3 p-3 bg-primary-50 border border-primary-100 rounded-xl">
        <p className="text-xs text-primary-700">
          🤝 <strong>Borrow from neighbours</strong> — post what you need and neighbours can help!
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mx-4 mt-3 bg-white rounded-xl border border-gray-100 p-1">
        {(['nearby', 'mine'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition ${tab === t ? 'bg-primary-500 text-white' : 'text-gray-500'}`}>
            {t === 'nearby' ? '📍 Nearby Requests' : '📋 My Requests'}
          </button>
        ))}
      </div>

      <div className="px-4 mt-4 space-y-3">
        {active.isLoading && <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary-500" size={28}/></div>}

        {active.isError && !active.isLoading && (
          <div className="card p-6 text-center">
            <p className="text-sm font-semibold text-red-500 mb-2">Failed to load requests</p>
            <button onClick={() => active.refetch()} className="text-xs text-primary-600 font-medium underline">Try again</button>
          </div>
        )}

        {!active.isLoading && !active.isError && items.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <Package size={40} className="mx-auto mb-3 opacity-30"/>
            <p className="font-medium">No borrow requests yet</p>
            <Link href="/borrow/create" className="btn-primary inline-flex mt-4 text-sm gap-1.5">
              <PlusCircle size={14}/>Create your first request
            </Link>
          </div>
        )}

        {items.map((req: any) => (
          <div key={req.id} className="card p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`badge text-xs ${STATUS_COLOR[req.status] ?? 'bg-gray-100 text-gray-500'}`}>
                    {req.status}
                  </span>
                  <span className="badge bg-gray-100 text-gray-500 text-xs">{req.itemType}</span>
                </div>
                <h3 className="font-bold text-sm text-gray-900">{req.title}</h3>
                {req.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{req.description}</p>}
              </div>
            </div>
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>by {req.requester.name}</span>
              <span>{formatDistanceToNow(new Date(req.createdAt), { addSuffix: true })}</span>
            </div>
            {req.status === 'OPEN' && (
              <div className="flex gap-2 pt-2 border-t border-gray-50">
                <button onClick={() => handleClose(req.id)}
                  className="flex items-center gap-1.5 text-xs text-gray-500 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition">
                  <XCircle size={12}/>Close Request
                </button>
              </div>
            )}
          </div>
        ))}

        <div ref={ref} className="h-4"/>
        {active.isFetchingNextPage && <div className="flex justify-center py-4"><Loader2 className="animate-spin text-primary-400" size={22}/></div>}
      </div>
    </div>
  );
}
