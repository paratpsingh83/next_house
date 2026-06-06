'use client';
import {
  Bell, Heart, MessageCircle, Users, Zap, UserPlus,
  AlertTriangle, ShoppingBag, Star, Package,
  type LucideIcon,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { NotificationResponse } from '@/types';

export const NOTIF_CONFIG: Record<string, {
  icon: LucideIcon;
  bg:   string;
  color: string;
  getUrl: (n: NotificationResponse) => string | null;
}> = {
  LIKE:                   { icon: Heart,         bg: 'bg-red-100',     color: 'text-red-500',     getUrl: n => n.referenceId ? `/posts/${n.referenceId}` : null },
  COMMENT:                { icon: MessageCircle, bg: 'bg-blue-100',    color: 'text-blue-500',    getUrl: n => n.referenceId ? `/posts/${n.referenceId}` : null },
  FOLLOW:                 { icon: UserPlus,      bg: 'bg-primary-100', color: 'text-primary-600', getUrl: n => n.referenceId ? `/profile/${n.referenceId}` : null },
  ACTIVITY_JOIN_REQUEST:  { icon: Zap,           bg: 'bg-orange-100',  color: 'text-orange-500',  getUrl: n => n.referenceId ? `/activities/${n.referenceId}` : null },
  ACTIVITY_APPROVED:      { icon: Zap,           bg: 'bg-green-100',   color: 'text-green-600',   getUrl: n => n.referenceId ? `/activities/${n.referenceId}` : null },
  ACTIVITY_REJECTED:      { icon: Zap,           bg: 'bg-red-100',     color: 'text-red-400',     getUrl: n => n.referenceId ? `/activities/${n.referenceId}` : null },
  COMMUNITY_JOIN_REQUEST: { icon: Users,         bg: 'bg-purple-100',  color: 'text-purple-600',  getUrl: n => n.referenceId ? `/communities/${n.referenceId}` : null },
  COMMUNITY_APPROVED:     { icon: Users,         bg: 'bg-green-100',   color: 'text-green-600',   getUrl: n => n.referenceId ? `/communities/${n.referenceId}` : null },
  SAFETY_ALERT:           { icon: AlertTriangle, bg: 'bg-red-100',     color: 'text-red-600',     getUrl: _ => `/safety` },
  MESSAGE:                { icon: MessageCircle, bg: 'bg-blue-100',    color: 'text-blue-500',    getUrl: n => n.referenceId ? `/chat/${n.referenceId}` : null },
  SYSTEM:                 { icon: Bell,          bg: 'bg-gray-100',    color: 'text-gray-500',    getUrl: n => n.redirectUrl ?? null },
  FOLLOW_REQUEST:         { icon: UserPlus,      bg: 'bg-primary-100', color: 'text-primary-600', getUrl: n => n.referenceId ? `/profile/${n.referenceId}` : null },
  FOLLOW_REQUEST_ACCEPTED:{ icon: Users,         bg: 'bg-green-100',   color: 'text-green-600',   getUrl: n => n.referenceId ? `/profile/${n.referenceId}` : null },
  MARKETPLACE_INTEREST:   { icon: ShoppingBag,   bg: 'bg-green-100',   color: 'text-green-600',   getUrl: n => n.referenceId ? `/marketplace/${n.referenceId}` : null },
  BORROW_REQUEST_RESPONSE:{ icon: Package,       bg: 'bg-amber-100',   color: 'text-amber-600',   getUrl: n => n.referenceId ? `/borrow/${n.referenceId}` : null },
  REACTION:               { icon: Star,          bg: 'bg-yellow-100',  color: 'text-yellow-600',  getUrl: n => n.referenceId ? `/posts/${n.referenceId}` : null },
};

const DEFAULT_CONFIG = {
  icon:   Bell as LucideIcon,
  bg:     'bg-gray-100',
  color:  'text-gray-500',
  getUrl: (n: NotificationResponse) => n.redirectUrl ?? null,
};

export function getNotifConfig(type: string) {
  return NOTIF_CONFIG[type] ?? DEFAULT_CONFIG;
}

export function groupByDate(items: NotificationResponse[]) {
  const today     = new Date(); today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);

  const map = new Map<string, NotificationResponse[]>();
  items.forEach(n => {
    const d = new Date(n.createdAt); d.setHours(0, 0, 0, 0);
    let label = 'Earlier';
    if (d.getTime() === today.getTime())         label = 'Today';
    else if (d.getTime() === yesterday.getTime()) label = 'Yesterday';
    if (!map.has(label)) map.set(label, []);
    map.get(label)!.push(n);
  });

  const groups: { label: string; items: NotificationResponse[] }[] = [];
  ['Today', 'Yesterday', 'Earlier'].forEach(l => {
    if (map.has(l)) groups.push({ label: l, items: map.get(l)! });
  });
  return groups;
}

interface Props {
  notification: NotificationResponse;
  onTap:    (n: NotificationResponse) => void;
  onDelete: (id: number, e: React.MouseEvent) => void;
}

export default function NotificationItem({ notification: n, onTap, onDelete }: Props) {
  const cfg  = getNotifConfig(n.notificationType);
  const Icon = cfg.icon;
  const isNav = !!cfg.getUrl(n);

  return (
    <div
      onClick={() => onTap(n)}
      className={`flex items-start gap-3 p-3 rounded-2xl transition group relative ${
        isNav ? 'cursor-pointer' : 'cursor-default'
      } ${
        !n.read ? 'bg-primary-50 hover:bg-primary-100' : 'bg-white hover:bg-gray-50'
      }`}
    >
      <div className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden ${cfg.bg}`}>
        {n.sender?.profileImage
          ? <img src={n.sender.profileImage} className="w-full h-full object-cover" alt=""/>
          : <Icon size={18} className={cfg.color}/>
        }
      </div>

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
          {isNav && <span className="text-[10px] text-primary-500 font-medium">Tap to view →</span>}
        </div>
      </div>

      {!n.read && <div className="w-2.5 h-2.5 rounded-full bg-primary-500 flex-shrink-0 mt-1.5"/>}

      <button
        onClick={e => onDelete(n.id, e)}
        className="absolute top-2 right-2 w-6 h-6 rounded-full bg-gray-200 text-gray-500 hidden group-hover:flex items-center justify-center text-sm hover:bg-red-100 hover:text-red-500 transition"
      >×</button>
    </div>
  );
}