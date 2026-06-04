'use client';
// src/app/(app)/search/page.tsx
import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Loader2, Users, FileText, Zap, Building2, ShoppingBag, X, TrendingUp, ArrowRight } from 'lucide-react';
import { searchApi } from '@/api';
import Link from 'next/link';
import type { UserSummaryDTO, PostResponse, CommunityResponse, ActivityResponse, MarketplaceItemResponse } from '@/types';

type Filter = 'all' | 'users' | 'posts' | 'communities' | 'activities' | 'marketplace';

const FILTERS: { id: Filter; label: string; icon: typeof Users }[] = [
  { id: 'all',         label: 'All',          icon: Search     },
  { id: 'users',       label: 'People',        icon: Users      },
  { id: 'posts',       label: 'Posts',         icon: FileText   },
  { id: 'communities', label: 'Communities',   icon: Building2  },
  { id: 'activities',  label: 'Activities',    icon: Zap        },
  { id: 'marketplace', label: 'Marketplace',   icon: ShoppingBag},
];

export default function SearchPage() {
  const [q,      setQ]      = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['search', q],
    queryFn:  () => searchApi.global(q),
    enabled:  q.trim().length >= 2,
    staleTime: 30000,
  });

  const { data: trending } = useQuery({
    queryKey: ['search', 'trending'],
    queryFn:  () => searchApi.trending(),
    staleTime: 5 * 60 * 1000,
  });

  const hasResults = data && (
    (data.users?.content?.length ?? 0) +
    (data.posts?.content?.length ?? 0) +
    (data.communities?.content?.length ?? 0) +
    (data.activities?.content?.length ?? 0) +
    (data.marketplaceItems?.content?.length ?? 0)
  ) > 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Search header ─────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-100 px-4 pt-3 pb-3 sticky top-0 z-10">
        <div className="relative">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"/>
          <input
            ref={inputRef}
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search people, posts, groups…"
            className="input pl-10 pr-10 text-sm"
          />
          {q && (
            <button onClick={() => setQ('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X size={16}/>
            </button>
          )}
          {isFetching && q.length >= 2 && (
            <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-primary-500"/>
          )}
        </div>

        {/* Filter chips */}
        {q.length >= 2 && (
          <div className="flex gap-2 mt-2 overflow-x-auto scrollbar-hide -mx-1 px-1">
            {FILTERS.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setFilter(id)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border flex-shrink-0 transition ${
                  filter === id
                    ? 'bg-primary-500 text-white border-primary-500'
                    : 'border-gray-200 text-gray-600 bg-white'
                }`}>
                <Icon size={11}/>{label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="px-4 py-4 space-y-5">

        {/* ── Empty state: trending keywords ───────────────────────────────── */}
        {q.length < 2 && (
          <>
            <div>
              <p className="section-title flex items-center gap-1.5"><TrendingUp size={12}/>Trending</p>
              <div className="flex flex-wrap gap-2">
                {(trending ?? []).slice(0, 12).map((t: string) => (
                  <button key={t} onClick={() => setQ(t)}
                    className="px-3 py-1.5 rounded-full border border-gray-200 text-sm text-gray-700 hover:border-primary-300 hover:text-primary-600 transition bg-white">
                    #{t}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="section-title">Quick Links</p>
              <div className="space-y-2">
                {[
                  { href:'/communities', label:'Browse Communities', sub:'Find groups near you', icon:Building2 },
                  { href:'/activities',  label:'Nearby Activities',  sub:'What\'s happening nearby', icon:Zap },
                  { href:'/marketplace', label:'Marketplace',        sub:'Buy & sell locally',  icon:ShoppingBag },
                ].map(({ href, label, sub, icon: Icon }) => (
                  <Link key={href} href={href}>
                    <div className="card p-3 flex items-center gap-3 hover:shadow-sm transition">
                      <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
                        <Icon size={18} className="text-primary-600"/>
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-sm text-gray-900">{label}</p>
                        <p className="text-xs text-gray-400">{sub}</p>
                      </div>
                      <ArrowRight size={16} className="text-gray-300"/>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ── Loading ───────────────────────────────────────────────────────── */}
        {q.length >= 2 && isLoading && (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin text-primary-500" size={28}/>
          </div>
        )}

        {/* ── No results ────────────────────────────────────────────────────── */}
        {q.length >= 2 && !isLoading && !hasResults && (
          <div className="text-center py-16 text-gray-400">
            <Search size={40} className="mx-auto mb-3 opacity-30"/>
            <p className="font-medium">No results for "{q}"</p>
            <p className="text-sm mt-1">Try different keywords</p>
          </div>
        )}

        {/* ── Results ───────────────────────────────────────────────────────── */}
        {data && (

          <>
            {/* PEOPLE */}
            {(filter === 'all' || filter === 'users') &&
             (data.users?.content?.length ?? 0) > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="section-title flex items-center gap-1.5"><Users size={12}/>People</p>
                  {filter === 'all' && (data.users?.totalElements ?? 0) > 5 && (
                    <button onClick={() => setFilter('users')} className="text-xs text-primary-500">See all</button>
                  )}
                </div>
                <div className="space-y-2">
                  {(data.users?.content ?? []).slice(0, filter === 'all' ? 5 : 20).map((u: UserSummaryDTO) => (
                    <Link key={u.id} href={`/profile/${u.id}`}>
                      <div className="card p-3 flex items-center gap-3 hover:shadow-sm transition">
                        <div className="w-11 h-11 rounded-full bg-primary-100 overflow-hidden flex items-center justify-center flex-shrink-0">
                          {u.profileImage
                            ? <img src={u.profileImage} className="w-full h-full object-cover" alt=""/>
                            : <span className="text-primary-600 font-bold">{u.name[0]}</span>
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-sm text-gray-900 truncate">{u.name}</p>
                            {u.online && <div className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0"/>}
                          </div>
                          <p className="text-xs text-gray-400">@{u.username}</p>
                        </div>
                        {u.trustScore !== undefined && (
                          <span className="text-xs text-gray-400">{u.trustScore} pts</span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* POSTS */}
            {(filter === 'all' || filter === 'posts') &&
             (data.posts?.content?.length ?? 0) > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="section-title flex items-center gap-1.5"><FileText size={12}/>Posts</p>
                  {filter === 'all' && (data.posts?.totalElements ?? 0) > 3 && (
                    <button onClick={() => setFilter('posts')} className="text-xs text-primary-500">See all</button>
                  )}
                </div>
                <div className="space-y-2">
                  {(data.posts?.content ?? []).slice(0, filter === 'all' ? 3 : 20).map((p: PostResponse) => (
                    <Link key={p.id} href={`/posts/${p.id}`}>
                      <div className="card p-3 hover:shadow-sm transition">
                        <p className="text-sm text-gray-700 line-clamp-2 leading-relaxed">{p.content}</p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                          <span>by {p.createdBy?.name ?? 'Anonymous'}</span>
                          {p.likeCount  !== undefined && <span>❤️ {p.likeCount}</span>}
                          {p.commentCount !== undefined && <span>💬 {p.commentCount}</span>}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* COMMUNITIES */}
            {(filter === 'all' || filter === 'communities') &&
             (data.communities?.content?.length ?? 0) > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="section-title flex items-center gap-1.5"><Building2 size={12}/>Communities</p>
                  {filter === 'all' && (data.communities?.totalElements ?? 0) > 3 && (
                    <button onClick={() => setFilter('communities')} className="text-xs text-primary-500">See all</button>
                  )}
                </div>
                <div className="space-y-2">
                  {(data.communities?.content ?? []).slice(0, filter === 'all' ? 3 : 20).map((c: CommunityResponse) => (
                    <Link key={c.id} href={`/communities/${c.id}`}>
                      <div className="card p-3 flex items-center gap-3 hover:shadow-sm transition">
                        <div className="w-11 h-11 rounded-xl bg-primary-100 overflow-hidden flex items-center justify-center flex-shrink-0">
                          {c.iconImage
                            ? <img src={c.iconImage} className="w-full h-full object-cover rounded-xl" alt=""/>
                            : <span className="text-primary-600 font-bold text-lg">{c.name[0]}</span>
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-gray-900 truncate">{c.name}</p>
                          <p className="text-xs text-gray-400">{c.memberCount ?? 0} members · {c.communityType}</p>
                        </div>
                        <ArrowRight size={14} className="text-gray-300 flex-shrink-0"/>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* ACTIVITIES */}
            {(filter === 'all' || filter === 'activities') &&
             (data.activities?.content?.length ?? 0) > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="section-title flex items-center gap-1.5"><Zap size={12}/>Activities</p>
                  {filter === 'all' && (data.activities?.totalElements ?? 0) > 3 && (
                    <button onClick={() => setFilter('activities')} className="text-xs text-primary-500">See all</button>
                  )}
                </div>
                <div className="space-y-2">
                  {(data.activities?.content ?? []).slice(0, filter === 'all' ? 3 : 20).map((a: ActivityResponse) => (
                    <Link key={a.id} href={`/activities/${a.id}`}>
                      <div className="card p-3 hover:shadow-sm transition">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="badge bg-primary-50 text-primary-600 text-xs">{a.activityType}</span>
                          <span className="text-xs text-gray-400">{a.currentMemberCount} attending</span>
                        </div>
                        <p className="font-semibold text-sm text-gray-900">{a.title}</p>
                        {a.address && <p className="text-xs text-gray-400 mt-1">📍 {a.address}</p>}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* MARKETPLACE */}
            {(filter === 'all' || filter === 'marketplace') &&
             (data.marketplaceItems?.content?.length ?? 0) > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="section-title flex items-center gap-1.5"><ShoppingBag size={12}/>Marketplace</p>
                  {filter === 'all' && (data.marketplaceItems?.totalElements ?? 0) > 4 && (
                    <button onClick={() => setFilter('marketplace')} className="text-xs text-primary-500">See all</button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {(data.marketplaceItems?.content ?? []).slice(0, filter === 'all' ? 4 : 20).map((item: MarketplaceItemResponse) => (
                    <Link key={item.id} href={`/marketplace/${item.id}`}>
                      <div className="card overflow-hidden hover:shadow-sm transition">
                        <div className="aspect-square bg-gray-100 overflow-hidden">
                          {item.thumbnailUrl
                            ? <img src={item.thumbnailUrl} className="w-full h-full object-cover" alt={item.title} loading="lazy"/>
                            : <div className="w-full h-full flex items-center justify-center"><ShoppingBag size={24} className="text-gray-200"/></div>
                          }
                        </div>
                        <div className="p-2">
                          <p className="font-semibold text-xs text-gray-900 truncate">{item.title}</p>
                          {item.price != null
                            ? <p className="text-primary-600 font-bold text-xs">RM {Number(item.price).toFixed(2)}</p>
                            : <p className="text-green-600 font-bold text-xs">Free</p>
                          }
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
