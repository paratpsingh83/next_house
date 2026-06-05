'use client';
import { useState, useEffect } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useInView } from 'react-intersection-observer';
import { Loader2, Users, Search } from 'lucide-react';
import { communitiesApi } from '@/api';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function CommunitiesPage() {
  const [tab, setTab] = useState<'mine' | 'discover'>('mine');
  const [q, setQ] = useState('');
  const [loc, setLoc] = useState({ lat: 3.139, lon: 101.6869 });

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(p => setLoc({ lat: p.coords.latitude, lon: p.coords.longitude }));
  }, []);

  const mine = useInfiniteQuery({ queryKey:['communities','mine'], queryFn:({pageParam=0})=>communitiesApi.mine(pageParam), getNextPageParam:l=>l.hasNext?l.page+1:undefined, initialPageParam:0, enabled:tab==='mine' });
  const discover = useInfiniteQuery({ queryKey:['communities','search',q,loc.lat,loc.lon], queryFn:({pageParam=0})=>q.length>1?communitiesApi.search(q,pageParam):communitiesApi.nearby(loc.lat,loc.lon,10000,pageParam), getNextPageParam:l=>l.hasNext?l.page+1:undefined, initialPageParam:0, enabled:tab==='discover' });
  const active = tab === 'mine' ? mine : discover;
  const items = active.data?.pages.flatMap(p=>p.content)??[];
  const { ref, inView } = useInView({ threshold:0.1 });
  useEffect(()=>{ if(inView&&active.hasNextPage&&!active.isFetchingNextPage) active.fetchNextPage(); },[inView,active.hasNextPage,active.isFetchingNextPage]);
  const join = async (id:number, e:React.MouseEvent) => { e.preventDefault(); try { await communitiesApi.join(id); toast.success('Join request sent!'); mine.refetch(); discover.refetch(); } catch(err:any){toast.error(err?.response?.data?.message??'Failed');} };
  return (
    <div className="px-4 py-4 space-y-4">
      <div className="flex gap-2">
        {(['mine','discover'] as const).map(t=>(
          <button key={t} onClick={()=>setTab(t)} className={`flex-1 py-2 rounded-xl text-sm font-semibold transition ${tab===t?'bg-primary-500 text-white':'bg-white border border-gray-200 text-gray-600'}`}>
            {t==='mine'?'My Groups':'Discover'}
          </button>
        ))}
      </div>
      {tab==='discover'&&<div className="relative"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search communities..." className="input pl-9 text-sm"/></div>}
      {active.isLoading && <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary-500" size={28}/></div>}
      {!active.isLoading&&items.length===0&&<div className="text-center py-16 text-gray-400"><Users size={40} className="mx-auto mb-3 opacity-30"/><p>{tab==='mine'?'You haven\'t joined any groups yet':'No communities found'}</p></div>}
      <div className="space-y-3">
        {items.map(c=>(
          <Link key={c.id} href={`/communities/${c.id}`}>
            <div className="card p-4 flex items-center gap-3 hover:shadow-md transition">
              <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                {c.iconImage?<img src={c.iconImage} className="w-full h-full object-cover" alt={c.name}/>:<span className="text-primary-600 font-bold text-lg">{c.name[0]}</span>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2"><h3 className="font-semibold text-gray-900 truncate">{c.name}</h3>{c.verified&&<span className="text-primary-500 text-xs">✓</span>}</div>
                <p className="text-xs text-gray-500 truncate">{c.memberCount} members · {c.communityType}</p>
                {c.description&&<p className="text-xs text-gray-400 truncate mt-0.5">{c.description}</p>}
              </div>
              {!c.isMember&&<button onClick={e=>join(c.id,e)} className="btn-primary text-xs px-3 py-1.5">Join</button>}
              {c.isMember&&<span className="badge bg-primary-50 text-primary-600 text-xs">Joined</span>}
            </div>
          </Link>
        ))}
      </div>
      <div ref={ref} className="h-4"/>
    </div>
  );
}
