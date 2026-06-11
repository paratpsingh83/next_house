'use client';
import { useState } from 'react';
import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Sparkles, Users, Zap, Building2, UserPlus, Check } from 'lucide-react';
import { recommendationsApi, communitiesApi } from '@/api';
import PostCard from '@/components/post/PostCard';
import ActivityCard from '@/components/activity/ActivityCard';
import CommunityCard from '@/components/community/CommunityCard';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import Link from 'next/link';
import toast from 'react-hot-toast';
import type { UserSummaryDTO } from '@/types';

type Tab = 'posts' | 'activities' | 'communities' | 'people';

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'posts',       label: 'Posts',       icon: Sparkles  },
  { id: 'activities',  label: 'Activities',  icon: Zap       },
  { id: 'communities', label: 'Communities', icon: Building2 },
  { id: 'people',      label: 'People',      icon: Users     },
];

function PersonCard({ user, onFollow }: { user: UserSummaryDTO; onFollow: (id: number) => void }) {
  const [followed, setFollowed] = useState(user.isFollowing ?? false);
  const handleFollow = (e: React.MouseEvent) => {
    e.preventDefault();
    setFollowed(f => !f);
    onFollow(user.id);
  };
  return (
    <Link href={`/profile/${user.id}`}>
      <div className="card p-4 flex items-center gap-3 hover:shadow-md transition">
        <div className="w-11 h-11 rounded-full bg-primary-100 overflow-hidden flex items-center justify-center flex-shrink-0">
          {user.profileImage
            ? <img src={user.profileImage} className="w-full h-full object-cover" alt=""/>
            : <span className="text-primary-700 font-bold">{user.name[0]}</span>
          }
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 truncate">{user.name}</p>
          <p className="text-xs text-gray-400 truncate">@{user.username}</p>
          {user.addressVerified && (
            <span className="text-xs text-primary-600 font-medium">✓ Verified resident</span>
          )}
        </div>
        <button
          onClick={handleFollow}
          className={`flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full border transition ${
            followed
              ? 'bg-gray-100 text-gray-500 border-gray-200'
              : 'bg-primary-500 text-white border-primary-500 hover:bg-primary-600'
          }`}
        >
          {followed ? <><Check size={11}/>Following</> : <><UserPlus size={11}/>Follow</>}
        </button>
      </div>
    </Link>
  );
}

export default function DiscoverPage() {
  const [tab, setTab] = useState<Tab>('posts');
  const qc = useQueryClient();

  const postsQ = useInfiniteQuery({
    queryKey: ['recommend', 'posts'],
    queryFn:  ({ pageParam = 0 }) => recommendationsApi.posts(pageParam),
    getNextPageParam: l => l.hasNext ? l.page + 1 : undefined,
    initialPageParam: 0,
    enabled: tab === 'posts',
  });

  const activitiesQ = useInfiniteQuery({
    queryKey: ['recommend', 'activities'],
    queryFn:  ({ pageParam = 0 }) => recommendationsApi.activities(pageParam),
    getNextPageParam: l => l.hasNext ? l.page + 1 : undefined,
    initialPageParam: 0,
    enabled: tab === 'activities',
  });

  const communitiesQ = useInfiniteQuery({
    queryKey: ['recommend', 'communities'],
    queryFn:  ({ pageParam = 0 }) => recommendationsApi.communities(pageParam),
    getNextPageParam: l => l.hasNext ? l.page + 1 : undefined,
    initialPageParam: 0,
    enabled: tab === 'communities',
  });

  const peopleQ = useInfiniteQuery({
    queryKey: ['recommend', 'people'],
    queryFn:  ({ pageParam = 0 }) => recommendationsApi.users(pageParam),
    getNextPageParam: l => l.hasNext ? l.page + 1 : undefined,
    initialPageParam: 0,
    enabled: tab === 'people',
  });

  const joinMut = useMutation({
    mutationFn: (id: number) => communitiesApi.join(id),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['recommend', 'communities'] }); toast.success('Joined!'); },
    onError:    () => toast.error('Failed to join'),
  });

  const followMut = useMutation({
    mutationFn: async (id: number) => {
      const { usersApi } = await import('@/api');
      return usersApi.follow(id);
    },
    onError: () => toast.error('Failed to follow'),
  });

  const active = { posts: postsQ, activities: activitiesQ, communities: communitiesQ, people: peopleQ }[tab];
  const { ref } = useInfiniteScroll(active.fetchNextPage, active.hasNextPage, active.isFetchingNextPage);

  const posts       = postsQ.data?.pages.flatMap(p => p.content) ?? [];
  const activities  = activitiesQ.data?.pages.flatMap(p => p.content) ?? [];
  const communities = communitiesQ.data?.pages.flatMap(p => p.content) ?? [];
  const people      = peopleQ.data?.pages.flatMap(p => p.content) ?? [];

  return (
    <div className="pb-4">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-center gap-2">
        <Sparkles size={20} className="text-primary-500"/>
        <h1 className="text-xl font-bold text-gray-900">For You</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mx-4 mb-4 bg-gray-100 rounded-xl p-1">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition ${
              tab === id ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500'
            }`}
          >
            <Icon size={13}/>{label}
          </button>
        ))}
      </div>

      <div className="px-4 space-y-3">
        {active.isLoading && (
          <div className="flex justify-center py-16">
            <Loader2 className="animate-spin text-primary-500" size={28}/>
          </div>
        )}

        {!active.isLoading && (
          <>
            {tab === 'posts' && (
              posts.length === 0
                ? <EmptyDiscover label="posts" />
                : <div className="space-y-3">{posts.map(p => <PostCard key={p.id} post={p}/>)}</div>
            )}

            {tab === 'activities' && (
              activities.length === 0
                ? <EmptyDiscover label="activities" />
                : <div className="space-y-3">{activities.map(a => <ActivityCard key={a.id} activity={a}/>)}</div>
            )}

            {tab === 'communities' && (
              communities.length === 0
                ? <EmptyDiscover label="communities" />
                : <div className="space-y-3">
                    {communities.map(c => (
                      <CommunityCard key={c.id} community={c} onJoin={(id, e) => { e.preventDefault(); joinMut.mutate(id); }}/>
                    ))}
                  </div>
            )}

            {tab === 'people' && (
              people.length === 0
                ? <EmptyDiscover label="people" />
                : <div className="space-y-3">
                    {people.map(u => <PersonCard key={u.id} user={u} onFollow={id => followMut.mutate(id)}/>)}
                  </div>
            )}
          </>
        )}

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

function EmptyDiscover({ label }: { label: string }) {
  return (
    <div className="text-center py-16 text-gray-400">
      <Sparkles size={40} className="mx-auto mb-3 opacity-25"/>
      <p className="font-medium">No {label} recommendations yet</p>
      <p className="text-sm mt-1">Follow more people to get personalised suggestions</p>
    </div>
  );
}