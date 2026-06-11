'use client';
// src/app/(app)/communities/[id]/page.tsx
import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useInView } from 'react-intersection-observer';
import { useEffect } from 'react';
import {
  ArrowLeft, Users, Lock, Globe, CheckCircle,
  Loader2, Settings, LogOut, UserCheck, UserPlus,
  FileText, Shield, Crown, Bell, X, ArrowRightLeft,
} from 'lucide-react';
import { communitiesApi, postsApi } from '@/api';
import { useAppSelector } from '@/store';
import PostCard from '@/components/post/PostCard';
import CreatePostModal from '@/components/post/CreatePostModal';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import type { UserSummaryDTO } from '@/types';

type Tab = 'posts' | 'members' | 'about';

const ROLE_COLORS: Record<string, string> = {
  OWNER:     'bg-yellow-50 text-yellow-700',
  ADMIN:     'bg-blue-50 text-blue-700',
  MODERATOR: 'bg-purple-50 text-purple-700',
  MEMBER:    'bg-gray-100 text-gray-600',
};

export default function CommunityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();
  const qc      = useQueryClient();
  const me      = useAppSelector(s => s.auth.user);
  const [tab, setTab]                   = useState<Tab>('posts');
  const [showCreate, setCreate]         = useState(false);
  const [joining, setJoining]           = useState(false);
  const [deleting, setDeleting]         = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [selectedNewOwner, setSelectedNewOwner] = useState<UserSummaryDTO | null>(null);
  const [loc, setLoc] = useState({ lat: 3.139, lon: 101.6869 });
  const communityId = Number(id);

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      p => setLoc({ lat: p.coords.latitude, lon: p.coords.longitude })
    );
  }, []);

  // ── Community data ────────────────────────────────────────────────────────
  const { data: community, isLoading: loadingCommunity, refetch: refetchCommunity } = useQuery({
    queryKey: ['community', communityId],
    queryFn:  () => communitiesApi.get(communityId),
  });

  // ── Posts feed ────────────────────────────────────────────────────────────
  const {
    data: postsData,
    isLoading: loadingPosts,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch: refetchPosts,
  } = useInfiniteQuery({
    queryKey: ['community-posts', communityId],
    queryFn:  ({ pageParam = 0 }) => postsApi.communityFeed(communityId, pageParam),
    getNextPageParam: l => (l.hasNext ? l.page + 1 : undefined),
    initialPageParam: 0,
    enabled: tab === 'posts',
  });
  const posts = postsData?.pages.flatMap(p => p.content) ?? [];

  const { ref: postsEndRef, inView } = useInView({ threshold: 0.1 });
  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [inView, hasNextPage, isFetchingNextPage]);

  // ── Members ───────────────────────────────────────────────────────────────
  const { data: membersData, isLoading: loadingMembers } = useQuery({
    queryKey: ['community-members', communityId],
    queryFn:  () => communitiesApi.getMembers(communityId, undefined, 0, 50),
    enabled:  tab === 'members' || showTransfer,
  });
  const members = membersData?.content ?? [];

  // ── Join / Leave ──────────────────────────────────────────────────────────
  const handleJoin = async () => {
    setJoining(true);
    try {
      await communitiesApi.join(communityId);
      toast.success(community?.privateCommunity ? 'Join request sent!' : 'Joined successfully!');
      refetchCommunity();
      qc.invalidateQueries({ queryKey: ['communities', 'mine'] });
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to join');
    } finally { setJoining(false); }
  };

  const handleLeave = async () => {
    if (!confirm('Leave this community?')) return;
    setJoining(true);
    try {
      await communitiesApi.leave(communityId);
      toast.success('Left community');
      refetchCommunity();
      qc.invalidateQueries({ queryKey: ['communities', 'mine'] });
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to leave');
    } finally { setJoining(false); }
  };

  // ── Delete community ──────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!confirm('Delete this community? This cannot be undone.')) return;
    setDeleting(true);
    try {
      await communitiesApi.delete(communityId);
      toast.success('Community deleted');
      router.replace('/communities');
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to delete');
    } finally { setDeleting(false); }
  };

  // ── Transfer ownership ────────────────────────────────────────────────────
  const handleTransfer = async () => {
    if (!selectedNewOwner) return;
    if (!confirm(`Transfer ownership to ${selectedNewOwner.name}? You will become a regular member.`)) return;
    setTransferring(true);
    try {
      await communitiesApi.transferOwnership(communityId, selectedNewOwner.id);
      toast.success(`Ownership transferred to ${selectedNewOwner.name}`);
      setShowTransfer(false);
      setSelectedNewOwner(null);
      refetchCommunity();
      qc.invalidateQueries({ queryKey: ['community-members', communityId] });
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Transfer failed');
    } finally { setTransferring(false); }
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loadingCommunity) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="animate-spin text-primary-500" size={32} />
      </div>
    );
  }

  if (!community) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-400">Community not found</p>
        <button onClick={() => router.back()} className="btn-primary mt-4">Go back</button>
      </div>
    );
  }

  const isOwner   = community.myRole === 'OWNER';
  const isAdmin   = community.myRole === 'ADMIN' || isOwner;
  const isMember  = community.isMember;
  const isPending = community.isPending;

  // Members eligible to receive ownership (excludes current owner)
  const transferCandidates = members.filter(m => m.id !== me?.id);

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Cover image + header ─────────────────────────────────────────── */}
      <div className="relative">
        <div className="h-36 bg-gradient-to-br from-primary-400 to-teal-500 relative overflow-hidden">
          {community.coverImage && (
            <img src={community.coverImage} className="w-full h-full object-cover" alt="" />
          )}
          <button
            onClick={() => router.back()}
            className="absolute top-4 left-4 w-9 h-9 bg-black/30 backdrop-blur-sm rounded-full flex items-center justify-center text-white"
          >
            <ArrowLeft size={18} />
          </button>
          {isAdmin && (
            <Link
              href={`/communities/${communityId}/settings`}
              className="absolute top-4 right-4 w-9 h-9 bg-black/30 backdrop-blur-sm rounded-full flex items-center justify-center text-white"
            >
              <Settings size={18} />
            </Link>
          )}
        </div>

        <div className="absolute left-4 -bottom-8">
          <div className="w-16 h-16 rounded-2xl bg-white shadow-lg overflow-hidden border-2 border-white flex items-center justify-center">
            {community.iconImage
              ? <img src={community.iconImage} className="w-full h-full object-cover" alt={community.name} />
              : <span className="text-primary-600 font-bold text-2xl">{community.name[0]}</span>
            }
          </div>
        </div>
      </div>

      {/* ── Community info ─────────────────────────────────────────────────── */}
      <div className="pt-12 px-4 pb-4 bg-white border-b border-gray-100">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-gray-900">{community.name}</h1>
              {community.verified && (
                <CheckCircle size={18} className="text-primary-500 flex-shrink-0" />
              )}
              {community.privateCommunity
                ? <span className="badge bg-gray-100 text-gray-600 gap-1"><Lock size={10} />Private</span>
                : <span className="badge bg-green-50 text-green-600 gap-1"><Globe size={10} />Public</span>
              }
              {isOwner && (
                <span className="badge bg-yellow-50 text-yellow-700 gap-1"><Crown size={10} />Owner</span>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              {community.communityType} · {community.memberCount} members
            </p>
            {community.description && (
              <p className="text-sm text-gray-700 mt-2 leading-relaxed">{community.description}</p>
            )}
            {community.neighborhood && (
              <p className="text-xs text-gray-400 mt-1">📍 {community.neighborhood.name}</p>
            )}
          </div>
        </div>

        {/* ── Action buttons ─────────────────────────────────────────────── */}
        <div className="flex gap-2 mt-4">
          {!isMember && !isPending && (
            <button
              onClick={handleJoin}
              disabled={joining}
              className="btn-primary flex-1 py-2.5 gap-2"
            >
              {joining ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
              {community.privateCommunity ? 'Request to Join' : 'Join Community'}
            </button>
          )}

          {isPending && (
            <button disabled className="flex-1 py-2.5 rounded-xl border-2 border-gray-200 text-gray-400 text-sm font-semibold flex items-center justify-center gap-2">
              <Loader2 size={16} />
              Request Pending
            </button>
          )}

          {/* Non-owner members can leave */}
          {isMember && !isOwner && (
            <button
              onClick={handleLeave}
              disabled={joining}
              className="flex-1 py-2.5 rounded-xl border-2 border-gray-200 text-gray-600 hover:border-red-300 hover:text-red-500 text-sm font-semibold flex items-center justify-center gap-2 transition"
            >
              <LogOut size={16} />
              Leave
            </button>
          )}

          {/* Owner sees Transfer Ownership instead of Leave */}
          {isOwner && (
            <button
              onClick={() => setShowTransfer(true)}
              className="flex-1 py-2.5 rounded-xl border-2 border-yellow-200 text-yellow-700 hover:bg-yellow-50 text-sm font-semibold flex items-center justify-center gap-2 transition"
            >
              <ArrowRightLeft size={16} />
              Transfer Ownership
            </button>
          )}

          {isMember && (
            <button className="w-11 h-11 rounded-xl border-2 border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition">
              <Bell size={18} />
            </button>
          )}
        </div>
      </div>

      {/* ── Tabs ──────────────────────────────────────────────────────────── */}
      <div className="flex bg-white border-b border-gray-100 sticky top-14 z-30">
        {([
          ['posts',   'Posts',   FileText],
          ['members', 'Members', Users],
          ['about',   'About',   Globe],
        ] as const).map(([id, label, Icon]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 flex flex-col items-center py-3 gap-0.5 text-xs font-semibold border-b-2 transition ${
              tab === id
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            <Icon size={18} />
            {label}
          </button>
        ))}
      </div>

      {/* ── Tab content ───────────────────────────────────────────────────── */}

      {/* POSTS TAB */}
      {tab === 'posts' && (
        <div className="px-4 py-4 space-y-4">
          {isMember && me && (
            <button
              onClick={() => setCreate(true)}
              className="w-full card p-4 flex items-center gap-3 text-left hover:bg-gray-50 transition"
            >
              <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                {me.profileImage
                  ? <img src={me.profileImage} className="w-full h-full rounded-full object-cover" alt="" />
                  : <span className="text-primary-600 font-bold text-sm">{me.name[0]}</span>
                }
              </div>
              <span className="text-gray-400 text-sm">Share something with {community.name}…</span>
            </button>
          )}

          {loadingPosts && (
            <div className="flex justify-center py-10">
              <Loader2 className="animate-spin text-primary-500" size={28} />
            </div>
          )}

          {!loadingPosts && posts.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <FileText size={40} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium">No posts yet</p>
              {isMember && <p className="text-sm mt-1">Be the first to post!</p>}
            </div>
          )}

          <div className="space-y-3">
            {posts.map(post => <PostCard key={post.id} post={post} />)}
          </div>

          <div ref={postsEndRef} className="h-4" />
          {isFetchingNextPage && (
            <div className="flex justify-center py-4">
              <Loader2 className="animate-spin text-primary-400" size={20} />
            </div>
          )}
        </div>
      )}

      {/* MEMBERS TAB */}
      {tab === 'members' && (
        <div className="px-4 py-4 space-y-2">
          {loadingMembers && (
            <div className="flex justify-center py-10">
              <Loader2 className="animate-spin text-primary-500" size={28} />
            </div>
          )}

          {!loadingMembers && members.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <Users size={40} className="mx-auto mb-3 opacity-30" />
              <p>No members found</p>
            </div>
          )}

          {members.map(member => (
            <Link key={member.id} href={`/profile/${member.id}`}>
              <div className="card p-3 flex items-center gap-3 hover:shadow-sm transition">
                <div className="w-11 h-11 rounded-full bg-primary-100 overflow-hidden flex items-center justify-center flex-shrink-0">
                  {member.profileImage
                    ? <img src={member.profileImage} className="w-full h-full object-cover" alt={member.name} />
                    : <span className="text-primary-600 font-bold">{member.name[0]}</span>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm text-gray-900 truncate">{member.name}</p>
                    {member.online && <div className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />}
                  </div>
                  <p className="text-xs text-gray-400">@{member.username}</p>
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <Shield size={11} />
                  {member.trustScore ?? 0}
                </div>
              </div>
            </Link>
          ))}

          {isAdmin && (
            <div className="mt-6">
              <p className="section-title">Admin Actions</p>
              <Link href={`/communities/${communityId}/requests`}>
                <div className="card p-4 flex items-center justify-between hover:shadow-sm transition">
                  <div className="flex items-center gap-3">
                    <UserCheck size={20} className="text-primary-500" />
                    <div>
                      <p className="font-semibold text-sm text-gray-900">Pending Requests</p>
                      <p className="text-xs text-gray-400">Review join requests</p>
                    </div>
                  </div>
                  <ArrowLeft size={16} className="rotate-180 text-gray-300" />
                </div>
              </Link>
            </div>
          )}
        </div>
      )}

      {/* ABOUT TAB */}
      {tab === 'about' && (
        <div className="px-4 py-4 space-y-4">
          <div className="card p-5 space-y-4">
            <h3 className="font-bold text-gray-900">About {community.name}</h3>

            {community.description && (
              <p className="text-sm text-gray-700 leading-relaxed">{community.description}</p>
            )}

            <div className="space-y-3 pt-2 border-t border-gray-50">
              <div className="flex items-center gap-3 text-sm">
                <Users size={16} className="text-gray-400 flex-shrink-0" />
                <span className="text-gray-600"><strong>{community.memberCount}</strong> members</span>
              </div>

              <div className="flex items-center gap-3 text-sm">
                {community.privateCommunity
                  ? <><Lock size={16} className="text-gray-400 flex-shrink-0" /><span className="text-gray-600"><strong>Private</strong> — members only</span></>
                  : <><Globe size={16} className="text-gray-400 flex-shrink-0" /><span className="text-gray-600"><strong>Public</strong> — anyone can join</span></>
                }
              </div>

              {community.communityType && (
                <div className="flex items-center gap-3 text-sm">
                  <FileText size={16} className="text-gray-400 flex-shrink-0" />
                  <span className="text-gray-600">Type: <strong>{community.communityType}</strong></span>
                </div>
              )}

              {community.neighborhood && (
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-gray-400 text-base flex-shrink-0">📍</span>
                  <span className="text-gray-600">{community.neighborhood.name}</span>
                </div>
              )}

              {community.createdBy && (
                <div className="flex items-center gap-3 text-sm">
                  <Crown size={16} className="text-yellow-500 flex-shrink-0" />
                  <span className="text-gray-600">
                    Created by{' '}
                    <Link href={`/profile/${community.createdBy.id}`} className="font-semibold text-primary-600 hover:underline">
                      {community.createdBy.name}
                    </Link>
                  </span>
                </div>
              )}

              <div className="flex items-center gap-3 text-sm">
                <span className="text-gray-400 text-base flex-shrink-0">🕐</span>
                <span className="text-gray-600">
                  Created {formatDistanceToNow(new Date(community.createdAt), { addSuffix: true })}
                </span>
              </div>
            </div>
          </div>

          {community.parentCommunity && (
            <div className="card p-4">
              <p className="section-title">Parent Community</p>
              <Link href={`/communities/${community.parentCommunity.id}`} className="flex items-center gap-3 mt-2">
                <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center">
                  {community.parentCommunity.iconImage
                    ? <img src={community.parentCommunity.iconImage} className="w-full h-full rounded-xl object-cover" alt="" />
                    : <span className="text-primary-600 font-bold">{community.parentCommunity.name[0]}</span>
                  }
                </div>
                <span className="font-semibold text-gray-900">{community.parentCommunity.name}</span>
              </Link>
            </div>
          )}

          {/* Danger zone — OWNER only */}
          {isOwner && (
            <div className="card p-4 border border-red-100 space-y-3">
              <p className="section-title text-red-500">Danger Zone</p>

              <button
                onClick={() => setShowTransfer(true)}
                className="w-full py-2.5 rounded-xl border-2 border-yellow-200 text-yellow-700 hover:bg-yellow-50 text-sm font-semibold flex items-center justify-center gap-2 transition"
              >
                <ArrowRightLeft size={16} />
                Transfer Ownership
              </button>

              <button
                onClick={handleDelete}
                disabled={deleting}
                className="btn-danger w-full py-2.5 text-sm flex items-center justify-center gap-2"
              >
                {deleting ? <Loader2 size={16} className="animate-spin" /> : null}
                Delete Community
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Transfer Ownership Modal ───────────────────────────────────────── */}
      {showTransfer && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[80vh]">
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <ArrowRightLeft size={18} className="text-yellow-600" />
                <h2 className="font-bold text-gray-900">Transfer Ownership</h2>
              </div>
              <button
                onClick={() => { setShowTransfer(false); setSelectedNewOwner(null); }}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200"
              >
                <X size={16} />
              </button>
            </div>

            <p className="px-5 pt-3 pb-1 text-xs text-gray-500">
              Select a member to become the new owner. You will be demoted to Member.
            </p>

            {/* Member list */}
            <div className="overflow-y-auto flex-1 px-4 py-2 space-y-1">
              {loadingMembers && (
                <div className="flex justify-center py-8">
                  <Loader2 className="animate-spin text-primary-400" size={24} />
                </div>
              )}
              {transferCandidates.length === 0 && !loadingMembers && (
                <div className="text-center py-8 text-gray-400 text-sm">
                  No other members to transfer to.
                </div>
              )}
              {transferCandidates.map(member => (
                <button
                  key={member.id}
                  onClick={() => setSelectedNewOwner(member)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition text-left ${
                    selectedNewOwner?.id === member.id
                      ? 'border-yellow-400 bg-yellow-50'
                      : 'border-transparent hover:bg-gray-50'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-primary-100 overflow-hidden flex items-center justify-center flex-shrink-0">
                    {member.profileImage
                      ? <img src={member.profileImage} className="w-full h-full object-cover" alt={member.name} />
                      : <span className="text-primary-600 font-bold text-sm">{member.name[0]}</span>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-900 truncate">{member.name}</p>
                    <p className="text-xs text-gray-400">@{member.username}</p>
                  </div>
                  {selectedNewOwner?.id === member.id && (
                    <Crown size={16} className="text-yellow-500 flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>

            {/* Confirm button */}
            <div className="px-5 py-4 border-t border-gray-100">
              <button
                onClick={handleTransfer}
                disabled={!selectedNewOwner || transferring}
                className="btn-primary w-full py-3 text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {transferring
                  ? <><Loader2 size={16} className="animate-spin" /> Transferring…</>
                  : <><Crown size={16} /> Transfer to {selectedNewOwner?.name ?? '…'}</>
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create post modal */}
      {showCreate && me && (
        <CreatePostModal
          user={me}
          lat={loc.lat}
          lon={loc.lon}
          communityId={communityId}
          onClose={() => setCreate(false)}
          onCreated={() => { setCreate(false); refetchPosts(); }}
        />
      )}
    </div>
  );
}