'use client';
import { useState, useEffect } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useInView } from 'react-intersection-observer';
import { Loader2, ShoppingBag, Search, PlusCircle } from 'lucide-react';
import { marketplaceApi } from '@/api';
import Link from 'next/link';

export default function MarketplacePage() {
  const [q, setQ] = useState('');
  const [loc, setLoc] = useState({lat:3.139,lon:101.6869});
  useEffect(()=>{navigator.geolocation?.getCurrentPosition(p=>setLoc({lat:p.coords.latitude,lon:p.coords.longitude}));}, []);
  const nearby = useInfiniteQuery({ queryKey:['marketplace','nearby',loc], queryFn:({pageParam=0})=>marketplaceApi.nearby(loc.lat,loc.lon,10000,undefined,undefined,undefined,pageParam), getNextPageParam:l=>l.hasNext?l.page+1:undefined, initialPageParam:0, enabled:!q });
  const search = useInfiniteQuery({ queryKey:['marketplace','search',q], queryFn:({pageParam=0})=>marketplaceApi.search(q,pageParam), getNextPageParam:l=>l.hasNext?l.page+1:undefined, initialPageParam:0, enabled:q.length>1 });
  const active = q.length>1?search:nearby;
  const items = active.data?.pages.flatMap(p=>p.content)??[];
  const { ref, inView } = useInView({threshold:0.1});
  useEffect(()=>{if(inView&&active.hasNextPage&&!active.isFetchingNextPage)active.fetchNextPage();},[inView,active.hasNextPage,active.isFetchingNextPage]);
  return (
    <div className="px-4 py-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Marketplace</h1>
        <Link href="/marketplace/create" className="btn-primary text-xs px-3 py-2 gap-1"><PlusCircle size={14}/>List item</Link>
      </div>
      <div className="relative"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search listings..." className="input pl-9 text-sm"/></div>
      {active.isLoading&&<div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary-500" size={28}/></div>}
      {!active.isLoading&&items.length===0&&<div className="text-center py-16 text-gray-400"><ShoppingBag size={40} className="mx-auto mb-3 opacity-30"/><p>No listings nearby</p></div>}
      <div className="grid grid-cols-2 gap-3">
        {items.map(item=>(
          <Link key={item.id} href={`/marketplace/${item.id}`}>
            <div className="card overflow-hidden hover:shadow-md transition">
              <div className="aspect-square bg-gray-100 overflow-hidden">
                {item.thumbnailUrl?<img src={item.thumbnailUrl} className="w-full h-full object-cover" alt={item.title} loading="lazy"/>:<div className="w-full h-full flex items-center justify-center text-gray-300"><ShoppingBag size={32}/></div>}
              </div>
              <div className="p-3 space-y-1">
                <p className="font-semibold text-sm text-gray-900 truncate">{item.title}</p>
                {item.price!=null?<p className="text-primary-600 font-bold text-sm">RM {Number(item.price).toFixed(2)}</p>:<p className="text-green-600 font-medium text-sm">Free</p>}
                <p className="text-xs text-gray-400 truncate">{item.seller.name}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
      <div ref={ref} className="h-4"/>
    </div>
  );
}
