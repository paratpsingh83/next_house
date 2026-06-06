'use client';
import { useState, useEffect } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useInView } from 'react-intersection-observer';
import { MapPin, Users, TrendingUp, Loader2, PlusCircle, Zap, ShoppingBag, Shield, Package } from 'lucide-react';
import { postsApi, neighborhoodsApi, usersApi } from '@/api';
import PostCard from '@/components/post/PostCard';
import CreatePostModal from '@/components/post/CreatePostModal';
import StoriesRow from '@/components/stories/StoriesRow';
import { useAppSelector } from '@/store';
import Link from 'next/link';

type Tab = 'nearby' | 'following' | 'trending';

// ── Quick action shortcuts ────────────────────────────────────────────────────
const QUICK_ACTIONS = [
  { href: '/activities/create',  icon: Zap,         label: 'Activity',  color: 'bg-violet-100 text-violet-600' },
  { href: '/marketplace/create', icon: ShoppingBag,  label: 'Sell',      color: 'bg-emerald-100 text-emerald-600' },
  { href: '/borrow/create',      icon: Package,      label: 'Borrow',    color: 'bg-amber-100 text-amber-600' },
  { href: '/safety/create',      icon: Shield,       label: 'Alert',     color: 'bg-red-100 text-red-600' },
];

// ── Skeleton post card ─────────────────────────────────────────────────────────
function PostSkeleton() {
  return (
    <div className="card p-4 space-y-3 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full shimmer-bg"/>
        <div className="flex-1 space-y-1.5">
          <div className="h-3.5 w-28 rounded shimmer-bg"/>
          <div className="h-3 w-20 rounded shimmer-bg"/>
        </div>
      </div>
      <div className="space-y-1.5">
        <div className="h-3 w-full rounded shimmer-bg"/>
        <div className="h-3 w-4/5 rounded shimmer-bg"/>
        <div className="h-3 w-3/5 rounded shimmer-bg"/>
      </div>
      <div className="h-44 w-full rounded-xl shimmer-bg"/>
      <div className="flex gap-3 pt-1">
        <div className="h-8 w-16 rounded-xl shimmer-bg"/>
        <div className="h-8 w-16 rounded-xl shimmer-bg"/>
      </div>
    </div>
  );
}

