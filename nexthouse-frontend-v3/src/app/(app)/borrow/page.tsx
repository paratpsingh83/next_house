'use client';
import { useState, useEffect } from 'react';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { useInView } from 'react-intersection-observer';
import { Loader2, PlusCircle, Package, XCircle, MapPin } from 'lucide-react';
import { borrowApi, neighborhoodsApi } from '@/api';
import { useAppSelector } from '@/store';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import toast from 'react-hot-toast';

const STATUS_COLOR: Record<string, string> = {
  OPEN:        'bg-green-50 text-green-600',
  IN_PROGRESS: 'bg-blue-50 text-blue-600',
  FULFILLED:   'bg-primary-50 text-primary-600',
  CANCELLED:   'bg-gray-100 text-gray-400',
  CLOSED:      'bg-gray-100 text-gray-400',
};

type Tab = 'nearby' | 'mine';

export default function BorrowPage() {
  const [tab, setTab] = useState<Tab>('nearby');
  const [loc, setLoc] = useState<{ lat: number; lon: number } | null>(null);
  const [locDenied, setLocDenied] = useState(false);
  const me = useAppSelector(s => s.auth.user);
  const qc = useQueryClient();

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      p  => setLoc({ lat: p.coords.latitude, lon: p.coords.longitude }),
      () => { setLocDenied(true); setLoc({ lat: 0, lon: 0 }); },  // fallback → show global
      { timeout: 6000 }
    );
  }, []);

  // Detect neighborhood — only when we have GPS coords
  const { data: neighborhood, isLoading: detectingNeighborhood } = useQuery({
    queryKey: ['neighborhood', 'detect', loc],
    queryFn:  () => neighborhoodsApi.detect(loc!.lat, loc!.lon),
    enabled:  !!loc && !locDenied,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  // nearbyQ runs once we know location state:
  //   - loc is null      → still waiting for GPS, don't query yet
  //   - locDenied        → GPS denied, query with null neighborhoodId (shows global/untagged requests)
  //   - loc + neighborhood → query with real neighborhoodId
  //   - loc + no neighborhood → GPS got coords but no neighborhood found → query with null (global)
  const neighborhoodReady = loc !== null && (locDenied || !detectingNeighborhood);

  const nearbyQ = useInfiniteQuery({
    queryKey:  ['borrow', 'nearby', neighborhood?.id ?? null],
    queryFn:   ({ pageParam = 0 }) =>
      borrowApi.byNeighborhood(neighborhood?.id ?? 0, undefined, pageParam),
    getNextPageParam: (l: any) => l.hasNext ? l.page + 1 : undefined,
    initialPageParam: 0,
    enabled: tab === 'nearby' && neighborhoodReady,
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
    try {
      await borrowApi.close(id);
      toast.success('Request closed');
      qc.invalidateQueries({ queryKey: ['borrow'] });
    } catch { toast.error('Failed'); }
  };

  // Nearby tab shows spinner while we're waiting for location
  const waitingForLocation = tab === 'nearby' && loc === null;

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

      {/* Location status */}
      {tab === 'nearby' && neighborhood && (
        <div className="mx-4 mt-2 flex items-center gap-1.5 text-xs text-gray-400">
          <MapPin size={11}/> {neighborhood.name}
        </div>
      )}
      {tab === 'nearby' && locDenied && (
        <div className="mx-4 mt-2 flex items-center gap-1.5 text-xs text-amber-500">
          <MapPin size={11}/> Location not available — showing all requests
        </div>
      )}

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

        {/* Waiting for GPS */}
        {waitingForLocation && (
          <div className="flex flex-col items-center py-12 text-gray-400 gap-2">
            <Loader2 className="animate-spin text-primary-400" size={28}/>
            <p className="text-sm">Detecting your location…</p>
          </div>
        )}

        {/* Loading from API */}
        {!waitingForLocation && active.isLoading && (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin text-primary-500" size={28}/>
          </div>
        )}

        {/* Error */}
        {!waitingForLocation && active.isError && !active.isLoading && (
          <div className="card p-6 text-center">
            <p className="text-sm font-semibold text-red-500 mb-2">Failed to load requests</p>
            <button onClick={() => active.refetch()} className="text-xs text-primary-600 font-medium underline">Try again</button>
          </div>
        )}

        {/* Empty state */}
        {!waitingForLocation && !active.isLoading && !active.isError && items.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <Package size={40} className="mx-auto mb-3 opacity-30"/>
            <p className="font-medium">No borrow requests yet</p>
            <Link href="/borrow/create" className="btn-primary inline-flex mt-4 text-sm gap-1.5">
              <PlusCircle size={14}/>Create your first request
            </Link>
          </div>
        )}

        {/* Request cards */}
        {items.map((req: any) => {
          const isOwner = me?.id === req.requester?.id;
          return (
            <div key={req.id} className="card p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`badge text-xs ${STATUS_COLOR[req.status] ?? 'bg-gray-100 text-gray-500'}`}>
                      {req.status}
                    </span>
                    {req.itemType && (
                      <span className="badge bg-gray-100 text-gray-500 text-xs">{req.itemType}</span>
                    )}
                  </div>
                  <h3 className="font-bold text-sm text-gray-900">{req.title}</h3>
                  {req.description && (
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{req.description}</p>
                  )}
                  {req.requiredDuration && (
                    <p className="text-xs text-primary-600 mt-1">⏱ {req.requiredDuration}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-gray-400">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                    {req.requester?.profileImage
                      ? <img src={req.requester.profileImage} className="w-full h-full object-cover rounded-full" alt=""/>
                      : <span className="text-primary-600 font-bold text-[9px]">{req.requester?.name?.[0] ?? '?'}</span>
                    }
                  </div>
                  <span>by {req.requester?.name ?? 'Unknown'}</span>
                </div>
                <span>{formatDistanceToNow(new Date(req.createdAt), { addSuffix: true })}</span>
              </div>

              {/* Actions — close only for owner, respond for others */}
              {req.status === 'OPEN' && (
                <div className="flex gap-2 pt-2 border-t border-gray-50">
                  {isOwner ? (
                    <button
                      onClick={() => handleClose(req.id)}
                      className="flex items-center gap-1.5 text-xs text-gray-500 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition"
                    >
                      <XCircle size={12}/>Close Request
                    </button>
                  ) : (
                    <button
                      onClick={async () => {
                        try {
                          await borrowApi.respond(req.id, 'ACCEPT');
                          toast.success('You offered to help!');
                          qc.invalidateQueries({ queryKey: ['borrow'] });
                        } catch (e: any) {
                          toast.error(e?.response?.data?.message ?? 'Failed');
                        }
                      }}
                      className="flex items-center gap-1.5 text-xs text-primary-600 border border-primary-200 px-3 py-1.5 rounded-lg hover:bg-primary-50 transition"
                    >
                      🤝 I can help!
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}

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
