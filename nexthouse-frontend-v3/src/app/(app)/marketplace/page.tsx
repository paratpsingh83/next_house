'use client';
// src/app/(app)/marketplace/page.tsx
import { useState, useEffect } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useInView } from 'react-intersection-observer';
import { Loader2, ShoppingBag, Search, PlusCircle, Tag } from 'lucide-react';
import { marketplaceApi } from '@/api';
import Link from 'next/link';

const CATEGORIES = ['All','Electronics','Furniture','Clothing','Books','Vehicles','Sports','Food','Garden','Toys','Tools','Other'];

type Tab = 'nearby' | 'mine';

export default function MarketplacePage() {
  const [q,        setQ]        = useState('');
  const [tab,      setTab]      = useState<Tab>('nearby');
  const [category, setCategory] = useState('All');
  const [loc, setLoc] = useState({ lat: 3.139, lon: 101.6869 });

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      p => setLoc({ lat: p.coords.latitude, lon: p.coords.longitude })
    );
  }, []);

  const nearby = useInfiniteQuery({
    queryKey: ['marketplace','nearby',loc,category,q],
    queryFn:  ({ pageParam = 0 }) =>
      q.length > 1
        ? marketplaceApi.search(q, pageParam)
        : marketplaceApi.nearby(loc.lat, loc.lon, 10000, category==='All'?undefined:category, undefined, undefined, pageParam),
    getNextPageParam: l => l.hasNext ? l.page + 1 : undefined,
    initialPageParam: 0,
    enabled: tab === 'nearby',
  });

  const mine = useInfiniteQuery({
    queryKey: ['marketplace','mine'],
    queryFn:  ({ pageParam = 0 }) => marketplaceApi.mine(pageParam),
    getNextPageParam: l => l.hasNext ? l.page + 1 : undefined,
    initialPageParam: 0,
    enabled: tab === 'mine',
  });

  const active = tab === 'mine' ? mine : nearby;
  const items  = active.data?.pages.flatMap(p => p.content) ?? [];

  const { ref, inView } = useInView({ threshold: 0.1 });
  useEffect(() => {
    if (inView && active.hasNextPage && !active.isFetchingNextPage) active.fetchNextPage();
  }, [inView, active.hasNextPage, active.isFetchingNextPage]);

  return (
    <div className="pb-4">
      {/* Header */}
      <div className="px-4 pt-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Marketplace</h1>
        <Link href="/marketplace/create" className="btn-primary text-xs px-3 py-2 gap-1">
          <PlusCircle size={14}/>List Item
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mx-4 mt-4 bg-white rounded-xl border border-gray-100 p-1">
        {(['nearby','mine'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition ${tab===t?'bg-primary-500 text-white':'text-gray-500'}`}>
            {t === 'nearby' ? '📍 Nearby' : '🏷️ My Listings'}
          </button>
        ))}
      </div>

      {/* Search bar */}
      {tab === 'nearby' && (
        <div className="relative mx-4 mt-3">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search listings…"
            className="input pl-9 text-sm"
          />
        </div>
      )}

      {/* Category filter */}
      {tab === 'nearby' && !q && (
        <div className="overflow-x-auto scrollbar-hide px-4 mt-3">
          <div className="flex gap-2 w-max">
            {CATEGORIES.map(c => (
              <button key={c} onClick={() => setCategory(c)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border transition flex-shrink-0 ${
                  category === c ? 'bg-primary-500 text-white border-primary-500' : 'border-gray-200 text-gray-600 bg-white hover:border-primary-300'
                }`}>
                <Tag size={10}/>{c}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Grid */}
      <div className="px-4 mt-4">
        {active.isLoading && (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin text-primary-500" size={28}/>
          </div>
        )}
        {active.isError && !active.isLoading && (
          <div className="card p-6 text-center col-span-2 mb-4">
            <p className="text-sm font-semibold text-red-500 mb-2">Failed to load listings</p>
            <button onClick={() => active.refetch()} className="text-xs text-primary-600 font-medium underline">Try again</button>
          </div>
        )}

        {!active.isLoading && !active.isError && items.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <ShoppingBag size={40} className="mx-auto mb-3 opacity-30"/>
            <p className="font-medium">{tab==='mine'?'You have no listings yet':'No items nearby'}</p>
            <Link href="/marketplace/create" className="btn-primary inline-flex mt-4 text-sm">List something</Link>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          {items.map(item => (
            <Link key={item.id} href={`/marketplace/${item.id}`}>
              <div className="card overflow-hidden hover:shadow-md transition">
                {/* Image */}
                <div className="aspect-square bg-gray-100 overflow-hidden relative">
                  {item.thumbnailUrl
                    ? <img src={item.thumbnailUrl} className="w-full h-full object-cover" alt={item.title} loading="lazy"/>
                    : <div className="w-full h-full flex items-center justify-center text-gray-200"><ShoppingBag size={36}/></div>
                  }
                  {/* Sold overlay */}
                  {(!item.available || item.status === 'SOLD') && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <span className="bg-white text-gray-900 font-bold text-xs px-3 py-1 rounded-full">SOLD</span>
                    </div>
                  )}
                  {item.featured && (
                    <div className="absolute top-2 left-2">
                      <span className="badge bg-yellow-400 text-yellow-900 text-[10px]">⭐ Featured</span>
                    </div>
                  )}
                </div>
                {/* Info */}
                <div className="p-3 space-y-1">
                  <p className="font-semibold text-sm text-gray-900 truncate leading-snug">{item.title}</p>
                  <div className="flex items-center justify-between">
                    {item.price != null
                      ? <p className="text-primary-600 font-bold text-sm">RM {Number(item.price).toFixed(2)}</p>
                      : <p className="text-green-600 font-bold text-sm">Free</p>
                    }
                    {item.negotiable && <span className="text-xs text-blue-500">nego</span>}
                  </div>
                  <p className="text-xs text-gray-400 truncate">{item.seller.name}</p>
                  {item.category && (
                    <span className="badge bg-gray-100 text-gray-500 text-[10px]">{item.category}</span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>

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
