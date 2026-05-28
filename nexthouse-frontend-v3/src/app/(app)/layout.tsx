'use client';
// src/app/(app)/layout.tsx
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Home, Zap, Users, ShoppingBag, MessageCircle, Bell, Search, Shield } from 'lucide-react';
import { useAppSelector } from '@/store';

const NAV_ITEMS = [
  { href: '/feed',        icon: Home,          label: 'Home' },
  { href: '/activities',  icon: Zap,           label: 'Events' },
  { href: '/communities', icon: Users,          label: 'Groups' },
  { href: '/marketplace', icon: ShoppingBag,    label: 'Market' },
  { href: '/chat',        icon: MessageCircle,  label: 'Chat' },
] as const;

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const { isAuth, loading } = useAppSelector(s => s.auth);
  const notifUnread = useAppSelector(s => s.notif.unread);
  const chatUnread  = useAppSelector(s => s.chat.totalUnread);

  useEffect(() => {
    if (!loading && !isAuth) router.replace('/login');
  }, [isAuth, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary-50">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuth) return null;

  return (
    <div className="min-h-screen bg-gray-50 max-w-md mx-auto relative">
      {/* ── Top header ─────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100 px-4 h-14 flex items-center justify-between">
        <Link href="/feed" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-primary-500 flex items-center justify-center">
            <span className="text-white text-sm font-bold">N</span>
          </div>
          <span className="font-bold text-gray-900">NexHouse</span>
        </Link>
        <div className="flex items-center gap-1">
          <Link href="/search" className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 transition">
            <Search size={20} />
          </Link>
          <Link href="/safety" className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 transition">
            <Shield size={20} />
          </Link>
          <Link href="/notifications" className="relative p-2 rounded-xl text-gray-500 hover:bg-gray-100 transition">
            <Bell size={20} />
            {notifUnread > 0 && (
              <span className="absolute top-1 right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                {notifUnread > 99 ? '99+' : notifUnread}
              </span>
            )}
          </Link>
        </div>
      </header>

      {/* ── Main content ───────────────────────────────────── */}
      <main className="pb-20 min-h-[calc(100vh-56px)]">{children}</main>

      {/* ── Bottom navigation ──────────────────────────────── */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-gray-100 flex z-40 safe-pb">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const isActive = pathname.startsWith(href);
          const badge = href === '/chat' ? chatUnread : 0;
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-[11px] font-medium transition-colors ${
                isActive ? 'text-primary-600' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <div className="relative">
                <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
                {badge > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">
                    {badge > 9 ? '9+' : badge}
                  </span>
                )}
              </div>
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
