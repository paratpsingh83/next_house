'use client';
import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { ArrowLeft, Send, Loader2, Trash2 } from 'lucide-react';
import { chatApi } from '@/api';
import { wsClient } from '@/lib/ws';
import { useAppDispatch, useAppSelector } from '@/store';
import { appendMessage } from '@/store/slices/chatSlice';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

export default function ChatRoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const me = useAppSelector(s=>s.auth.user);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const rId = Number(roomId);

  const { data: room } = useQuery({ queryKey:['chat','room',rId], queryFn:()=>chatApi.getRoomDetails(rId) });
  const { data, isLoading } = useQuery({ queryKey:['chat','history',rId], queryFn:()=>chatApi.getHistory(rId,0,50) });
  const messages = data?.content?.slice().reverse()??[];

  useEffect(()=>{
    const unsub = wsClient.onRoomMessage(rId, msg => { dispatch(appendMessage({roomId:rId, message:msg})); });
    chatApi.markRead(rId).catch(()=>{});
    return ()=>unsub();
  },[rId]);

  useEffect(()=>{ bottomRef.current?.scrollIntoView({behavior:'smooth'}); },[messages.length]);

  const send = async () => {
    if(!text.trim()) return;
    setSending(true);
    const t = text; setText('');
    try { await chatApi.sendMessage(rId,{message:t,messageType:'TEXT'}); }
    catch { setText(t); toast.error('Failed to send'); }
    finally { setSending(false); }
  };

  const handleKey = (e:React.KeyboardEvent) => { if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); send(); } };

  return (
    <div className="flex flex-col h-screen max-h-screen bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-white sticky top-0 z-10">
        <button onClick={()=>router.back()} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100"><ArrowLeft size={20}/></button>
        <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center overflow-hidden">
          {room?.avatarUrl?<img src={room.avatarUrl} className="w-full h-full object-cover" alt=""/>:<span className="text-primary-600 font-bold">{(room?.title??'?')[0].toUpperCase()}</span>}
        </div>
        <div className="flex-1 min-w-0"><p className="font-semibold truncate">{room?.title??'Chat'}</p><p className="text-xs text-gray-400">{room?.memberCount??0} members</p></div>
      </div>
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 scrollbar-hide">
        {isLoading&&<div className="flex justify-center py-8"><Loader2 className="animate-spin text-primary-400" size={22}/></div>}
        {messages.map(msg=>{
          const isMine = msg.sender.id === me?.id;
          return(
            <div key={msg.id} className={`flex ${isMine?'justify-end':'justify-start'} gap-2`}>
              {!isMine&&<div className="w-7 h-7 rounded-full bg-gray-200 flex-shrink-0 overflow-hidden flex items-center justify-center mt-auto">
                {msg.sender.profileImage?<img src={msg.sender.profileImage} className="w-full h-full object-cover" alt=""/>:<span className="text-xs font-bold text-gray-600">{msg.sender.name[0]}</span>}
              </div>}
              <div className={`max-w-[75%] ${isMine?'items-end':'items-start'} flex flex-col`}>
                {!isMine&&<span className="text-xs text-gray-400 mb-0.5 ml-1">{msg.sender.name}</span>}
                <div className={`px-4 py-2.5 rounded-2xl text-sm ${isMine?'bg-primary-500 text-white rounded-br-sm':'bg-gray-100 text-gray-800 rounded-bl-sm'}`}>
                  {msg.isDeleted?<span className="italic opacity-60">Message deleted</span>:msg.message}
                </div>
                <span className="text-[10px] text-gray-400 mt-0.5 mx-1">{formatDistanceToNow(new Date(msg.createdAt),{addSuffix:true})}</span>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef}/>
      </div>
      {/* Input */}
      <div className="px-4 py-3 border-t border-gray-100 bg-white">
        <div className="flex items-end gap-2">
          <textarea value={text} onChange={e=>setText(e.target.value)} onKeyDown={handleKey} rows={1} placeholder="Type a message…" className="input flex-1 resize-none max-h-32 py-2.5 text-sm"/>
          <button onClick={send} disabled={sending||!text.trim()} className="btn-primary p-2.5 rounded-xl flex-shrink-0">
            {sending?<Loader2 size={18} className="animate-spin"/>:<Send size={18}/>}
          </button>
        </div>
      </div>
    </div>
  );
}
