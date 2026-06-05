'use client';
// src/app/(app)/notifications/page.tsx
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Bell, Loader2, CheckCheck, Heart, MessageCircle, Users, Zap, UserPlus, AlertTriangle, type LucideIcon } from 'lucide-react';
import { notificationsApi } from '@/api';
import { useAppDispatch } from '@/store';
import { markAllRead, markOneRead, setUnread } from '@/store/slices/notifSlice';
import { formatDistanceToNow } from 'date-fns';
import type { NotificationResponse } from '@/types';
import toast from 'react-hot-toast';

// ── Map notification type → icon + color + navigation ────────────────────────
// Keys match backend notification_type CHECK constraint exactly:
// LIKE | COMMENT | FOLLOW | ACTIVITY_JOIN_REQUEST | ACTIVITY_APPROVED | ACTIVITY_REJECTED
// COMMUNITY_JOIN_REQUEST | COMMUNITY_APPROVED | SAFETY_ALERT | SYSTEM | MESSAGE
const NOTIF_CONFIG: Record<string, {
  icon: LucideIcon;
  bg:    string;
  color: string;
  getUrl: (n: NotificationResponse) => string | null;
}> = {
  LIKE:                    { icon: Heart,         bg: 'bg-red-100',     color: 'text-red-500',     getUrl: n => n.referenceId ? `/posts/${n.referenceId}` : null },
  COMMENT:                 { icon: MessageCircle, bg: 'bg-blue-100',    color: 'text-blue-500',    getUrl: n => n.referenceId ? `/posts/${n.referenceId}` : null },
  FOLLOW:                  { icon: UserPlus,      bg: 'bg-primary-100', color: 'text-primary-600', getUrl: n => n.referenceId ? `/profile/${n.referenceId}` : null },
  ACTIVITY_JOIN_REQUEST:   { icon: Zap,           bg: 'bg-orange-100',  color: 'text-orange-500',  getUrl: n => n.referenceId ? `/activities/${n.referenceId}` : null },
  ACTIVITY_APPROVED:       { icon: Zap,           bg: 'bg-green-100',   color: 'text-green-600',   getUrl: n => n.referenceId ? `/activities/${n.referenceId}` : null },
  ACTIVITY_REJECTED:       { icon: Zap,           bg: 'bg-red-100',     color: 'text-red-400',     getUrl: n => n.referenceId ? `/activities/${n.referenceId}` : null },
  COMMUNITY_JOIN_REQUEST:  { icon: Users,         bg: 'bg-purple-100',  color: 'text-purple-600',  getUrl: n => n.referenceId ? `/communities/${n.referenceId}` : null },
  COMMUNITY_APPROVED:      { icon: Users,         bg: 'bg-green-100',   color: 'text-green-600',   getUrl: n => n.referenceId ? `/communities/${n.referenceId}` : null },
  SAFETY_ALERT:            { icon: AlertTriangle, bg: 'bg-red-100',     color: 'text-red-600',     getUrl: _ => `/safety` },
  MESSAGE:                 { icon: MessageCircle, bg: 'bg-blue-100',    color: 'text-blue-500',    getUrl: n => n.referenceId ? `/chat/${n.referenceId}` : null },
  SYSTEM:                  { icon: Bell,          bg: 'bg-gray-100',    color: 'text-gray-500',    getUrl: n => n.redirectUrl ?? null },
};

const DEFAULT_CONFIG: {
  icon: LucideIcon;
  bg: string;
  color: string;
  getUrl: (n: NotificationResponse) => string | null;
} = {
  icon:   Bell,
  bg:     'bg-gray-100',
  color:  'text-gray-500',
  getUrl: (n: NotificationResponse) => n.redirectUrl ?? null,
};

function getConfig(type: string) {
  return NOTIF_CONFIG[type] ?? DEFAULT_CONFIG;
}

// ── Group notifications by date ───────────────────────────────────────────────
function groupByDate(items: NotificationResponse[]) {
  const today     = new Date(); today.setHours(0,0,0,0);
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate()-1);

  const groups: { label: string; items: NotificationResponse[] }[] = [];
  const map = new Map<string, NotificationResponse[]>();

  items.forEach(n => {
    const d = new Date(n.createdAt); d.setHours(0,0,0,0);
    let label = 'Earlier';
    if (d.getTime() === today.getTime())     label = 'Today';
    else if (d.getTime() === yesterday.getTime()) label = 'Yesterday';
    if (!map.has(label)) map.set(label, []);
    map.get(label)!.push(n);
  });

  ['Today','Yesterday','Earlier'].forEach(l => {
    if (map.has(l)) groups.push({ label: l, items: map.get(l)! });
  });

  return groups;
}

export default function NotificationsPage() {
  const dispatch = useAppDispatch();
  const router   = useRouter();
  const qc       = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn:  () => notificationsApi.getAll(false, 0, 50),
  });

  const items  = data?.content ?? [];
  const groups = groupByDate(items);
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
    // Mark as read
    if (!n.read) {
      try {
        await notificationsApi.markRead(n.id);
        dispatch(markOneRead(n.id));
        qc.invalidateQueries({ queryKey: ['notifications'] });
      } catch {}
    }

    // Navigate
    const cfg = getConfig(n.notificationType);
    const url = cfg.getUrl(n);
    if (url) router.push(url);
  };

  const handleDelete = async (id: number, e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    try {
      await notificationsApi.delete(id);
      qc.invalidateQueries({ queryKey: ['notifications'] });
    } catch {}
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
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
              {groupItems.map(n => {
                const cfg   = getConfig(n.notificationType);
                const Icon  = cfg.icon;
                const isNav = !!cfg.getUrl(n);

                return (
                  <div
                    key={n.id}
                    onClick={() => handleTap(n)}
                    className={`flex items-start gap-3 p-3 rounded-2xl transition group relative ${
                      isNav ? 'cursor-pointer' : 'cursor-default'
                    } ${
                      !n.read
                        ? 'bg-primary-50 hover:bg-primary-100'
                        : 'bg-white hover:bg-gray-50'
                    }`}
                  >
                    {/* Icon */}
                    <div className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden ${cfg.bg}`}>
                      {n.sender?.profileImage
                        ? <img src={n.sender.profileImage} className="w-full h-full object-cover" alt=""/>
                        : <Icon size={18} className={cfg.color}/>
                      }
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm leading-snug ${!n.read ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                        {n.title}
                      </p>
                      {n.message && (
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1.5">
                        <p className="text-[10px] text-gray-400">
                          {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                        </p>
                        {isNav && (
                          <span className="text-[10px] text-primary-500 font-medium">Tap to view →</span>
                        )}
                      </div>
                    </div>

                    {/* Unread dot */}
                    {!n.read && (
                      <div className="w-2.5 h-2.5 rounded-full bg-primary-500 flex-shrink-0 mt-1.5"/>
                    )}

                    {/* Delete button (shows on hover) */}
                    <button
                      onClick={e => handleDelete(n.id, e)}
                      className="absolute top-2 right-2 w-6 h-6 rounded-full bg-gray-200 text-gray-500 hidden group-hover:flex items-center justify-center text-sm hover:bg-red-100 hover:text-red-500 transition"
                    >×</button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
