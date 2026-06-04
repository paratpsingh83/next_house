'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, User, Lock, Bell, Shield, ChevronRight, Edit3, Star } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store';
import { clearAuth } from '@/store/slices/authSlice';
import { authApi } from '@/api';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const dispatch = useAppDispatch();
  const router   = useRouter();
  const me       = useAppSelector(s => s.auth.user);
  const [loading, setLoading] = useState(false);

  const logout = async () => {
    setLoading(true);
    try { await authApi.logout(); } catch {}
    dispatch(clearAuth());
    router.push('/login');
    toast.success('Logged out');
    setLoading(false);
  };

  const sections = [
    { title: 'Account', items: [
      { icon: Edit3,  label: 'Edit profile',    sub: 'Name, bio, photo, location', href: '/settings/profile' },
      { icon: Lock,   label: 'Change password', sub: 'Update your password',        href: '/settings/password' },
    ]},
    { title: 'Preferences', items: [
      { icon: Bell,   label: 'Notifications',   sub: 'Push & email settings',       href: '/settings/notifications' },
      { icon: Shield, label: 'Privacy',          sub: 'Who can see your profile',    href: '/settings/privacy' },
    ]},
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="px-4 pt-4 pb-2">
        <h1 className="text-xl font-bold text-gray-900">Settings</h1>
      </div>

      {/* Profile card */}
      {me && (
        <Link href="/settings/profile">
          <div className="mx-4 mt-3 card p-4 flex items-center gap-4 hover:shadow-md transition">
            <div className="w-16 h-16 rounded-full bg-primary-100 overflow-hidden flex items-center justify-center flex-shrink-0">
              {me.profileImage
                ? <img src={me.profileImage} className="w-full h-full object-cover" alt=""/>
                : <span className="text-primary-600 font-bold text-2xl">{me.name[0]}</span>
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-900">{me.name}</p>
              <p className="text-sm text-gray-400">@{me.username}</p>
              <div className="flex items-center gap-2 mt-1">
                <Star size={12} className="text-yellow-500 fill-current"/>
                <span className="text-xs text-gray-500">Trust Score: {me.trustScore}</span>
                {me.addressVerified && <span className="text-xs text-primary-500">· Verified</span>}
              </div>
            </div>
            <Edit3 size={18} className="text-gray-300 flex-shrink-0"/>
          </div>
        </Link>
      )}

      {/* Sections */}
      <div className="px-4 mt-5 space-y-5">
        {sections.map(s => (
          <div key={s.title}>
            <p className="section-title">{s.title}</p>
            <div className="card divide-y divide-gray-50 overflow-hidden">
              {s.items.map(item => (
                <Link key={item.label} href={item.href}>
                  <div className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition">
                    <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <item.icon size={18} className="text-gray-500"/>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800">{item.label}</p>
                      <p className="text-xs text-gray-400">{item.sub}</p>
                    </div>
                    <ChevronRight size={16} className="text-gray-300"/>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}

        {/* Logout */}
        <div>
          <p className="section-title">Account</p>
          <button onClick={logout} disabled={loading}
            className="w-full card flex items-center gap-3 px-4 py-3.5 text-red-500 hover:bg-red-50 transition">
            <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center">
              <LogOut size={18} className="text-red-500"/>
            </div>
            <span className="text-sm font-semibold">
              {loading ? 'Logging out…' : 'Log out'}
            </span>
          </button>
        </div>

        {/* App version */}
        <p className="text-center text-xs text-gray-300 pb-4">NexHouse v1.0.0</p>
      </div>
    </div>
  );
}
