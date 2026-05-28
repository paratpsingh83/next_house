'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Loader2, Users, FileText, Zap, Building2, ShoppingBag } from 'lucide-react';
import { searchApi } from '@/api';
import Link from 'next/link';

export default function SearchPage() {
  const [q, setQ] = useState('');
  const [active, setActive] = useState<'all'|'users'|'posts'|'activities'|'communities'|'marketplace'>('all');
  const { data, isLoading } = useQuery({ queryKey:['search',q], queryFn:()=>searchApi.global(q), enabled:q.length>=2, staleTime:30000 });
  const { data: trending } = useQuery({ queryKey:['search','trending'], queryFn:()=>searchApi.trending(), staleTime:5*60*1000 });
  return (
    <div className="px-4 py-4 space-y-4">
      <div className="relative">
        <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"/>
        <input autoFocus value={q} onChange={e=>setQ(e.target.value)} placeholder="Search people, posts, groups…" className="input pl-10 text-sm"/>
      </div>
      {q.length<2&&trending&&(
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Trending</p>
          <div className="flex flex-wrap gap-2">
            {trending.slice(0,10).map(t=><button key={t} onClick={()=>setQ(t)} className="px-3 py-1.5 rounded-full border border-gray-200 text-sm text-gray-700 hover:border-primary-300 hover:text-primary-600 transition">#{t}</button>)}
          </div>
        </div>
      )}
      {q.length>=2&&isLoading&&<div className="flex justify-center py-8"><Loader2 className="animate-spin text-primary-500" size={22}/></div>}
      {data&&(
        <div className="space-y-4">
          {data.users?.content && data.users.content.length>0&&(
            <div><p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1"><Users size={12}/>People</p>
              <div className="space-y-2">{data.users.content.slice(0,5).map(u=>(
                <Link key={u.id} href={`/profile/${u.id}`} className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50">
                  <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {u.profileImage?<img src={u.profileImage} className="w-full h-full object-cover" alt=""/>:<span className="text-primary-600 font-bold">{u.name[0]}</span>}
                  </div>
                  <div><p className="font-medium text-sm text-gray-900">{u.name}</p><p className="text-xs text-gray-400">@{u.username}</p></div>
                </Link>
              ))}</div>
            </div>
          )}
          {data.posts?.content && data.posts.content.length>0&&(
            <div><p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1"><FileText size={12}/>Posts</p>
              <div className="space-y-2">{data.posts.content.slice(0,3).map(p=>(
                <Link key={p.id} href={`/posts/${p.id}`} className="block p-3 rounded-xl border border-gray-100 hover:bg-gray-50">
                  <p className="text-sm text-gray-700 line-clamp-2">{p.content}</p>
                  <p className="text-xs text-gray-400 mt-1">by {p.createdBy?.name??'Anonymous'}</p>
                </Link>
              ))}</div>
            </div>
          )}
          {data.communities?.content && data.communities.content.length>0&&(
            <div><p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1"><Building2 size={12}/>Communities</p>
              <div className="space-y-2">{data.communities.content.slice(0,3).map(c=>(
                <Link key={c.id} href={`/communities/${c.id}`} className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50">
                  <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center overflow-hidden">
                    {c.iconImage?<img src={c.iconImage} className="w-full h-full object-cover" alt=""/>:<span className="text-primary-600 font-bold">{c.name[0]}</span>}
                  </div>
                  <div><p className="font-medium text-sm">{c.name}</p><p className="text-xs text-gray-400">{c.memberCount} members</p></div>
                </Link>
              ))}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
