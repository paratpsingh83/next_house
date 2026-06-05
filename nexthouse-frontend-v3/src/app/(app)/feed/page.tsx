'use client';
// src/app/(app)/feed/page.tsx
import { useState, useEffect } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useInView } from 'react-intersection-observer';
import { MapPin, Users, TrendingUp, Loader2, PlusCircle } from 'lucide-react';
import { postsApi, neighborhoodsApi, usersApi } from '@/api';
import PostCard from '@/components/post/PostCard';
import CreatePostModal from '@/components/post/CreatePostModal';
import { useAppSelector } from '@/store';

type Tab = 'nearby' | 'following' | 'trending';

export default function FeedPage() {
  const [tab, setTab]           = useState<Tab>('nearby');
  const [showCreate, setCreate] = useState(false);
  const [loc, setLoc]           = useState({ lat: 3.139, lon: 101.6869 });
  const user = useAppSelector(s => s.auth.user);

  const [neighborhoodId, setNeighborhoodId] = useState<number>(1);

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(p => {
      const lat = p.coords.latitude;
      const lon = p.coords.longitude;
      setLoc({ lat, lon });
      // Keep backend location in sync so nearby queries work correctly
      usersApi.updateLocation({ latitude: lat, longitude: lon }).catch(() => {});
      // Detect the actual neighborhood for the trending feed
      neighborhoodsApi.detect(lat, lon).then(n => { if (n?.id) setNeighborhoodId(n.id); }).catch(() => {});
    });
  }, []);

  const nearby = useInfiniteQuery({
    queryKey: ['feed', 'nearby', loc.lat, loc.lon],
    queryFn:  ({ pageParam = 0 }) => postsApi.nearbyFeed(loc.lat, loc.lon, 5000, pageParam),
    getNextPageParam: l => (l.hasNext ? l.page + 1 : undefined),
    initialPageParam: 0,
    enabled: tab === 'nearby',
  });

  const following = useInfiniteQuery({
    queryKey: ['feed', 'following'],
    queryFn:  ({ pageParam = 0 }) => postsApi.followingFeed(pageParam),
    getNextPageParam: l => (l.hasNext ? l.page + 1 : undefined),
    initialPageParam: 0,
    enabled: tab === 'following',
  });

  const trending = useInfiniteQuery({
    queryKey: ['feed', 'trending', neighborhoodId],
    queryFn:  ({ pageParam = 0 }) => postsApi.trendingFeed(neighborhoodId, pageParam),
    getNextPageParam: l => (l.hasNext ? l.page + 1 : undefined),
    initialPageParam: 0,
    enabled: tab === 'trending',
  });

  const queries = { nearby, following, trending };
  const q = queries[tab];
  const posts = q.data?.pages.flatMap(p => p.content) ?? [];

  const { ref, inView } = useInView({ threshold: 0.1 });
  useEffect(() => {
    if (inView && q.hasNextPage && !q.isFetchingNextPage) q.fetchNextPage();
  }, [inView, q.hasNextPage, q.isFetchingNextPage]);

  const tabs = [
    { id: 'nearby'    as Tab, label: 'Nearby',    icon: MapPin },
    { id: 'following' as Tab, label: 'Following',  icon: Users },
    { id: 'trending'  as Tab, label: 'Trending',   icon: TrendingUp },
  ];

  return (
    <div className="px-4 py-4 space-y-4">
      {/* Create post prompt */}
      {user && (
        <button
          onClick={() => setCreate(true)}
          className="w-full card p-4 flex items-center gap-3 text-left hover:bg-gray-50 transition"
        >
          <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
            {user.profileImage
              ? <img src={user.profileImage} alt={user.name} className="w-full h-full rounded-full object-cover"/>
              : <span className="text-primary-600 font-bold text-sm">{user.name[0]}</span>
            }
          </div>
          <span className="text-gray-400 text-sm flex-1">What&apos;s happening in your neighbourhood?</span>
          <PlusCircle size={20} className="text-primary-500 flex-shrink-0"/>
        </button>
      )}

      {/* Feed tabs */}
      <div className="flex gap-1 bg-white rounded-xl border border-gray-100 p-1">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition ${
              tab === id ? 'bg-primary-500 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* Posts */}
      {q.isLoading && (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin text-primary-500" size={28} />
        </div>
      )}

      {!q.isLoading && posts.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <MapPin size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">No posts yet</p>
          <p className="text-sm mt-1">Be the first to post in your neighbourhood!</p>
        </div>
      )}

      <div className="space-y-3">
        {posts.map(post => <PostCard key={post.id} post={post} />)}
      </div>

      {/* Infinite scroll trigger */}
      <div ref={ref} className="h-4" />
      {q.isFetchingNextPage && (
        <div className="flex justify-center py-4">
          <Loader2 className="animate-spin text-primary-400" size={22} />
        </div>
      )}

      {/* Create post modal */}
      {showCreate && user && (
        <CreatePostModal
          user={user}
          lat={loc.lat}
          lon={loc.lon}
          onClose={() => setCreate(false)}
          onCreated={() => { setCreate(false); q.refetch(); }}
        />
      )}
    </div>
  );
}
