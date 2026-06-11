'use client';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft, Bell, MessageCircle, Users, Zap,
  ShoppingBag, Shield, Heart, Star,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '@/api';
import type { NotificationPreferences } from '@/types';

const DEFAULTS: NotificationPreferences = {
  likes:          true,
  comments:       true,
  follows:        true,
  followRequests: true,
  messages:       true,
  activities:     true,
  marketplace:    false,
  safetyAlerts:   true,
  communities:    true,
};

type PrefItem = {
  key: keyof NotificationPreferences;
  label: string;
  sub: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
};

const SECTIONS: { title: string; items: PrefItem[] }[] = [
  {
    title: 'Activity',
    items: [
      { key: 'likes',     label: 'Likes & reactions', sub: 'When someone reacts to your post',     icon: Heart,         iconBg: 'bg-red-100',     iconColor: 'text-red-500'     },
      { key: 'comments',  label: 'Comments',           sub: 'When someone comments on your post',  icon: MessageCircle, iconBg: 'bg-blue-100',    iconColor: 'text-blue-500'    },
    ],
  },
  {
    title: 'People',
    items: [
      { key: 'follows',        label: 'New followers',    sub: 'When someone follows you',                   icon: Users, iconBg: 'bg-primary-100', iconColor: 'text-primary-600' },
      { key: 'followRequests', label: 'Follow requests',  sub: 'When someone requests to follow you',        icon: Star,  iconBg: 'bg-amber-100',   iconColor: 'text-amber-600'   },
    ],
  },
  {
    title: 'Messaging',
    items: [
      { key: 'messages', label: 'Direct messages', sub: 'New messages in your chats', icon: MessageCircle, iconBg: 'bg-teal-100', iconColor: 'text-teal-600' },
    ],
  },
  {
    title: 'Neighbourhood',
    items: [
      { key: 'activities',   label: 'Activities',     sub: 'Join requests, approvals and updates',      icon: Zap,       iconBg: 'bg-violet-100',  iconColor: 'text-violet-600'  },
      { key: 'safetyAlerts', label: 'Safety alerts',  sub: 'Important alerts in your neighbourhood',   icon: Shield,    iconBg: 'bg-red-100',     iconColor: 'text-red-600'     },
      { key: 'marketplace',  label: 'Marketplace',    sub: 'Interest in your listings',                icon: ShoppingBag, iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600' },
      { key: 'communities',  label: 'Communities',    sub: 'Join requests and community updates',      icon: Users,     iconBg: 'bg-purple-100',  iconColor: 'text-purple-600'  },
    ],
  },
];

export default function NotificationsSettingsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: prefs = DEFAULTS, isLoading } = useQuery({
    queryKey: ['notification-preferences'],
    queryFn:  () => notificationsApi.getPreferences(),
  });

  const { mutate: savePrefs } = useMutation({
    mutationFn: (updated: NotificationPreferences) => notificationsApi.updatePreferences(updated),
    onSuccess:  (data) => {
      queryClient.setQueryData(['notification-preferences'], data);
    },
    onError: () => toast.error('Failed to save preferences'),
  });

  const toggle = (key: keyof NotificationPreferences) => {
    const updated = { ...prefs, [key]: !prefs[key] };
    savePrefs(updated);
    toast.success(updated[key] ? 'Notifications turned on' : 'Notifications turned off', {
      duration: 1500,
      icon: updated[key] ? '🔔' : '🔕',
    });
  };

  const allOff = Object.values(prefs).every(v => !v);

  const toggleAll = () => {
    const next = allOff
      ? { ...DEFAULTS }
      : Object.fromEntries(Object.keys(DEFAULTS).map(k => [k, false])) as NotificationPreferences;
    savePrefs(next);
    toast.success(allOff ? 'All notifications enabled' : 'All notifications paused');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 h-14 flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 -ml-2 rounded-xl hover:bg-gray-100 transition">
          <ChevronLeft size={22} className="text-gray-700"/>
        </button>
        <h1 className="text-lg font-bold text-gray-900">Notifications</h1>
        <div className="flex-1"/>
        <button
          onClick={toggleAll}
          className="text-xs font-semibold text-primary-600 hover:text-primary-700 transition"
        >
          {allOff ? 'Enable all' : 'Pause all'}
        </button>
      </div>

      {allOff && (
        <div className="mx-4 mt-4 flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-2xl">
          <Bell size={18} className="text-amber-600 flex-shrink-0"/>
          <p className="text-xs text-amber-700 font-medium">
            All notifications are paused. You won&apos;t receive any alerts.
          </p>
        </div>
      )}

      <div className="px-4 py-5 space-y-5">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-16 bg-gray-200 rounded-2xl animate-pulse"/>
            ))}
          </div>
        ) : (
          SECTIONS.map(section => (
            <div key={section.title}>
              <p className="section-title">{section.title}</p>
              <div className="card divide-y divide-gray-50 overflow-hidden">
                {section.items.map(({ key, label, sub, icon: Icon, iconBg, iconColor }) => {
                  const enabled = prefs[key];
                  return (
                    <button
                      key={key}
                      onClick={() => toggle(key)}
                      className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition text-left"
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg} ${enabled ? '' : 'opacity-40'}`}>
                        <Icon size={18} className={iconColor}/>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold ${enabled ? 'text-gray-800' : 'text-gray-400'}`}>{label}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
                      </div>
                      <div className={`relative w-12 h-6 rounded-full transition-colors duration-200 flex-shrink-0 ${
                        enabled ? 'bg-primary-500' : 'bg-gray-200'
                      }`}>
                        <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                          enabled ? 'translate-x-6' : 'translate-x-0.5'
                        }`}/>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        )}

        <p className="text-xs text-gray-400 text-center pb-4">
          These preferences apply to in-app alerts. Push notification delivery depends on your device settings.
        </p>
      </div>
    </div>
  );
}
