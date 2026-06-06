'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Home, Users, ShoppingBag, MessageCircle, Bell,
  Search, Shield, Settings, Zap, Package, CalendarCheck,
  ListOrdered, Star, X, ChevronRight, LogOut, UserPlus, Bookmark,
} from 'lucide-react';
import { useAppSelector, useAppDispatch } from '@/store';
import { clearAuth } from '@/store/slices/authSlice';
import { chatApi, notificationsApi, usersApi } from '@/api';
import { setTotalUnread } from '@/store/slices/chatSlice';
import { setUnread } from '@/store/slices/notifSlice';

const NAV_ITEMS = [
  { href: '/feed',        icon: Home,         label: 'Home'    },
  { href: '/neighbours',  icon: Users,        label: 'People'  },
  { href: '/communities', icon: Star,         label: 'Local'   },
  { href: '/marketplace', icon: ShoppingBag,  label: 'Market'  },
  { href: '/chat',        icon: MessageCircle,label: 'Chat'    },
] as const;

const MENU_SECTIONS = [
  {
    title: 'Discover',
    items: [
      { href: '/activities',    icon: Zap,          label: 'Activities'      },
      { href: '/borrow',        icon: Package,       label: 'Borrow & Lend'  },
      { href: '/neighbourhood', icon: Star,          label: 'My Neighbourhood'},
    ],
  },
  {
    title: 'My Stuff',
    items: [
      { href: '/my/listings',   icon: ListOrdered,  label: 'My Listings'     },
      { href: '/my/activities', icon: CalendarCheck, label: 'My Activities'  },
      { href: '/my/saved',      icon: Bookmark,     label: 'Saved Posts'     },
    ],
  },
  {
    title: 'Safety',
    items: [
      { href: '/safety',        icon: Shield,       label: 'Safety Alerts'   },
      { href: '/safety/create', icon: Shield,       label: 'Report Alert'    },
    ],
  },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const { isAuth, loading, user } = useAppSelector(s => s.auth);
  const notifUnread = useAppSelector(s => s.notif.unread);
  const chatUnread  = useAppSelector(s => s.chat.totalUnread);
  const [menuOpen, setMenuOpen]           = useState(false);
  const [followReqCount, setFollowReqCount] = useState(0);

  useEffect(() => { if (!loading && !isAuth) router.replace('/login'); }, [isAuth, loading, router]);
  useEffect(() => { setMenuOpen(false); }, [pathname]);

  // Poll unread counts on mount
  useEffect(() => {
    if (!isAuth) return;
    const fetchUnread = async () => {
      try {
        const [chat, notif, followReqs] = await Promise.all([
          chatApi.totalUnread(),
          notificationsApi.unreadCount(),
          usersApi.getFollowRequests(),
        ]);
        dispatch(setTotalUnread(chat));
        dispatch(setUnread(notif));
        setFollowReqCount(followReqs.length);
      } catch {}
    };
    fetchUnread();
    const id = setInterval(fetchUnread, 30000);
    return () => clearInterval(id);
  }, [isAuth]);

  const handleLogout = () => {
    dispatch(clearAuth());
    router.replace('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary-50 to-teal-50 gap-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 to-teal-500 flex items-center justify-center shadow-lg">
          <span className="text-white text-2xl font-black">N</span>
        </div>
        <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"/>
      </div>
    );
  }
  if (!isAuth) return null;

  const isChat = pathname.startsWith('/chat/') && pathname !== '/chat';

  return (
    <div className="min-h-screen bg-gray-50 max-w-md mx-auto relative">

      {/* ── Top header (hidden inside chat room) ────────────────────────────── */}
      {!isChat && (
        <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-100 px-4 h-14 flex items-center justify-between">
          <Link href="/feed" className="flex items-center gap-2 no-tap">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-500 to-teal-500 flex items-center justify-center shadow-sm">
              <span className="text-white text-sm font-black">N</span>
            </div>
            <span className="font-black text-gray-900 text-base tracking-tight">
              Nex<span className="text-primary-500">House</span>
            </span>
          </Link>

          <div className="flex items-center gap-0.5">
            <Link href="/search" className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 transition no-tap">
              <Search size={20}/>
            </Link>
            <Link href="/settings/follow-requests" className="relative p-2 rounded-xl text-gray-500 hover:bg-gray-100 transition no-tap">
              <UserPlus size={20}/>
              {followReqCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-primary-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5 animate-pop-in">
                  {followReqCount > 9 ? '9+' : followReqCount}
                </span>
              )}
            </Link>
            <Link href="/notifications" className="relative p-2 rounded-xl text-gray-500 hover:bg-gray-100 transition no-tap">
              <Bell size={20}/>
              {notifUnread > 0 && (
                <span className="absolute top-1 right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 animate-pop-in">
                  {notifUnread > 99 ? '99+' : notifUnread}
                </span>
              )}
            </Link>

            {/* Hamburger / avatar toggle */}
            <button
              onClick={() => setMenuOpen(v => !v)}
              className="ml-1 w-8 h-8 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0 border-2 border-gray-200 transition hover:border-primary-300 no-tap"
            >
              {user?.profileImage
                ? <img src={user.profileImage} className="w-full h-full object-cover" alt=""/>
                : <span className="text-primary-600 font-bold text-sm">{user?.name?.[0]}</span>
              }
            </button>
          </div>
        </header>
      )}

      {/* ── Slide-in side menu ───────────────────────────────────────────────── */}
      {menuOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm animate-fade-in"
            onClick={() => setMenuOpen(false)}
          />
          <div className="fixed top-0 right-0 h-full w-72 bg-white z-50 shadow-2xl flex flex-col animate-slide-in-right"
               style={{ animation: 'slideInRight 0.3s cubic-bezier(0.32,0.72,0,1)' }}>

            {/* Profile header */}
            <div className="bg-gradient-to-br from-primary-500 to-teal-500 px-5 pt-12 pb-5 flex-shrink-0">
              <div className="flex items-center justify-between mb-4">
                <span className="text-white font-black text-lg">NexHouse</span>
                <button onClick={() => setMenuOpen(false)} className="text-white/80 hover:text-white p-1">
                  <X size={20}/>
                </button>
              </div>
              {user && (
                <Link href={`/profile/${user.id}`} onClick={() => setMenuOpen(false)}>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-white/20 overflow-hidden flex items-center justify-center border-2 border-white/40">
                      {user.profileImage
                        ? <img src={user.profileImage} className="w-full h-full object-cover" alt=""/>
                        : <span className="text-white font-bold text-lg">{user.name[0]}</span>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-white truncate">{user.name}</p>
                      <p className="text-white/70 text-xs">@{user.username}</p>
                    </div>
                    <ChevronRight size={16} className="text-white/60"/>
                  </div>
                </Link>
              )}
            </div>

            {/* Menu sections */}
            <div className="flex-1 overflow-y-auto py-3">
              {MENU_SECTIONS.map(section => (
                <div key={section.title} className="mb-2">
                  <p className="px-5 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    {section.title}
                  </p>
                  {section.items.map(({ href, icon: Icon, label }) => (
                    <Link key={href} href={href} onClick={() => setMenuOpen(false)}>
                      <div className={`flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition ${pathname === href ? 'bg-primary-50 text-primary-600' : 'text-gray-700'}`}>
                        <Icon size={18} className={pathname === href ? 'text-primary-500' : 'text-gray-400'}/>
                        <span className="text-sm font-medium">{label}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 border-t border-gray-100 py-2">
              <Link href="/settings" onClick={() => setMenuOpen(false)}>
                <div className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition text-gray-700">
                  <Settings size={18} className="text-gray-400"/>
                  <span className="text-sm font-medium">Settings</span>
                </div>
              </Link>
              <button onClick={handleLogout} className="w-full flex items-center gap-3 px-5 py-3 hover:bg-red-50 transition text-red-500">
                <LogOut size={18}/>
                <span className="text-sm font-medium">Sign out</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Main content ─────────────────────────────────────────────────────── */}
      <main className={`min-h-[calc(100vh-56px)] ${!isChat ? 'pb-20' : ''}`}>
        {children}
      </main>

      {/* ── Bottom navigation (hidden inside chat room) ──────────────────────── */}
      {!isChat && (
        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white/95 backdrop-blur-md border-t border-gray-100 flex z-40 safe-pb">
          {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
            const isActive = pathname === href || (pathname.startsWith(href + '/') && href !== '/feed');
            const badge    = href === '/chat' ? chatUnread : 0;
            return (
              <Link
                key={href}
                href={href}
                className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 no-tap transition-colors
                  ${isActive ? 'text-primary-600' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <div className="relative">
                  {isActive ? (
                    <div className="absolute -inset-1.5 bg-primary-100 rounded-xl -z-10"/>
                  ) : null}
                  <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8}/>
                  {badge > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5 animate-pop-in">
                      {badge > 9 ? '9+' : badge}
                    </span>
                  )}
                </div>
                <span className={`text-[10px] font-semibold ${isActive ? 'text-primary-600' : ''}`}>{label}</span>
              </Link>
            );
          })}
        </nav>
      )}
    </div>
  );
}