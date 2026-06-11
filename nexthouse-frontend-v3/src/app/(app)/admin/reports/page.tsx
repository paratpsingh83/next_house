'use client';
import { useState } from 'react';
import { useInfiniteQuery, useMutation } from '@tanstack/react-query';
import { adminApi, type ReportItem } from '@/api';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { formatDistanceToNow } from 'date-fns';

const STATUS_OPTIONS = ['', 'PENDING', 'REVIEWED', 'ACTION_TAKEN', 'DISMISSED'];
const ENTITY_TYPES   = ['', 'POST', 'COMMENT', 'USER', 'SAFETY_ALERT', 'MARKETPLACE'];

export default function AdminReportsPage() {
  const [status,     setStatus]     = useState('PENDING');
  const [entityType, setEntityType] = useState('');

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage, refetch } = useInfiniteQuery({
    queryKey: ['admin', 'reports', status, entityType],
    queryFn:  ({ pageParam = 0 }) => adminApi.getReports(status || undefined, entityType || undefined, pageParam),
    getNextPageParam: l => l.hasNext ? l.page + 1 : undefined,
    initialPageParam: 0,
  });

  const reviewMut = useMutation({
    mutationFn: ({ id, decision }: { id: number; decision: string }) => adminApi.reviewReport(id, decision),
    onSuccess:  () => { refetch(); toast.success('Report reviewed'); },
    onError:    () => toast.error('Failed'),
  });

  const items = data?.pages.flatMap(p => p.content) ?? [];
  const { ref } = useInfiniteScroll(fetchNextPage, hasNextPage, isFetchingNextPage);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Reports</h1>
        <span className="text-sm text-gray-400">{data?.pages[0]?.totalElements ?? 0} total</span>
      </div>

      {/* Status filter */}
      <div className="card p-3 space-y-2">
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.map(s => (
            <button key={s || 'all'}
              onClick={() => setStatus(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                status === s ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200 text-gray-600'
              }`}
            >
              {s || 'All Status'}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {ENTITY_TYPES.map(e => (
            <button key={e || 'all'}
              onClick={() => setEntityType(e)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                entityType === e ? 'bg-primary-500 text-white border-primary-500' : 'border-gray-200 text-gray-600'
              }`}
            >
              {e || 'All Types'}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-primary-500" size={28}/></div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <CheckCircle size={40} className="mx-auto mb-3 opacity-30 text-green-500"/>
          <p className="font-medium">No reports</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((r: ReportItem) => (
            <div key={r.id} className="card p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="badge bg-gray-100 text-gray-700 text-xs">{r.entityType} #{r.entityId}</span>
                    <span className={`badge text-xs ${
                      r.status === 'PENDING'      ? 'bg-yellow-50 text-yellow-700' :
                      r.status === 'ACTION_TAKEN' ? 'bg-green-50 text-green-600'  :
                      r.status === 'DISMISSED'    ? 'bg-gray-100 text-gray-500'   :
                      'bg-blue-50 text-blue-600'
                    }`}>{r.status}</span>
                  </div>
                  <p className="text-sm font-semibold text-gray-800">Reason: {r.reason}</p>
                  {r.description && <p className="text-sm text-gray-600 mt-1">{r.description}</p>}
                  <div className="flex flex-wrap gap-x-3 text-xs text-gray-400 mt-1">
                    {r.reporter && <span>by {r.reporter.name}</span>}
                    <span>{formatDistanceToNow(new Date(r.createdAt), { addSuffix: true })}</span>
                    {r.reviewer && <span>Reviewed by {r.reviewer.name}</span>}
                  </div>
                  {r.reviewNote && (
                    <p className="text-xs text-gray-500 mt-1 italic">Note: {r.reviewNote}</p>
                  )}
                </div>
              </div>
              {r.status === 'PENDING' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => reviewMut.mutate({ id: r.id, decision: 'ACTION_TAKEN' })}
                    disabled={reviewMut.isPending}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-green-300 text-green-700 hover:bg-green-50 transition text-sm font-semibold"
                  >
                    <CheckCircle size={14}/>Take Action
                  </button>
                  <button
                    onClick={() => reviewMut.mutate({ id: r.id, decision: 'DISMISSED' })}
                    disabled={reviewMut.isPending}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition text-sm font-semibold"
                  >
                    <XCircle size={14}/>Dismiss
                  </button>
                </div>
              )}
            </div>
          ))}
          <div ref={ref} className="h-4"/>
          {isFetchingNextPage && <div className="flex justify-center py-4"><Loader2 className="animate-spin text-primary-400" size={22}/></div>}
        </div>
      )}
    </div>
  );
}