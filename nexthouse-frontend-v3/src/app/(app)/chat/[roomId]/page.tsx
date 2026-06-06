'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useInfiniteQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { useInView } from 'react-intersection-observer';
import { ArrowLeft, Send, Loader2, Trash2, Reply, Users, Undo2 } from 'lucide-react';
import { chatApi } from '@/api';
import { wsClient } from '@/lib/ws';
import { useAppDispatch, useAppSelector } from '@/store';
import { appendMessage, setTyping } from '@/store/slices/chatSlice';
import { format, isToday, isYesterday } from 'date-fns';
import Link from 'next/link';
import toast from 'react-hot-toast';
import type { ChatMessageResponse, PageResponse } from '@/types';

function formatMsgTime(dateStr: string) {
  const d = new Date(dateStr);
  if (isToday(d))     return format(d, 'h:mm a');
  if (isYesterday(d)) return `Yesterday ${format(d, 'h:mm a')}`;
  return format(d, 'MMM d, h:mm a');
}

function canUnsend(createdAt: string) {
  return Date.now() - new Date(createdAt).getTime() < 60_000;
}

export default function ChatRoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const router     = useRouter();
  const dispatch   = useAppDispatch();
  const qc         = useQueryClient();
  const me         = useAppSelector(s => s.auth.user);
  const typingUsers = useAppSelector(s => s.chat.typing[Number(roomId)] ?? []);

  const [text,    setText]    = useState('');
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<{id:number;preview:string}|null>(null);
  const bottomRef    = useRef<HTMLDivElement>(null);
  const lastMsgIdRef = useRef<number | null>(null);
  const typingTimer  = useRef<ReturnType<typeof setTimeout>|null>(null);
  const rId = Number(roomId);

  // ── Room details ────────────────────────────────────────────────────────────
  const { data: room } = useQuery({
    queryKey: ['chat', 'room', rId],
    queryFn:  () => chatApi.getRoomDetails(rId),
  });

  // ── Message history ─────────────────────────────────────────────────────────
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['chat', 'history', rId],
    queryFn:  ({ pageParam = 0 }) => chatApi.getHistory(rId, pageParam, 30),
    getNextPageParam: l => l.hasNext ? l.page + 1 : undefined,
    initialPageParam: 0,
  });

  // Pages come newest-first; reverse for bottom-up display
  const messages = data?.pages.flatMap(p => p.content).reverse() ?? [];

  const { ref: topRef, inView: topInView } = useInView({ threshold: 0.1 });
  useEffect(() => {
    if (topInView && hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [topInView, hasNextPage, isFetchingNextPage]);

  // ── WebSocket subscriptions ──────────────────────────────────────────────────
  useEffect(() => {
    let unsubMsg    = () => {};
    let unsubTyping = () => {};

    const cancelDeferred = wsClient.onceConnected(() => {
      unsubMsg = wsClient.onRoomMessage(rId, msg => {
        // Update existing message (e.g. unsend broadcast) OR append new one
        qc.setQueryData<InfiniteData<PageResponse<ChatMessageResponse>>>(
          ['chat', 'history', rId],
          old => {
            if (!old || !old.pages.length) return old;
            let found = false;
            const pages = old.pages.map(page => ({
              ...page,
              content: page.content.map(m => {
                if (m.id === msg.id) { found = true; return msg; }
                return m;
              }),
            }));
            if (!found) {
              // New message — prepend to first page so it ends up at bottom after reverse
              pages[0] = { ...pages[0], content: [msg, ...pages[0].content] };
            }
            return { ...old, pages };
          }
        );
        dispatch(appendMessage({ roomId: rId, message: msg }));
        wsClient.markRead(rId);
      });

      unsubTyping = wsClient.onTyping(rId, ({ userId, typing }) => {
        dispatch(setTyping({ roomId: rId, userId, typing }));
      });
    });

    chatApi.markRead(rId).catch(() => {});
    return () => { cancelDeferred(); unsubMsg(); unsubTyping(); };
  }, [rId]);

  // ── Auto scroll to bottom (only on new incoming messages, not history loads) ─
  useEffect(() => {
    const latestId = messages[messages.length - 1]?.id ?? null;
    if (latestId !== null && latestId !== lastMsgIdRef.current) {
      lastMsgIdRef.current = latestId;
      // Only smooth-scroll if it's a genuinely new message, not paginating old history
      if (!isFetchingNextPage) {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [messages]);

  // ── Typing indicator ────────────────────────────────────────────────────────
  const handleTextChange = (v: string) => {
    setText(v);
    wsClient.sendTyping(rId, true);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => wsClient.sendTyping(rId, false), 2000);
  };

  // ── Send ────────────────────────────────────────────────────────────────────
  const send = useCallback(async () => {
    if (!text.trim()) return;
    if (!wsClient.isConnected()) { toast.error('Not connected. Please wait…'); return; }
    const msg = text;
    setText('');
    setReplyTo(null);
    wsClient.sendTyping(rId, false);
    try {
      wsClient.sendMessage(rId, { message: msg, messageType: 'TEXT', replyToMessageId: replyTo?.id });
    } catch {
      setText(msg);
      toast.error('Failed to send');
    }
  }, [text, rId, replyTo]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  // ── Delete for me ───────────────────────────────────────────────────────────
  const deleteForMe = async (messageId: number) => {
    try {
      await chatApi.deleteMessage(rId, messageId);
      qc.setQueryData<InfiniteData<PageResponse<ChatMessageResponse>>>(
        ['chat', 'history', rId],
        old => !old ? old : {
          ...old,
          pages: old.pages.map(page => ({
            ...page,
            content: page.content.filter(m => m.id !== messageId),
          })),
        }
      );
      toast('Deleted for you');
    } catch { toast.error('Failed to delete'); }
  };

  // ── Unsend (within 1 minute) ────────────────────────────────────────────────
  const unsend = async (messageId: number) => {
    try {
      await chatApi.unsendMessage(rId, messageId);
      // Backend broadcasts the updated message via WS; also update locally now
      qc.setQueryData<InfiniteData<PageResponse<ChatMessageResponse>>>(
        ['chat', 'history', rId],
        old => !old ? old : {
          ...old,
          pages: old.pages.map(page => ({
            ...page,
            content: page.content.map(m =>
              m.id === messageId ? { ...m, isUnsent: true, message: undefined } : m
            ),
          })),
        }
      );
      toast('Message unsent');
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Cannot unsend');
    }
  };

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const typingNames = typingUsers
    .filter(uid => uid !== me?.id)
    .map(uid => room?.members?.find(m => m.id === uid)?.name ?? 'Someone');

  const isGroup      = room?.roomType === 'GROUP' || room?.roomType === 'COMMUNITY';
  const otherMember  = !isGroup ? room?.members?.find(m => m.id !== me?.id) : undefined;

  const getDateLabel = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isToday(d))     return 'Today';
    if (isYesterday(d)) return 'Yesterday';
    return format(d, 'MMMM d, yyyy');
  };

  return (
    <div className="flex flex-col h-screen bg-white max-w-md mx-auto">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-white flex-shrink-0 shadow-sm">
        <button onClick={() => router.back()} className="p-1.5 rounded-xl text-gray-500 hover:bg-gray-100 flex-shrink-0">
          <ArrowLeft size={20}/>
        </button>

        <Link href={isGroup ? '#' : otherMember ? `/profile/${otherMember.id}` : '#'} className="flex items-center gap-2.5 flex-1 min-w-0">
          <div className="w-9 h-9 rounded-full bg-primary-100 overflow-hidden flex items-center justify-center flex-shrink-0 relative">
            {room?.avatarUrl
              ? <img src={room.avatarUrl} className="w-full h-full object-cover" alt=""/>
              : <span className="text-primary-600 font-bold text-sm">{(room?.title ?? '?')[0].toUpperCase()}</span>
            }
            {otherMember?.online && (
              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-white"/>
            )}
          </div>
          <div className="min-w-0">
            <p className="font-bold text-sm text-gray-900 truncate">{room?.title ?? 'Chat'}</p>
            <p className="text-xs text-gray-400">
              {isGroup
                ? `${room?.memberCount ?? 0} members`
                : otherMember?.online ? '🟢 Online' : 'Offline'
              }
            </p>
          </div>
        </Link>

        {isGroup && (
          <button className="p-1.5 rounded-xl text-gray-500 hover:bg-gray-100 flex-shrink-0">
            <Users size={20}/>
          </button>
        )}
      </div>

      {/* ── Messages ────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1 scrollbar-hide">
        <div ref={topRef} className="h-1"/>
        {isFetchingNextPage && <div className="flex justify-center py-2"><Loader2 className="animate-spin text-primary-400" size={18}/></div>}
        {isLoading && <div className="flex justify-center py-8"><Loader2 className="animate-spin text-primary-500" size={28}/></div>}

        {messages.map((msg, idx) => {
          const isMine    = msg.sender.id === me?.id;
          const prevMsg   = messages[idx - 1];
          const showDate  = !prevMsg || getDateLabel(prevMsg.createdAt) !== getDateLabel(msg.createdAt);
          const showAvatar = !isMine && (!prevMsg || prevMsg.sender.id !== msg.sender.id);

          // Receiver never sees unsent messages
          if (msg.isUnsent && !isMine) return null;

          return (
            <div key={msg.id}>
              {showDate && (
                <div className="flex items-center gap-2 my-4">
                  <div className="flex-1 h-px bg-gray-100"/>
                  <span className="text-xs text-gray-400 font-medium px-2">{getDateLabel(msg.createdAt)}</span>
                  <div className="flex-1 h-px bg-gray-100"/>
                </div>
              )}

              <div className={`flex ${isMine ? 'justify-end' : 'justify-start'} gap-2 group`}>
                {/* Avatar */}
                {!isMine && (
                  <div className={`w-7 h-7 rounded-full bg-gray-200 flex-shrink-0 overflow-hidden flex items-center justify-center mt-auto ${showAvatar ? 'opacity-100' : 'opacity-0'}`}>
                    {msg.sender.profileImage
                      ? <img src={msg.sender.profileImage} className="w-full h-full object-cover" alt=""/>
                      : <span className="text-xs font-bold text-gray-600">{msg.sender.name[0]}</span>
                    }
                  </div>
                )}

                <div className={`max-w-[75%] flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                  {isGroup && !isMine && showAvatar && (
                    <span className="text-xs text-gray-400 mb-1 ml-1">{msg.sender.name}</span>
                  )}

                  {/* Reply preview */}
                  {msg.replyToPreview && !msg.isUnsent && (
                    <div className={`text-xs px-3 py-1.5 rounded-lg mb-0.5 max-w-full truncate ${isMine ? 'bg-primary-400/30 text-white' : 'bg-gray-200 text-gray-600'}`}>
                      ↩ {msg.replyToPreview}
                    </div>
                  )}

                  {/* Message bubble */}
                  <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    isMine
                      ? msg.isUnsent
                        ? 'bg-gray-100 text-gray-400 rounded-br-sm'
                        : 'bg-primary-500 text-white rounded-br-sm'
                      : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                  }`}>
                    {msg.isUnsent
                      ? <span className="italic text-xs">You unsent a message</span>
                      : msg.isDeleted
                        ? <span className="italic opacity-50 text-xs">Message deleted</span>
                        : msg.message
                    }
                  </div>

                  {/* Time + action buttons */}
                  <div className={`flex items-center gap-2 mt-0.5 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
                    <span className="text-[10px] text-gray-400">{formatMsgTime(msg.createdAt)}</span>

                    {!msg.isDeleted && !msg.isUnsent && (
                      <div className="hidden group-hover:flex items-center gap-1">
                        {/* Reply — shown for all messages */}
                        <button
                          onClick={() => setReplyTo({ id: msg.id, preview: (msg.message ?? '').slice(0, 50) })}
                          className="p-1 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200"
                        >
                          <Reply size={12}/>
                        </button>

                        {/* Unsend — only mine, only within 1 minute */}
                        {isMine && canUnsend(msg.createdAt) && (
                          <button
                            onClick={() => unsend(msg.id)}
                            className="p-1 rounded-lg bg-gray-100 text-orange-400 hover:bg-orange-50"
                            title="Unsend (removes for everyone)"
                          >
                            <Undo2 size={12}/>
                          </button>
                        )}

                        {/* Delete for me — shown for all messages */}
                        <button
                          onClick={() => deleteForMe(msg.id)}
                          className="p-1 rounded-lg bg-gray-100 text-red-400 hover:bg-red-50"
                          title="Delete for me"
                        >
                          <Trash2 size={12}/>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {isMine && <div className="w-7 flex-shrink-0"/>}
              </div>
            </div>
          );
        })}

        {/* Typing indicator */}
        {typingNames.length > 0 && (
          <div className="flex items-center gap-2 pl-9">
            <div className="px-4 py-2.5 rounded-2xl rounded-bl-sm bg-gray-100 flex items-center gap-1">
              <div className="flex gap-1">
                {[0,1,2].map(i => (
                  <div key={i} className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: `${i*0.15}s` }}/>
                ))}
              </div>
            </div>
            <span className="text-xs text-gray-400">{typingNames[0]} is typing…</span>
          </div>
        )}

        <div ref={bottomRef}/>
      </div>

      {/* ── Reply preview ────────────────────────────────────────────────────── */}
      {replyTo && (
        <div className="px-4 py-2 bg-primary-50 border-t border-primary-100 flex items-center gap-2 flex-shrink-0">
          <Reply size={14} className="text-primary-500 flex-shrink-0"/>
          <p className="text-xs text-primary-700 flex-1 truncate">Replying to: {replyTo.preview}</p>
          <button onClick={() => setReplyTo(null)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
        </div>
      )}

      {/* ── Input ────────────────────────────────────────────────────────────── */}
      <div className="px-4 py-3 border-t border-gray-100 bg-white flex-shrink-0 safe-pb">
        <div className="flex items-end gap-2">
          <textarea
            value={text}
            onChange={e => handleTextChange(e.target.value)}
            onKeyDown={handleKey}
            rows={1}
            placeholder="Type a message…"
            className="input flex-1 resize-none max-h-32 py-2.5 text-sm"
          />
          <button
            onClick={send}
            disabled={sending || !text.trim()}
            className="btn-primary p-2.5 rounded-xl flex-shrink-0 aspect-square"
          >
            {sending ? <Loader2 size={18} className="animate-spin"/> : <Send size={18}/>}
          </button>
        </div>
      </div>
    </div>
  );
}