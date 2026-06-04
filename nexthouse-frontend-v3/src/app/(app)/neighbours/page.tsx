'use client';
// src/app/(app)/neighbours/page.tsx
// Like Nextdoor's "Neighbours" tab — shows people near you
import { useState, useEffect } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useInView } from 'react-intersection-observer';
import { Loader2, UserPlus, UserCheck, MessageCircle, MapPin, Shield, Users } from 'lucide-react';
import { usersApi, chatApi } from '@/api';
import { useAppSelector } from '@/store';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import type { NearbyUserResponse } from '@/types';

type Tab = 'nearby' | 'suggestions';
const RADII = [{ v: 1000, l: '1 km' }, { v: 3000, l: '3 km' }, { v: 5000, l: '5 km' }, { v: 10000, l: '10 km' }];

export default function NeighboursPage() {
  const router = useRouter();
  const qc     = useQueryClient();
  const me     = useAppSelector(s => s.auth.user);
  const [tab,    setTab]    = useState<Tab>('nearby');
  const [radius, setRadius] = useState(5000);
  const [loc,    setLoc]    = useState({ lat: 3.139, lon: 101.6869 });
  const [following, setFollowing] = useState<Record<number, boolean>>({});

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      p => {
        const lat = p.coords.latitude;
        const lon = p.coords.longitude;
        setLoc({ lat, lon });
        // Save to backend so findNearbyUsers query can find this user
        usersApi.updateLocation({ latitude: lat, longitude: lon }).catch(() => {});
      }
    );
  }, []);

  const nearbyQ = useInfiniteQuery({
    queryKey: ['users', 'nearby', loc, radius],
    queryFn:  ({ pageParam = 0 }) => usersApi.getNearby(loc.lat, loc.lon, radius, pageParam),
    getNextPageParam: (l: any) => l.hasNext ? l.page + 1 : undefined,
    initialPageParam: 0,
    enabled: tab === 'nearby',
  });

  const suggestQ = useInfiniteQuery({
    queryKey: ['users', 'suggestions'],
    queryFn:  ({ pageParam = 0 }) => usersApi.getSuggestions(pageParam),
    getNextPageParam: (l: any) => l.hasNext ? l.page + 1 : undefined,
    initialPageParam: 0,
    enabled: tab === 'suggestions',
  });

  const active = tab === 'nearby' ? nearbyQ : suggestQ;
  const rawItems = active.data?.pages.flatMap((p: any) => p.content) ?? [];
  // nearby returns NearbyUserResponse { user, distance }, suggestions returns UserSummaryDTO
  const items = rawItems.map((item: any) => item.user ?? item);

  const { ref, inView } = useInView({ threshold: 0.1 });
  useEffect(() => {
    if (inView && active.hasNextPage && !active.isFetchingNextPage) active.fetchNextPage();
  }, [inView, active.hasNextPage, active.isFetchingNextPage]);

  const handleFollow = async (userId: number) => {
    const isFollowing = following[userId];
    setFollowing(prev => ({ ...prev, [userId]: !isFollowing }));
    try {
      if (isFollowing) await usersApi.unfollow(userId);
      else { await usersApi.follow(userId); toast.success('Following!'); }
    } catch {
      setFollowing(prev => ({ ...prev, [userId]: isFollowing }));
      toast.error('Failed');
    }
  };

  const openChat = async (userId: number) => {
    try { const r = await chatApi.directRoom(userId); router.push(`/chat/${r.id}`); }
    catch { toast.error('Failed to open chat'); }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="px-4 pt-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Neighbours</h1>
        <span className="text-xs text-gray-400">{items.length} found</span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mx-4 mt-3 bg-white rounded-xl border border-gray-100 p-1">
        {(['nearby', 'suggestions'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition ${tab === t ? 'bg-primary-500 text-white' : 'text-gray-500'}`}>
            {t === 'nearby' ? '📍 Nearby' : '💡 Suggestions'}
          </button>
        ))}
      </div>

      {/* Radius filter (nearby only) */}
      {tab === 'nearby' && (
        <div className="flex gap-2 px-4 mt-3 overflow-x-auto scrollbar-hide">
          {RADII.map(({ v, l }) => (
            <button key={v} onClick={() => setRadius(v)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border flex-shrink-0 transition ${
                radius === v ? 'bg-primary-500 text-white border-primary-500' : 'border-gray-200 text-gray-600 bg-white'
              }`}>
              {l}
            </button>
          ))}
        </div>
      )}

      <div className="px-4 mt-4 space-y-2">
        {active.isLoading && (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary-500" size={28}/></div>
        )}

        {!active.isLoading && items.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <Users size={40} className="mx-auto mb-3 opacity-30"/>
            <p className="font-medium">{tab === 'nearby' ? 'No neighbours found nearby' : 'No suggestions yet'}</p>
            <p className="text-sm mt-1 text-gray-400">Try increasing the radius</p>
          </div>
        )}

        {items.map((u: any) => {
          const isFollowed = following[u.id] ?? u.isFollowing ?? false;
          const isMe = u.id === me?.id;
          if (isMe) return null;

          return (
            <div key={u.id} className="card p-4 flex items-center gap-3">
              <Link href={`/profile/${u.id}`} className="flex-shrink-0">
                <div className="w-12 h-12 rounded-full bg-primary-100 overflow-hidden flex items-center justify-center relative">
                  {u.profileImage
                    ? <img src={u.profileImage} className="w-full h-full object-cover" alt={u.name}/>
                    : <span className="text-primary-600 font-bold text-lg">{u.name[0]}</span>
                  }
                  {u.online && <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-white"/>}
                </div>
              </Link>

              <Link href={`/profile/${u.id}`} className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="font-semibold text-sm text-gray-900 truncate">{u.name}</p>
                  {u.addressVerified  && <MapPin  size={11} className="text-blue-500 flex-shrink-0"/>}
                  {u.identityVerified && <Shield  size={11} className="text-green-500 flex-shrink-0"/>}
                </div>
                <p className="text-xs text-gray-400">@{u.username}</p>
                {u.bio && <p className="text-xs text-gray-500 mt-0.5 truncate">{u.bio}</p>}
              </Link>

              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button onClick={() => openChat(u.id)}
                  className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-primary-50 hover:text-primary-600 transition">
                  <MessageCircle size={15}/>
                </button>
                <button onClick={() => handleFollow(u.id)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    isFollowed ? 'bg-gray-100 text-gray-600' : 'bg-primary-500 text-white hover:bg-primary-600'
                  }`}>
                  {isFollowed ? <UserCheck size={13}/> : <UserPlus size={13}/>}
                  {isFollowed ? 'Following' : 'Follow'}
                </button>
              </div>
            </div>
          );
        })}

        <div ref={ref} className="h-4"/>
        {active.isFetchingNextPage && <div className="flex justify-center py-4"><Loader2 className="animate-spin text-primary-400" size={22}/></div>}
      </div>
    </div>
  );
}
