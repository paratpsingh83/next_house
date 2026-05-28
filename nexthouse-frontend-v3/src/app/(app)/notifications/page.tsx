'use client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, Loader2, Check, CheckCheck } from 'lucide-react';
import { notificationsApi } from '@/api';
import { useAppDispatch } from '@/store';
import { markAllRead, markOneRead, setUnread } from '@/store/slices/notifSlice';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

export default function NotificationsPage() {
  const dispatch = useAppDispatch();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey:['notifications'], queryFn:()=>notificationsApi.getAll(false,0,50) });
  const items = data?.content ?? [];
  const handleMarkOne = async (id:number) => { try { await notificationsApi.markRead(id); dispatch(markOneRead(id)); qc.invalidateQueries({queryKey:['notifications']}); } catch{} };
  const handleMarkAll = async () => { try { await notificationsApi.markAllRead(); dispatch(markAllRead()); dispatch(setUnread(0)); qc.invalidateQueries({queryKey:['notifications']}); toast.success('All marked as read'); } catch{toast.error('Failed');} };
  return (
    <div className="px-4 py-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-900">Notifications</h1>
        {items.some(n=>!n.read)&&<button onClick={handleMarkAll} className="flex items-center gap-1.5 text-sm text-primary-600 hover:underline"><CheckCheck size={16}/>Mark all read</button>}
      </div>
      {isLoading&&<div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary-500" size={28}/></div>}
      {!isLoading&&items.length===0&&<div className="text-center py-16 text-gray-400"><Bell size={40} className="mx-auto mb-3 opacity-30"/><p>All caught up!</p></div>}
      <div className="space-y-1">
        {items.map(n=>(
          <div key={n.id} className={`flex items-start gap-3 px-3 py-3 rounded-xl transition cursor-pointer ${!n.read?'bg-primary-50 hover:bg-primary-100':'hover:bg-gray-50'}`} onClick={()=>!n.read&&handleMarkOne(n.id)}>
            <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
              {n.sender?.profileImage?<img src={n.sender.profileImage} className="w-full h-full object-cover" alt=""/>:<span className="text-primary-600 font-bold text-sm">{(n.sender?.name??'N')[0]}</span>}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm ${!n.read?'font-semibold text-gray-900':'text-gray-700'}`}>{n.title}</p>
              {n.message&&<p className="text-xs text-gray-500 mt-0.5 truncate">{n.message}</p>}
              <p className="text-xs text-gray-400 mt-1">{formatDistanceToNow(new Date(n.createdAt),{addSuffix:true})}</p>
            </div>
            {!n.read&&<div className="w-2.5 h-2.5 rounded-full bg-primary-500 flex-shrink-0 mt-1.5"/>}
          </div>
        ))}
      </div>
    </div>
  );
}
