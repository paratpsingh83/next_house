'use client';
import { useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Loader2, ShoppingBag, Search, PlusCircle, Tag, SlidersHorizontal, X } from 'lucide-react';
import { marketplaceApi } from '@/api';
import Link from 'next/link';
import MarketplaceCard from '@/components/marketplace/MarketplaceCard';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { useGeoLocation } from '@/hooks/useGeoLocation';

const CATEGORIES = ['All', 'Electronics', 'Furniture', 'Clothing', 'Books', 'Vehicles', 'Sports', 'Food', 'Garden', 'Toys', 'Tools', 'Other'];

type Tab = 'nearby' | 'mine';

export default function MarketplacePage() {
  const loc = useGeoLocation();
  const [q,        setQ]        = useState('');
  const [tab,      setTab]      = useState<Tab>('nearby');
  const [category, setCategory] = useState('All');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const nearby = useInfiniteQuery({
    queryKey: ['marketplace', 'nearby', loc, category, q, minPrice, maxPrice],
    queryFn:  ({ pageParam = 0 }) =>
      marketplaceApi.nearby(
        loc.lat, loc.lon, 10000,
        category === 'All' ? undefined : category,
        minPrice ? Number(minPrice) : undefined,
        maxPrice ? Number(maxPrice) : undefined,
        pageParam, 20,
        q.length > 1 ? q : undefined
      ),
    getNextPageParam: l => l.hasNext ? l.page + 1 : undefined,
    initialPageParam: 0,
    enabled: tab === 'nearby',
  });

  const mine = useInfiniteQuery({
    queryKey: ['marketplace', 'mine'],
    queryFn:  ({ pageParam = 0 }) => marketplaceApi.mine(pageParam),
    getNextPageParam: l => l.hasNext ? l.page + 1 : undefined,
    initialPageParam: 0,
    enabled: tab === 'mine',
  });

  const active = tab === 'mine' ? mine : nearby;
  const items  = active.data?.pages.flatMap(p => p.content) ?? [];

  const { ref } = useInfiniteScroll(active.fetchNextPage, active.hasNextPage, active.isFetchingNextPage);

  return (
    <div className="pb-4">
      <div className="px-4 pt-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Marketplace</h1>
        <Link href="/marketplace/create" className="btn-primary text-xs px-3 py-2 gap-1">
          <PlusCircle size={14}/>List Item
        </Link>
      </div>

      <div className="flex gap-1 mx-4 mt-4 bg-white rounded-xl border border-gray-100 p-1">
        {(['nearby', 'mine'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition ${tab === t ? 'bg-primary-500 text-white' : 'text-gray-500'}`}>
            {t === 'nearby' ? '📍 Nearby' : '🏷️ My Listings'}
          </button>
        ))}
      </div>

      {tab === 'nearby' && (
        <div className="mx-4 mt-3 space-y-2">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search listings…" className="input pl-9 text-sm"/>
            </div>
            <button
              onClick={() => setShowFilters(f => !f)}
              className={`px-3 rounded-xl border-2 transition flex items-center gap-1.5 text-sm font-semibold flex-shrink-0 ${
                showFilters || minPrice || maxPrice
                  ? 'border-primary-500 bg-primary-50 text-primary-600'
                  : 'border-gray-200 text-gray-500 bg-white hover:border-gray-300'
              }`}
            >
              <SlidersHorizontal size={15}/>
              {(minPrice || maxPrice) ? <span className="w-1.5 h-1.5 rounded-full bg-primary-500"/> : null}
            </button>
          </div>

          {showFilters && (
            <div className="bg-white rounded-xl border border-gray-100 p-3 space-y-2">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-semibold text-gray-700">Price Range (RM)</p>
                {(minPrice || maxPrice) && (
                  <button onClick={() => { setMinPrice(''); setMaxPrice(''); }} className="text-xs text-primary-500 font-medium flex items-center gap-1">
                    <X size={11}/>Clear
                  </button>
                )}
              </div>
              <div className="flex gap-2 items-center">
                <input
                  type="number" min={0} placeholder="Min"
                  value={minPrice} onChange={e => setMinPrice(e.target.value)}
                  className="input text-sm flex-1 py-2"
                />
                <span className="text-gray-400 text-sm flex-shrink-0">–</span>
                <input
                  type="number" min={0} placeholder="Max"
                  value={maxPrice} onChange={e => setMaxPrice(e.target.value)}
                  className="input text-sm flex-1 py-2"
                />
              </div>
              <p className="text-xs text-gray-400">Leave blank for free items too</p>
            </div>
          )}
        </div>
      )}

      {tab === 'nearby' && (
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

      <div className="px-4 mt-4">
        {active.isLoading && (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary-500" size={28}/></div>
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
            <p className="font-medium">{tab === 'mine' ? 'You have no listings yet' : 'No items nearby'}</p>
            <Link href="/marketplace/create" className="btn-primary inline-flex mt-4 text-sm">List something</Link>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          {items.map(item => <MarketplaceCard key={item.id} item={item}/>)}
        </div>

        <div ref={ref} className="h-4"/>
        {active.isFetchingNextPage && (
          <div className="flex justify-center py-4"><Loader2 className="animate-spin text-primary-400" size={22}/></div>
        )}
      </div>
    </div>
  );
}