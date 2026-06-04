'use client';
// src/app/(app)/neighbourhood/page.tsx
// Neighbourhood info + recommendations
import { useState } from 'react';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { useInView } from 'react-intersection-observer';
import { useEffect } from 'react';
import { Loader2, MapPin, Users, Zap, Building2, Star } from 'lucide-react';
import { recommendationsApi, usersApi } from '@/api';
import PostCard from '@/components/post/PostCard';
import Link from 'next/link';

type Tab = 'posts' | 'people' | 'activities' | 'communities';

export default function NeighbourhoodPage() {
  const [tab, setTab] = useState<Tab>('posts');
  const [loc, setLoc] = useState({ lat: 3.139, lon: 101.6869 });

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      p => setLoc({ lat: p.coords.latitude, lon: p.coords.longitude })
    );
  }, []);

  const postsQ = useInfiniteQuery({
    queryKey: ['recommendations', 'posts'],
    queryFn:  ({ pageParam = 0 }) => recommendationsApi.posts(pageParam),
    getNextPageParam: (l: any) => l.hasNext ? l.page + 1 : undefined,
    initialPageParam: 0,
    enabled: tab === 'posts',
  });

  const peopleQ = useInfiniteQuery({
    queryKey: ['recommendations', 'users'],
    queryFn:  ({ pageParam = 0 }) => recommendationsApi.users(pageParam),
    getNextPageParam: (l: any) => l.hasNext ? l.page + 1 : undefined,
    initialPageParam: 0,
    enabled: tab === 'people',
  });

  const activitiesQ = useInfiniteQuery({
    queryKey: ['recommendations', 'activities'],
    queryFn:  ({ pageParam = 0 }) => recommendationsApi.activities(pageParam),
    getNextPageParam: (l: any) => l.hasNext ? l.page + 1 : undefined,
    initialPageParam: 0,
    enabled: tab === 'activities',
  });

  const communitiesQ = useInfiniteQuery({
    queryKey: ['recommendations', 'communities'],
    queryFn:  ({ pageParam = 0 }) => recommendationsApi.communities(pageParam),
    getNextPageParam: (l: any) => l.hasNext ? l.page + 1 : undefined,
    initialPageParam: 0,
    enabled: tab === 'communities',
  });

  const activeQ = tab === 'posts' ? postsQ : tab === 'people' ? peopleQ : tab === 'activities' ? activitiesQ : communitiesQ;
  const items   = activeQ.data?.pages.flatMap((p: any) => p.content) ?? [];

  const { ref, inView } = useInView({ threshold: 0.1 });
  useEffect(() => {
    if (inView && activeQ.hasNextPage && !activeQ.isFetchingNextPage) activeQ.fetchNextPage();
  }, [inView, activeQ.hasNextPage, activeQ.isFetchingNextPage]);

  const TABS = [
    { id: 'posts' as Tab,       icon: Star,      label: 'Posts'       },
    { id: 'people' as Tab,      icon: Users,     label: 'People'      },
    { id: 'activities' as Tab,  icon: Zap,       label: 'Activities'  },
    { id: 'communities' as Tab, icon: Building2, label: 'Groups'      },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="px-4 pt-4 pb-2">
        <h1 className="text-xl font-bold text-gray-900">For You</h1>
        <p className="text-sm text-gray-400 mt-0.5">Recommended based on your neighbourhood</p>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto scrollbar-hide gap-1 px-4 mt-2 pb-2">
        {TABS.map(({ id, icon: Icon, label }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold flex-shrink-0 transition ${
              tab === id ? 'bg-primary-500 text-white' : 'bg-white text-gray-500 border border-gray-200'
            }`}>
            <Icon size={13}/>{label}
          </button>
        ))}
      </div>

      <div className="px-4 mt-3 space-y-3">
        {activeQ.isLoading && <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary-500" size={28}/></div>}

        {!activeQ.isLoading && items.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <Star size={40} className="mx-auto mb-3 opacity-30"/>
            <p className="font-medium">No recommendations yet</p>
            <p className="text-sm mt-1">Explore more to get personalised suggestions</p>
          </div>
        )}

        {/* Posts */}
        {tab === 'posts' && items.map((p: any) => <PostCard key={p.id} post={p}/>)}

        {/* People */}
        {tab === 'people' && items.map((u: any) => (
          <Link key={u.id} href={`/profile/${u.id}`}>
            <div className="card p-3 flex items-center gap-3 hover:shadow-sm transition">
              <div className="w-11 h-11 rounded-full bg-primary-100 overflow-hidden flex items-center justify-center flex-shrink-0">
                {u.profileImage ? <img src={u.profileImage} className="w-full h-full object-cover" alt=""/> : <span className="text-primary-600 font-bold">{u.name[0]}</span>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-gray-900 truncate">{u.name}</p>
                <p className="text-xs text-gray-400">@{u.username}</p>
              </div>
            </div>
          </Link>
        ))}

        {/* Activities */}
        {tab === 'activities' && items.map((a: any) => (
          <Link key={a.id} href={`/activities/${a.id}`}>
            <div className="card p-4 hover:shadow-sm transition">
              <div className="flex items-center gap-2 mb-1">
                <span className="badge bg-primary-50 text-primary-600 text-xs">{a.activityType}</span>
              </div>
              <p className="font-bold text-sm text-gray-900">{a.title}</p>
              {a.address && <p className="text-xs text-gray-400 mt-1">📍 {a.address}</p>}
            </div>
          </Link>
        ))}

        {/* Communities */}
        {tab === 'communities' && items.map((c: any) => (
          <Link key={c.id} href={`/communities/${c.id}`}>
            <div className="card p-3 flex items-center gap-3 hover:shadow-sm transition">
              <div className="w-11 h-11 rounded-xl bg-primary-100 overflow-hidden flex items-center justify-center flex-shrink-0">
                {c.iconImage ? <img src={c.iconImage} className="w-full h-full object-cover rounded-xl" alt=""/> : <span className="text-primary-600 font-bold text-lg">{c.name[0]}</span>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-gray-900 truncate">{c.name}</p>
                <p className="text-xs text-gray-400">{c.memberCount ?? 0} members</p>
              </div>
            </div>
          </Link>
        ))}

        <div ref={ref} className="h-4"/>
        {activeQ.isFetchingNextPage && <div className="flex justify-center py-4"><Loader2 className="animate-spin text-primary-400" size={22}/></div>}
      </div>
    </div>
  );
}
