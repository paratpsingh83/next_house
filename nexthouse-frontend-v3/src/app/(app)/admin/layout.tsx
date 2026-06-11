'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, ShieldAlert, FileWarning } from 'lucide-react';

const NAV = [
  { href: '/admin',            icon: LayoutDashboard, label: 'Dashboard'   },
  { href: '/admin/users',      icon: Users,           label: 'Users'        },
  { href: '/admin/moderation', icon: ShieldAlert,     label: 'Moderation'  },
  { href: '/admin/reports',    icon: FileWarning,     label: 'Reports'      },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin top bar */}
      <div className="bg-gray-900 text-white px-4 py-3 flex items-center gap-3 sticky top-0 z-20">
        <ShieldAlert size={18} className="text-yellow-400"/>
        <span className="font-bold text-sm">Admin Panel</span>
        <Link href="/" className="ml-auto text-xs text-gray-400 hover:text-white transition">← Back to App</Link>
      </div>

      {/* Admin sub-nav */}
      <div className="bg-white border-b border-gray-200 overflow-x-auto scrollbar-hide">
        <div className="flex w-max min-w-full">
          {NAV.map(({ href, icon: Icon, label }) => {
            const active = href === '/admin' ? pathname === href : pathname.startsWith(href);
            return (
              <Link key={href} href={href}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                  active
                    ? 'border-yellow-400 text-gray-900'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon size={15} className={active ? 'text-yellow-500' : 'text-gray-400'}/>
                {label}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">{children}</div>
    </div>
  );
}