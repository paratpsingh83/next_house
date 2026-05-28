'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, User, Lock, Bell, Shield, Trash2, ChevronRight } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store';
import { clearAuth } from '@/store/slices/authSlice';
import { authApi } from '@/api';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const dispatch = useAppDispatch();
  const router   = useRouter();
  const user = useAppSelector(s=>s.auth.user);
  const [loading, setLoading] = useState(false);

  const logout = async () => {
    setLoading(true);
    try { await authApi.logout(); } catch {}
    dispatch(clearAuth()); router.push('/login'); toast.success('Logged out');
    setLoading(false);
  };

  const sections = [
    { title:'Account', items:[
      { icon:User,  label:'Edit profile',     href:'/settings/profile' },
      { icon:Lock,  label:'Change password',  href:'/settings/password' },
    ]},
    { title:'Notifications', items:[
      { icon:Bell,   label:'Push notifications',  href:'/settings/notifications' },
    ]},
    { title:'Privacy & Safety', items:[
      { icon:Shield, label:'Privacy settings', href:'/settings/privacy' },
    ]},
  ];

  return (
    <div className="px-4 py-4 space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Settings</h1>
      {/* Profile card */}
      {user&&<div className="card p-4 flex items-center gap-3" onClick={()=>router.push(`/profile/${user.id}`)}>
        <div className="w-14 h-14 rounded-full bg-primary-100 overflow-hidden flex items-center justify-center">
          {user.profileImage?<img src={user.profileImage} className="w-full h-full object-cover" alt=""/>:<span className="text-primary-600 font-bold text-xl">{user.name[0]}</span>}
        </div>
        <div><p className="font-semibold text-gray-900">{user.name}</p><p className="text-sm text-gray-400">@{user.username}</p></div>
        <ChevronRight size={18} className="text-gray-300 ml-auto"/>
      </div>}
      {sections.map(s=>(
        <div key={s.title}>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{s.title}</p>
          <div className="card divide-y divide-gray-50">
            {s.items.map(item=>(
              <button key={item.label} onClick={()=>router.push(item.href)} className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition text-left">
                <item.icon size={18} className="text-gray-500"/>
                <span className="text-sm text-gray-700 flex-1">{item.label}</span>
                <ChevronRight size={16} className="text-gray-300"/>
              </button>
            ))}
          </div>
        </div>
      ))}
      {/* Logout */}
      <div className="space-y-2">
        <button onClick={logout} disabled={loading} className="w-full flex items-center gap-3 px-4 py-3.5 bg-white border border-gray-100 rounded-xl text-red-500 hover:bg-red-50 transition">
          <LogOut size={18}/><span className="text-sm font-medium">Log out</span>
        </button>
      </div>
    </div>
  );
}
