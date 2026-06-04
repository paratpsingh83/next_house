'use client';
// src/app/(app)/my/listings/page.tsx
import { useState } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useInView } from 'react-intersection-observer';
import { useEffect } from 'react';
import { Loader2, ShoppingBag, PlusCircle, CheckCircle, Trash2, Eye, EyeOff } from 'lucide-react';
import { marketplaceApi } from '@/api';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

type Tab = 'active' | 'sold';

export default function MyListingsPage() {
  const router = useRouter();
  const qc     = useQueryClient();
  const [tab, setTab] = useState<Tab>('active');

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage, refetch } = useInfiniteQuery({
    queryKey: ['marketplace', 'mine', tab],
    queryFn:  ({ pageParam = 0 }) => marketplaceApi.mine(pageParam),
    getNextPageParam: l => l.hasNext ? l.page + 1 : undefined,
    initialPageParam: 0,
  });

  const allItems = data?.pages.flatMap(p => p.content) ?? [];
  const items    = tab === 'active'
    ? allItems.filter(i => i.available && i.status !== 'SOLD')
    : allItems.filter(i => !i.available || i.status === 'SOLD');

  const { ref, inView } = useInView({ threshold: 0.1 });
  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [inView, hasNextPage, isFetchingNextPage]);

  const handleMarkSold = async (id: number, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    try {
      await marketplaceApi.markSold(id);
      toast.success('Marked as sold!');
      refetch();
    } catch { toast.error('Failed'); }
  };

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (!confirm('Delete this listing?')) return;
    try {
      await marketplaceApi.delete(id);
      toast.success('Listing deleted');
      refetch();
    } catch { toast.error('Failed'); }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 h-14 flex items-center justify-between sticky top-0 z-10">
        <h1 className="font-bold text-gray-900">My Listings</h1>
        <Link href="/marketplace/create" className="btn-primary text-xs px-3 py-2 gap-1.5">
          <PlusCircle size={14}/>Add Listing
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mx-4 mt-4 bg-white rounded-xl border border-gray-100 p-1">
        {(['active','sold'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition capitalize ${
              tab === t ? 'bg-primary-500 text-white' : 'text-gray-500'
            }`}>
            {t === 'active' ? '🟢 Active' : '✅ Sold'}
          </button>
        ))}
      </div>

      <div className="px-4 mt-4 space-y-3">
        {isLoading && <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary-500" size={28}/></div>}

        {!isLoading && items.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <ShoppingBag size={40} className="mx-auto mb-3 opacity-30"/>
            <p className="font-medium">{tab === 'active' ? 'No active listings' : 'No sold items yet'}</p>
            {tab === 'active' && (
              <Link href="/marketplace/create" className="btn-primary inline-flex mt-4 text-sm gap-1.5">
                <PlusCircle size={14}/>Create your first listing
              </Link>
            )}
          </div>
        )}

        {items.map(item => (
          <Link key={item.id} href={`/marketplace/${item.id}`}>
            <div className="card p-3 flex items-center gap-3 hover:shadow-md transition">
              {/* Thumbnail */}
              <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0 relative">
                {item.thumbnailUrl
                  ? <img src={item.thumbnailUrl} className="w-full h-full object-cover" alt={item.title}/>
                  : <div className="w-full h-full flex items-center justify-center"><ShoppingBag size={24} className="text-gray-300"/></div>
                }
                {(!item.available || item.status === 'SOLD') && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <span className="text-white font-bold text-[9px]">SOLD</span>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-gray-900 truncate">{item.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {item.price != null
                    ? <p className="text-primary-600 font-bold text-sm">RM {Number(item.price).toFixed(2)}</p>
                    : <p className="text-green-600 font-bold text-sm">Free</p>
                  }
                  {item.negotiable && <span className="text-xs text-blue-400">nego</span>}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  {item.category && `${item.category} · `}
                  {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                </p>
                <div className="flex items-center gap-1.5 mt-1.5">
                  {item.available && item.status !== 'SOLD' && (
                    <button onClick={e => handleMarkSold(item.id, e)}
                      className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition">
                      <CheckCircle size={10}/>Mark Sold
                    </button>
                  )}
                  <button onClick={e => handleDelete(item.id, e)}
                    className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition">
                    <Trash2 size={10}/>Delete
                  </button>
                </div>
              </div>
            </div>
          </Link>
        ))}

        <div ref={ref} className="h-4"/>
        {isFetchingNextPage && (
          <div className="flex justify-center py-4"><Loader2 className="animate-spin text-primary-400" size={22}/></div>
        )}
      </div>
    </div>
  );
}
