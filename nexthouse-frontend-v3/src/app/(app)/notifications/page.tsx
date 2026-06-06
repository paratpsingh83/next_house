'use client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Bell, Loader2, CheckCheck } from 'lucide-react';
import { notificationsApi } from '@/api';
import { useAppDispatch } from '@/store';
import { markAllRead, markOneRead, setUnread } from '@/store/slices/notifSlice';
import type { NotificationResponse } from '@/types';
import toast from 'react-hot-toast';
import NotificationItem, { groupByDate, getNotifConfig } from '@/components/notification/NotificationItem';

export default function NotificationsPage() {
  const dispatch = useAppDispatch();
  const router   = useRouter();
  const qc       = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn:  () => notificationsApi.getAll(false, 0, 50),
  });

  const items     = data?.content ?? [];
  const groups    = groupByDate(items);
  const hasUnread = items.some(n => !n.read);

  const handleMarkAll = async () => {
    try {
      await notificationsApi.markAllRead();
      dispatch(markAllRead());
      dispatch(setUnread(0));
      qc.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('All marked as read');
    } catch { toast.error('Failed'); }
  };

  const handleTap = async (n: NotificationResponse) => {
    if (!n.read) {
      try {
        await notificationsApi.markRead(n.id);
        dispatch(markOneRead(n.id));
        qc.invalidateQueries({ queryKey: ['notifications'] });
      } catch {}
    }
    const url = getNotifConfig(n.notificationType).getUrl(n);
    if (url) router.push(url);
  };

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await notificationsApi.delete(id);
      qc.invalidateQueries({ queryKey: ['notifications'] });
    } catch {}
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-4 h-14 flex items-center justify-between sticky top-0 z-10">
        <h1 className="text-xl font-bold text-gray-900">Notifications</h1>
        {hasUnread && (
          <button onClick={handleMarkAll} className="flex items-center gap-1.5 text-sm text-primary-600 font-medium">
            <CheckCheck size={16}/>All read
          </button>
        )}
      </div>

      {isLoading && (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-primary-500" size={28}/>
        </div>
      )}

      {!isLoading && items.length === 0 && (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
            <Bell size={28} className="text-gray-400"/>
          </div>
          <p className="font-semibold text-gray-500">All caught up!</p>
          <p className="text-sm text-gray-400 mt-1">No new notifications</p>
        </div>
      )}

      <div className="px-4 py-3 space-y-5">
        {groups.map(({ label, items: groupItems }) => (
          <div key={label}>
            <p className="section-title">{label}</p>
            <div className="space-y-1">
              {groupItems.map(n => (
                <NotificationItem
                  key={n.id}
                  notification={n}
                  onTap={handleTap}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}