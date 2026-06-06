'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users, ShoppingBag, MessageCircle, Star } from 'lucide-react';
import { useAppSelector } from '@/store';

const NAV_ITEMS = [
  { href: '/feed',        icon: Home,          label: 'Home'   },
  { href: '/neighbours',  icon: Users,         label: 'People' },
  { href: '/communities', icon: Star,          label: 'Local'  },
  { href: '/marketplace', icon: ShoppingBag,   label: 'Market' },
  { href: '/chat',        icon: MessageCircle, label: 'Chat'   },
] as const;

export default function BottomNav() {
  const pathname   = usePathname();
  const chatUnread = useAppSelector(s => s.chat.totalUnread);

  return (
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
              {isActive && <div className="absolute -inset-1.5 bg-primary-100 rounded-xl -z-10"/>}
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
  );
}