export default function FeedPage() {
  const [tab,        setTab]        = useState<Tab>('nearby');
  const [showCreate, setShowCreate] = useState(false);
  const [loc,        setLoc]        = useState({ lat: 3.139, lon: 101.6869 });
  const [neighborhoodId, setNeighborhoodId] = useState(1);
  const user = useAppSelector(s => s.auth.user);

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(p => {
      const { latitude: lat, longitude: lon } = p.coords;
      setLoc({ lat, lon });
      usersApi.updateLocation({ latitude: lat, longitude: lon }).catch(() => {});
      neighborhoodsApi.detect(lat, lon).then(n => { if (n?.id) setNeighborhoodId(n.id); }).catch(() => {});
    });
  }, []);

  const nearby = useInfiniteQuery({
    queryKey: ['feed', 'nearby', loc.lat, loc.lon],
    queryFn:  ({ pageParam = 0 }) => postsApi.nearbyFeed(loc.lat, loc.lon, 5000, pageParam),
    getNextPageParam: l => l.hasNext ? l.page + 1 : undefined,
    initialPageParam: 0,
    enabled: tab === 'nearby',
  });

  const following = useInfiniteQuery({
    queryKey: ['feed', 'following'],
    queryFn:  ({ pageParam = 0 }) => postsApi.followingFeed(pageParam),
    getNextPageParam: l => l.hasNext ? l.page + 1 : undefined,
    initialPageParam: 0,
    enabled: tab === 'following',
  });

  const trending = useInfiniteQuery({
    queryKey: ['feed', 'trending', neighborhoodId],
    queryFn:  ({ pageParam = 0 }) => postsApi.trendingFeed(neighborhoodId, pageParam),
    getNextPageParam: l => l.hasNext ? l.page + 1 : undefined,
    initialPageParam: 0,
    enabled: tab === 'trending',
  });

  const queries = { nearby, following, trending };
  const q = queries[tab];
  const posts = q.data?.pages.flatMap(p => p.content) ?? [];
  const isFirstLoad = q.isLoading && !q.data;

  const { ref, inView } = useInView({ threshold: 0.1 });
  useEffect(() => {
    if (inView && q.hasNextPage && !q.isFetchingNextPage) q.fetchNextPage();
  }, [inView, q.hasNextPage, q.isFetchingNextPage]);

  const TABS = [
    { id: 'nearby'    as Tab, label: 'Nearby',   icon: MapPin      },
    { id: 'following' as Tab, label: 'Following', icon: Users       },
    { id: 'trending'  as Tab, label: 'Trending',  icon: TrendingUp  },
  ];

  return (
    <div className="pb-2">

      {/* ── Stories row ──────────────────────────────────────────────────────── */}
      <StoriesRow/>

      {/* ── Create post prompt ───────────────────────────────────────────────── */}
      {user && (
        <div className="px-4 pt-4 pb-3">
          <button
            onClick={() => setShowCreate(true)}
            className="w-full card p-3 flex items-center gap-3 hover:shadow-md transition-shadow active:scale-[0.99] no-tap"
          >
            <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0 bg-primary-100 border-2 border-primary-200">
              {user.profileImage
                ? <img src={user.profileImage} alt={user.name} className="w-full h-full object-cover"/>
                : <span className="text-primary-600 font-bold text-sm">{user.name[0]}</span>
              }
            </div>
            <span className="text-gray-400 text-sm flex-1 text-left">What&apos;s happening in your neighbourhood?</span>
            <div className="w-8 h-8 rounded-xl bg-primary-500 flex items-center justify-center flex-shrink-0">
              <PlusCircle size={17} className="text-white"/>
            </div>
          </button>
        </div>
      )}

      {/* ── Quick action bar ─────────────────────────────────────────────────── */}
      <div className="px-4 pb-4">
        <div className="grid grid-cols-4 gap-2">
          {QUICK_ACTIONS.map(({ href, icon: Icon, label, color }) => (
            <Link key={href} href={href}>
              <div className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-white border border-gray-100 hover:shadow-sm transition active:scale-95 no-tap">
                <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center`}>
                  <Icon size={18}/>
                </div>
                <span className="text-[10px] font-semibold text-gray-600">{label}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Feed tabs ────────────────────────────────────────────────────────── */}
      <div className="px-4 pb-3">
        <div className="flex bg-white rounded-2xl border border-gray-100 p-1 gap-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold transition-all duration-200 no-tap ${
                tab === id
                  ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Icon size={13}/>{label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Feed content ─────────────────────────────────────────────────────── */}
      <div className="px-4 space-y-3">

        {/* Skeleton loading */}
        {isFirstLoad && Array.from({ length: 3 }).map((_, i) => <PostSkeleton key={i}/>)}

        {/* Error state */}
        {q.isError && !isFirstLoad && (
          <div className="card py-12 text-center">
            <p className="text-sm font-semibold text-red-500 mb-2">Failed to load posts</p>
            <button onClick={() => q.refetch()} className="text-xs text-primary-600 font-medium underline">Try again</button>
          </div>
        )}

        {/* Empty state */}
        {!isFirstLoad && !q.isError && !q.isFetching && posts.length === 0 && (
          <div className="empty-state card py-16">
            <div className="w-16 h-16 rounded-2xl bg-primary-100 flex items-center justify-center">
              {tab === 'nearby'    && <MapPin size={28} className="text-primary-500"/>}
              {tab === 'following' && <Users size={28} className="text-primary-500"/>}
              {tab === 'trending'  && <TrendingUp size={28} className="text-primary-500"/>}
            </div>
            <div className="text-center">
              <p className="font-bold text-gray-700">
                {tab === 'nearby'    ? 'No posts nearby'         :
                 tab === 'following' ? 'Your feed is empty'      :
                                      'Nothing trending yet'     }
              </p>
              <p className="text-sm text-gray-400 mt-1">
                {tab === 'nearby'    ? 'Be the first to post in your neighbourhood!'  :
                 tab === 'following' ? 'Follow neighbours to see their posts here'    :
                                      'Come back later for trending posts'            }
              </p>
            </div>
            <button onClick={() => setShowCreate(true)} className="btn-primary text-sm">
              <PlusCircle size={15}/>Create Post
            </button>
          </div>
        )}

        {/* Posts */}
        {posts.map(post => (
          <PostCard
            key={post.id}
            post={post}
            onDelete={() => q.refetch()}
          />
        ))}

        {/* Infinite scroll sentinel */}
        <div ref={ref} className="h-2"/>
        {q.isFetchingNextPage && (
          <div className="flex justify-center py-4">
            <Loader2 className="animate-spin text-primary-400" size={22}/>
          </div>
        )}

        {/* End of feed */}
        {!q.hasNextPage && posts.length > 0 && (
          <div className="text-center py-6 text-gray-300 text-xs font-medium">
            ✓ You&apos;re all caught up
          </div>
        )}
      </div>

      {/* ── Create post modal ─────────────────────────────────────────────────── */}
      {showCreate && user && (
        <CreatePostModal
          user={user}
          lat={loc.lat}
          lon={loc.lon}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); q.refetch(); }}
        />
      )}
    </div>
  );
}