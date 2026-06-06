'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  X, ChevronRight, Settings, LogOut,
  Zap, Package, Star, ListOrdered, CalendarCheck, Bookmark, Shield,
} from 'lucide-react';
import { useAppSelector } from '@/store';

const MENU_SECTIONS = [
  {
    title: 'Discover',
    items: [
      { href: '/activities',    icon: Zap,          label: 'Activities'       },
      { href: '/borrow',        icon: Package,      label: 'Borrow & Lend'   },
      { href: '/neighbourhood', icon: Star,         label: 'My Neighbourhood' },
    ],
  },
  {
    title: 'My Stuff',
    items: [
      { href: '/my/listings',   icon: ListOrdered,  label: 'My Listings'  },
      { href: '/my/activities', icon: CalendarCheck, label: 'My Activities' },
      { href: '/my/saved',      icon: Bookmark,     label: 'Saved Posts'  },
    ],
  },
  {
    title: 'Safety',
    items: [
      { href: '/safety',        icon: Shield, label: 'Safety Alerts' },
      { href: '/safety/create', icon: Shield, label: 'Report Alert'  },
    ],
  },
];

interface Props {
  onClose:  () => void;
  onLogout: () => void;
}

export default function SlideMenu({ onClose, onLogout }: Props) {
  const pathname = usePathname();
  const { user } = useAppSelector(s => s.auth);

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      <div
        className="fixed top-0 right-0 h-full w-72 bg-white z-50 shadow-2xl flex flex-col animate-slide-in-right"
        style={{ animation: 'slideInRight 0.3s cubic-bezier(0.32,0.72,0,1)' }}
      >
        {/* Profile header */}
        <div className="bg-gradient-to-br from-primary-500 to-teal-500 px-5 pt-12 pb-5 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <span className="text-white font-black text-lg">NexHouse</span>
            <button onClick={onClose} className="text-white/80 hover:text-white p-1">
              <X size={20}/>
            </button>
          </div>
          {user && (
            <Link href={`/profile/${user.id}`} onClick={onClose}>
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
                <Link key={href} href={href} onClick={onClose}>
                  <div className={`flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition ${
                    pathname === href ? 'bg-primary-50 text-primary-600' : 'text-gray-700'
                  }`}>
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
          <Link href="/settings" onClick={onClose}>
            <div className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition text-gray-700">
              <Settings size={18} className="text-gray-400"/>
              <span className="text-sm font-medium">Settings</span>
            </div>
          </Link>
          <button onClick={onLogout} className="w-full flex items-center gap-3 px-5 py-3 hover:bg-red-50 transition text-red-500">
            <LogOut size={18}/>
            <span className="text-sm font-medium">Sign out</span>
          </button>
        </div>
      </div>
    </>
  );
}