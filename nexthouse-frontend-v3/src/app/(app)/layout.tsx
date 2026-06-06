'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAppSelector, useAppDispatch } from '@/store';
import { clearAuth } from '@/store/slices/authSlice';
import { chatApi, notificationsApi, usersApi } from '@/api';
import { setTotalUnread } from '@/store/slices/chatSlice';
import { setUnread } from '@/store/slices/notifSlice';
import AppHeader from '@/components/layout/AppHeader';
import BottomNav from '@/components/layout/BottomNav';
import SlideMenu from '@/components/layout/SlideMenu';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const { isAuth, loading } = useAppSelector(s => s.auth);
  const [menuOpen,       setMenuOpen]       = useState(false);
  const [followReqCount, setFollowReqCount] = useState(0);

  useEffect(() => { if (!loading && !isAuth) router.replace('/login'); }, [isAuth, loading, router]);
  useEffect(() => { setMenuOpen(false); }, [pathname]);

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
      {!isChat && (
        <AppHeader
          followReqCount={followReqCount}
          onMenuToggle={() => setMenuOpen(v => !v)}
        />
      )}

      {menuOpen && (
        <SlideMenu
          onClose={() => setMenuOpen(false)}
          onLogout={handleLogout}
        />
      )}

      <main className={`min-h-[calc(100vh-56px)] ${!isChat ? 'pb-20' : ''}`}>
        {children}
      </main>

      {!isChat && <BottomNav/>}
    </div>
  );
}