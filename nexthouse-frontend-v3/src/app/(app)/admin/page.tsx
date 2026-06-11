'use client';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/api';
import { Loader2, ShieldAlert, FileWarning, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export default function AdminDashboardPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn:  adminApi.getDashboard,
    refetchInterval: 30_000,
  });

  const cards = [
    {
      title:  'Pending Reports',
      value:  stats?.pendingReports ?? 0,
      icon:   FileWarning,
      color:  'text-red-500 bg-red-50',
      href:   '/admin/reports',
      urgent: (stats?.pendingReports ?? 0) > 0,
    },
    {
      title:  'Moderation Queue',
      value:  stats?.pendingModeration ?? 0,
      icon:   ShieldAlert,
      color:  'text-yellow-600 bg-yellow-50',
      href:   '/admin/moderation',
      urgent: (stats?.pendingModeration ?? 0) > 0,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Platform overview and pending actions</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-primary-500" size={28}/></div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {cards.map(({ title, value, icon: Icon, color, href, urgent }) => (
            <Link key={title} href={href}>
              <div className={`card p-5 hover:shadow-md transition ${urgent ? 'border-red-200' : ''}`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${color}`}>
                  <Icon size={20}/>
                </div>
                <p className="text-3xl font-black text-gray-900">{value}</p>
                <p className="text-sm text-gray-500 mt-1">{title}</p>
                {urgent && (
                  <div className="flex items-center gap-1 mt-2">
                    <AlertTriangle size={12} className="text-red-500"/>
                    <span className="text-xs text-red-500 font-semibold">Needs attention</span>
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Quick links */}
      <div className="card p-4">
        <h2 className="font-semibold text-gray-800 mb-3">Quick Actions</h2>
        <div className="grid grid-cols-1 gap-2">
          {[
            { href: '/admin/users',      label: 'Manage users — search, ban, unban' },
            { href: '/admin/moderation', label: 'Review content in moderation queue' },
            { href: '/admin/reports',    label: 'Review user-submitted reports' },
          ].map(({ href, label }) => (
            <Link key={href} href={href}
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 border border-transparent hover:border-gray-200 transition">
              <div className="w-2 h-2 rounded-full bg-primary-500 flex-shrink-0"/>
              <span className="text-sm text-gray-700">{label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}