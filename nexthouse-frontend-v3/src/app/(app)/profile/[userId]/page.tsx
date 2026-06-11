'use client';
// src/app/(app)/profile/[userId]/page.tsx
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useInView } from 'react-intersection-observer';
import { ArrowLeft, Loader2, UserCheck, UserPlus, MessageCircle, MapPin, Shield, Settings, MoreHorizontal, Users, Clock, BadgeCheck } from 'lucide-react';
import { usersApi, postsApi, chatApi } from '@/api';
import type { UserResponse } from '@/types';
import PostCard from '@/components/post/PostCard';
import { useAppSelector } from '@/store';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

type Tab = 'posts' | 'followers' | 'following';

export default function ProfilePage() {
  const { userId }   = useParams<{ userId: string }>();
  const router       = useRouter();
  const qc           = useQueryClient();
  const me           = useAppSelector(s => s.auth.user);
  const uId          = Number(userId);
  const [tab,          setTab]          = useState<Tab>('posts');
  const [isFollowing,    setIsFollowing]    = useState<boolean | null>(null);
  const [isRequested,    setIsRequested]    = useState<boolean | null>(null);
  const [followLoading,  setFollowLoading]  = useState(false);
  const [showUnfollowDlg,setShowUnfollowDlg]= useState(false);

  // ── User profile ──────────────────────────────────────────────────────────
  // FIX: removed onSuccess (deprecated in React Query v5)
  // Instead use useEffect to sync isFollowing from fetched data
  const { data: user, isLoading } = useQuery<UserResponse>({
    queryKey: ['user', uId],
    queryFn:  () => usersApi.getProfile(uId),
  });

  // Always sync follow state from fresh server data
  useEffect(() => {
    if (user) {
      setIsFollowing(user.isFollowing ?? false);
      setIsRequested(user.isRequested ?? false);
    }
  }, [user]);

  // ── Posts ─────────────────────────────────────────────────────────────────
  const postsQ = useInfiniteQuery({
    queryKey: ['user-posts', uId],
    queryFn:  ({ pageParam = 0 }) => postsApi.userPosts(uId, pageParam),
    getNextPageParam: (l: any) => l.hasNext ? l.page + 1 : undefined,
    initialPageParam: 0,
    enabled: tab === 'posts',
  });

  // ── Followers / Following ─────────────────────────────────────────────────
  const followersQ = useQuery({
    queryKey: ['user-followers', uId],
    queryFn:  () => usersApi.getFollowers(uId, 0, 50),
    enabled:  tab === 'followers',
  });

  const followingQ = useQuery({
    queryKey: ['user-following', uId],
    queryFn:  () => usersApi.getFollowing(uId, 0, 50),
    enabled:  tab === 'following',
  });

  // ── Infinite scroll ───────────────────────────────────────────────────────
  const { ref, inView } = useInView({ threshold: 0.1 });
  useEffect(() => {
    if (inView && postsQ.hasNextPage && !postsQ.isFetchingNextPage) postsQ.fetchNextPage();
  }, [inView, postsQ.hasNextPage, postsQ.isFetchingNextPage]);

  const posts    = postsQ.data?.pages.flatMap((p: any) => p.content) ?? [];
  const isSelf    = me?.id === uId;
  const following = isFollowing ?? user?.isFollowing ?? false;
  const requested = isRequested ?? user?.isRequested ?? false;

  // ── Follow / Unfollow ─────────────────────────────────────────────────────
  const handleFollow = () => {
    if (following) { setShowUnfollowDlg(true); return; }
    if (requested)  { toast('Follow request already sent', { icon: '⏳' }); return; }
    doFollow();
  };

  const doFollow = async () => {
    setFollowLoading(true);
    try {
      const status = await usersApi.follow(uId);
      await qc.refetchQueries({ queryKey: ['user', uId] });
      if (status === 'REQUESTED') {
        toast('Follow request sent', { icon: '⏳' });
      } else {
        toast.success('Following!');
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Failed');
    } finally { setFollowLoading(false); }
  };

  const doUnfollow = async () => {
    setShowUnfollowDlg(false);
    setFollowLoading(true);
    try {
      await usersApi.unfollow(uId);
      await qc.refetchQueries({ queryKey: ['user', uId] });
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Failed');
    } finally { setFollowLoading(false); }
  };

  // ── Open DM chat ──────────────────────────────────────────────────────────
  const openChat = async () => {
    try {
      const r = await chatApi.directRoom(uId);
      router.push(`/chat/${r.id}`);
    } catch { toast.error('Failed to open chat'); }
  };

  // ── Loading / error states ────────────────────────────────────────────────
  if (isLoading) return (
    <div className="flex justify-center items-center min-h-[60vh]">
      <Loader2 className="animate-spin text-primary-500" size={28}/>
    </div>
  );

  if (!user) return (
    <div className="p-8 text-center text-gray-400">User not found</div>
  );

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 h-14 bg-white border-b border-gray-100 sticky top-0 z-10">
        <button onClick={() => router.back()} className="p-1.5 rounded-xl text-gray-500 hover:bg-gray-100">
          <ArrowLeft size={20}/>
        </button>
        <p className="font-bold text-gray-900 flex-1 truncate">{user.name}</p>
        {isSelf  && <Link href="/settings" className="p-1.5 rounded-xl text-gray-500 hover:bg-gray-100"><Settings size={20}/></Link>}
        {!isSelf && <button className="p-1.5 rounded-xl text-gray-500 hover:bg-gray-100"><MoreHorizontal size={20}/></button>}
      </div>

      {/* ── Profile info ───────────────────────────────────────────────────── */}
      <div className="bg-white px-4 pt-5 pb-4 border-b border-gray-100">
        <div className="flex items-start gap-4">

          {/* Avatar */}
          <div className="w-20 h-20 rounded-2xl bg-primary-100 overflow-hidden flex-shrink-0 flex items-center justify-center relative">
            {user.profileImage
              ? <img src={user.profileImage} className="w-full h-full object-cover" alt={user.name}/>
              : <span className="text-primary-600 font-bold text-3xl">{user.name[0]}</span>
            }
            {user.online && (
              <div className="absolute bottom-1 right-1 w-3.5 h-3.5 bg-green-400 rounded-full border-2 border-white"/>
            )}
          </div>

          {/* Name + stats */}
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-gray-900 truncate">{user.name}</h2>
            <p className="text-sm text-gray-400">@{user.username}</p>
            {user.bio && <p className="text-sm text-gray-700 mt-1.5 leading-relaxed">{user.bio}</p>}

            <div className="flex items-center gap-5 mt-3">
              <button onClick={() => setTab('followers')} className="text-center">
                <p className="font-bold text-gray-900 text-lg leading-none">{user.followerCount ?? 0}</p>
                <p className="text-xs text-gray-400 mt-0.5">Followers</p>
              </button>
              <button onClick={() => setTab('following')} className="text-center">
                <p className="font-bold text-gray-900 text-lg leading-none">{user.followingCount ?? 0}</p>
                <p className="text-xs text-gray-400 mt-0.5">Following</p>
              </button>
              <div className="text-center">
                <p className="font-bold text-primary-600 text-lg leading-none">{user.trustScore}</p>
                <p className="text-xs text-gray-400 mt-0.5">Trust</p>
              </div>
            </div>
          </div>
        </div>

        {/* Verification badges */}
        <div className="flex flex-wrap gap-2 mt-3">
          {user.addressVerified  && <span className="badge bg-blue-50 text-blue-600 gap-1 text-xs"><MapPin size={10}/>Address Verified</span>}
          {user.identityVerified && <span className="badge bg-green-50 text-green-600 gap-1 text-xs"><Shield size={10}/>ID Verified</span>}
          <span className={`badge text-xs ${user.online ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
            {user.online
              ? '● Online'
              : user.lastSeen
                ? `Last seen ${formatDistanceToNow(new Date(user.lastSeen), { addSuffix: true })}`
                : 'Offline'
            }
          </span>
        </div>

        {/* Action buttons */}
        {!isSelf && (
          <div className="flex gap-2 mt-4">
            <button
              onClick={handleFollow}
              disabled={followLoading}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm transition ${
                following  ? 'border-2 border-gray-200 text-gray-700 hover:bg-gray-50'
                : requested? 'border-2 border-gray-200 text-gray-500'
                :            'bg-primary-500 text-white hover:bg-primary-600'
              }`}
            >
              {followLoading
                ? <Loader2 size={16} className="animate-spin"/>
                : following  ? <UserCheck size={16}/>
                : requested  ? <Clock size={16}/>
                :              <UserPlus size={16}/>
              }
              {following ? 'Following' : requested ? 'Requested' : 'Follow'}
            </button>
            <button
              onClick={openChat}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-gray-200 text-gray-700 hover:bg-gray-50 font-semibold text-sm transition"
            >
              <MessageCircle size={16}/>Message
            </button>
          </div>
        )}

        {isSelf && (
          <div className="mt-4 flex gap-2">
            <Link href="/settings/profile" className="flex-1">
              <div className="py-2.5 rounded-xl border-2 border-gray-200 text-gray-700 text-sm font-semibold flex items-center justify-center gap-2 hover:bg-gray-50 transition">
                <Settings size={16}/>Edit Profile
              </div>
            </Link>
            {(!user.addressVerified || !user.identityVerified) && (
              <Link href="/settings/verification">
                <div className="py-2.5 px-4 rounded-xl border-2 border-primary-200 text-primary-600 text-sm font-semibold flex items-center gap-2 hover:bg-primary-50 transition">
                  <BadgeCheck size={16}/>Verify
                </div>
              </Link>
            )}
          </div>
        )}
      </div>

      {/* ── Tabs ───────────────────────────────────────────────────────────── */}
      <div className="flex bg-white border-b border-gray-100 sticky top-14 z-30">
        {(['posts','followers','following'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-3 text-xs font-semibold border-b-2 transition ${
              tab === t ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-400'
            }`}
          >
            {t === 'posts'     ? 'Posts'
            : t === 'followers'? `Followers (${user.followerCount ?? 0})`
            :                    `Following (${user.followingCount ?? 0})`}
          </button>
        ))}
      </div>

      {/* ── POSTS TAB ──────────────────────────────────────────────────────── */}
      {tab === 'posts' && (
        <div className="px-4 py-4 space-y-3">
          {postsQ.isLoading && <div className="flex justify-center py-10"><Loader2 className="animate-spin text-primary-500" size={28}/></div>}
          {!postsQ.isLoading && posts.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <p>No posts yet</p>
              {isSelf && <Link href="/feed" className="btn-primary inline-flex mt-3 text-sm">Create your first post</Link>}
            </div>
          )}
          {posts.map((p: any) => <PostCard key={p.id} post={p}/>)}
          <div ref={ref} className="h-4"/>
          {postsQ.isFetchingNextPage && <div className="flex justify-center py-4"><Loader2 className="animate-spin text-primary-400" size={22}/></div>}
        </div>
      )}

      {/* ── FOLLOWERS TAB ──────────────────────────────────────────────────── */}
      {tab === 'followers' && (
        <div className="px-4 py-4 space-y-2">
          {followersQ.isLoading && <div className="flex justify-center py-10"><Loader2 className="animate-spin text-primary-500" size={28}/></div>}
          {!followersQ.isLoading && (followersQ.data?.content ?? []).length === 0 && (
            <div className="text-center py-16 text-gray-400"><Users size={36} className="mx-auto mb-2 opacity-30"/><p>No followers yet</p></div>
          )}
          {(followersQ.data?.content ?? []).map((u: any) => (
            <Link key={u.id} href={`/profile/${u.id}`}>
              <div className="card p-3 flex items-center gap-3 hover:shadow-sm transition">
                <div className="w-11 h-11 rounded-full bg-primary-100 overflow-hidden flex items-center justify-center flex-shrink-0">
                  {u.profileImage ? <img src={u.profileImage} className="w-full h-full object-cover" alt=""/> : <span className="text-primary-600 font-bold">{u.name[0]}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-gray-900 truncate">{u.name}</p>
                  <p className="text-xs text-gray-400">@{u.username}</p>
                </div>
                {u.online && <div className="w-2.5 h-2.5 rounded-full bg-green-400 flex-shrink-0"/>}
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* ── FOLLOWING TAB ──────────────────────────────────────────────────── */}
      {tab === 'following' && (
        <div className="px-4 py-4 space-y-2">
          {followingQ.isLoading && <div className="flex justify-center py-10"><Loader2 className="animate-spin text-primary-500" size={28}/></div>}
          {!followingQ.isLoading && (followingQ.data?.content ?? []).length === 0 && (
            <div className="text-center py-16 text-gray-400"><Users size={36} className="mx-auto mb-2 opacity-30"/><p>Not following anyone yet</p></div>
          )}
          {(followingQ.data?.content ?? []).map((u: any) => (
            <Link key={u.id} href={`/profile/${u.id}`}>
              <div className="card p-3 flex items-center gap-3 hover:shadow-sm transition">
                <div className="w-11 h-11 rounded-full bg-primary-100 overflow-hidden flex items-center justify-center flex-shrink-0">
                  {u.profileImage ? <img src={u.profileImage} className="w-full h-full object-cover" alt=""/> : <span className="text-primary-600 font-bold">{u.name[0]}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-gray-900 truncate">{u.name}</p>
                  <p className="text-xs text-gray-400">@{u.username}</p>
                </div>
                {u.online && <div className="w-2.5 h-2.5 rounded-full bg-green-400 flex-shrink-0"/>}
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Unfollow confirmation modal */}
      {showUnfollowDlg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-base font-bold text-gray-900 mb-2">Unfollow?</h3>
            <p className="text-sm text-gray-500 mb-5">Do you want to unfollow {user.name}?</p>
            <div className="flex gap-3">
              <button onClick={() => setShowUnfollowDlg(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition">
                Cancel
              </button>
              <button onClick={doUnfollow}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition">
                Unfollow
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
