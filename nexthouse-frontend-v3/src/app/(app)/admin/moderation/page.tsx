'use client';
import { useState } from 'react';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi, type ModerationQueueItem } from '@/api';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { formatDistanceToNow } from 'date-fns';

const CONTENT_TYPES = ['', 'POST', 'COMMENT', 'MARKETPLACE', 'ACTIVITY', 'SAFETY_ALERT'];

export default function AdminModerationPage() {
  const qc = useQueryClient();
  const [typeFilter, setTypeFilter] = useState('');

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage, refetch } = useInfiniteQuery({
    queryKey: ['admin', 'moderation', typeFilter],
    queryFn:  ({ pageParam = 0 }) => adminApi.getModerationQueue(typeFilter || undefined, pageParam),
    getNextPageParam: l => l.hasNext ? l.page + 1 : undefined,
    initialPageParam: 0,
  });

  const approveMut = useMutation({
    mutationFn: (id: number) => adminApi.approveContent(id),
    onSuccess:  () => { refetch(); toast.success('Content approved'); },
    onError:    () => toast.error('Failed'),
  });

  const blockMut = useMutation({
    mutationFn: (id: number) => adminApi.blockContent(id),
    onSuccess:  () => { refetch(); toast.success('Content blocked and removed'); },
    onError:    () => toast.error('Failed'),
  });

  const items = data?.pages.flatMap(p => p.content) ?? [];
  const { ref } = useInfiniteScroll(fetchNextPage, hasNextPage, isFetchingNextPage);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Moderation Queue</h1>
        <span className="text-sm text-gray-400">{data?.pages[0]?.totalElements ?? 0} pending</span>
      </div>

      {/* Type filter */}
      <div className="card p-3 flex flex-wrap gap-2">
        {CONTENT_TYPES.map(t => (
          <button
            key={t || 'all'}
            onClick={() => setTypeFilter(t)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
              typeFilter === t ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200 text-gray-600'
            }`}
          >
            {t || 'All Types'}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-primary-500" size={28}/></div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <CheckCircle size={40} className="mx-auto mb-3 opacity-30 text-green-500"/>
          <p className="font-medium text-green-600">Queue is empty!</p>
          <p className="text-sm mt-1">No content pending review</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item: ModerationQueueItem) => (
            <div key={item.id} className="card p-4 space-y-3">
              <div className="flex items-start gap-3">
                <span className={`badge text-xs flex-shrink-0 ${
                  item.contentType === 'POST'          ? 'bg-blue-50 text-blue-600'   :
                  item.contentType === 'SAFETY_ALERT'  ? 'bg-red-50 text-red-600'    :
                  item.contentType === 'MARKETPLACE'   ? 'bg-green-50 text-green-600' :
                  'bg-gray-100 text-gray-600'
                }`}>{item.contentType}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 leading-relaxed">
                    {item.contentPreview ?? `Content #${item.contentId}`}
                  </p>
                  <div className="flex flex-wrap gap-x-3 text-xs text-gray-400 mt-1">
                    {item.reportedBy && <span>Reported by {item.reportedBy.name}</span>}
                    <span>{formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => approveMut.mutate(item.id)}
                  disabled={approveMut.isPending}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-green-300 text-green-700 hover:bg-green-50 transition text-sm font-semibold"
                >
                  <CheckCircle size={14}/>Approve
                </button>
                <button
                  onClick={() => blockMut.mutate(item.id)}
                  disabled={blockMut.isPending}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-red-300 text-red-600 hover:bg-red-50 transition text-sm font-semibold"
                >
                  <XCircle size={14}/>Block & Remove
                </button>
              </div>
            </div>
          ))}
          <div ref={ref} className="h-4"/>
          {isFetchingNextPage && <div className="flex justify-center py-4"><Loader2 className="animate-spin text-primary-400" size={22}/></div>}
        </div>
      )}
    </div>
  );
}