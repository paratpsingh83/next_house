'use client';
// src/app/(app)/layout.tsx
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Home, Zap, Users, ShoppingBag, MessageCircle, Bell, Search, Shield, Menu, X, ListOrdered, CalendarCheck, MapPin, Star, Package } from 'lucide-react';
import { useAppSelector } from '@/store';

const NAV_ITEMS = [
  { href: '/feed',        icon: Home,         label: 'Home'   },
  { href: '/neighbours',  icon: Users,         label: 'People' },
  { href: '/communities', icon: MapPin,        label: 'Local'  },
  { href: '/marketplace', icon: ShoppingBag,   label: 'Market' },
  { href: '/chat',        icon: MessageCircle, label: 'Chat'   },
] as const;

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const { isAuth, loading, user } = useAppSelector(s => s.auth);
  const notifUnread = useAppSelector(s => s.notif.unread);
  const chatUnread  = useAppSelector(s => s.chat.totalUnread);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => { if (!loading && !isAuth) router.replace('/login'); }, [isAuth, loading, router]);
  useEffect(() => { setMenuOpen(false); }, [pathname]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary-50">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"/>
      </div>
    );
  }
  if (!isAuth) return null;

  return (
    <div className="min-h-screen bg-gray-50 max-w-md mx-auto relative">

      {/* ── Top header ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100 px-4 h-14 flex items-center justify-between">
        <Link href="/feed" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-primary-500 flex items-center justify-center">
            <span className="text-white text-sm font-bold">N</span>
          </div>
          <span className="font-bold text-gray-900 text-base">NexHouse</span>
        </Link>

        <div className="flex items-center gap-0.5">
          <Link href="/search" className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 transition">
            <Search size={20}/>
          </Link>
          <Link href="/safety" className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 transition">
            <Shield size={20}/>
          </Link>
          <Link href="/notifications" className="relative p-2 rounded-xl text-gray-500 hover:bg-gray-100 transition">
            <Bell size={20}/>
            {notifUnread > 0 && (
              <span className="absolute top-1 right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                {notifUnread > 99 ? '99+' : notifUnread}
              </span>
            )}
          </Link>
          <button onClick={() => setMenuOpen(v => !v)} className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 transition">
            {menuOpen ? <X size={20}/> : <Menu size={20}/>}
          </button>
        </div>
      </header>

      {/* ── Slide-in menu ──────────────────────────────────────────────────── */}
      {menuOpen && (
        <>
          <div className="fixed inset-0 z-30 bg-black/20" onClick={() => setMenuOpen(false)}/>
          <div className="fixed top-14 right-0 w-64 bg-white border border-gray-100 rounded-bl-2xl shadow-xl z-40 overflow-hidden" style={{maxWidth:'100vw'}}>
            {user && (
              <Link href={`/profile/${user.id}`} onClick={() => setMenuOpen(false)}>
                <div className="flex items-center gap-3 px-4 py-4 bg-primary-50 border-b border-primary-100">
                  <div className="w-10 h-10 rounded-full bg-primary-200 overflow-hidden flex items-center justify-center flex-shrink-0">
                    {user.profileImage ? <img src={user.profileImage} className="w-full h-full object-cover" alt=""/> : <span className="text-primary-700 font-bold">{user.name[0]}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-primary-800 truncate">{user.name}</p>
                    <p className="text-xs text-primary-500">@{user.username}</p>
                  </div>
                </div>
              </Link>
            )}

            {[
              { href:`/profile/${user?.id}`, icon:Users,         label:'My Profile'       },
              { href:'/neighbourhood',        icon:Star,          label:'For You'          },
              { href:'/activities',           icon:Zap,           label:'Activities'       },
              { href:'/borrow',               icon:Package,       label:'Borrow & Lend'    },
              { href:'/my/listings',          icon:ListOrdered,   label:'My Listings'      },
              { href:'/my/activities',        icon:CalendarCheck, label:'My Activities'    },
              { href:'/safety/create',        icon:Shield,        label:'Report Alert'     },
              { href:'/settings',             icon:Menu,          label:'Settings'         },
            ].map(({ href, icon: Icon, label }) => (
              <Link key={href} href={href} onClick={() => setMenuOpen(false)}>
                <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition border-b border-gray-50">
                  <Icon size={17} className="text-gray-500 flex-shrink-0"/>
                  <span className="text-sm font-medium text-gray-700">{label}</span>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}

      {/* ── Main content ───────────────────────────────────────────────────── */}
      <main className="pb-20 min-h-[calc(100vh-56px)]">{children}</main>

      {/* ── Bottom navigation ──────────────────────────────────────────────── */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-gray-100 flex z-40 safe-pb">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/');
          const badge    = href === '/chat' ? chatUnread : 0;
          return (
            <Link key={href} href={href}
              className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-[10px] font-semibold transition-colors ${
                isActive ? 'text-primary-600' : 'text-gray-400 hover:text-gray-600'
              }`}>
              <div className="relative">
                <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8}/>
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
