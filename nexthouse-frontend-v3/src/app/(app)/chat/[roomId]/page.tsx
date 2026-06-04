'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useInView } from 'react-intersection-observer';
import { ArrowLeft, Send, Loader2, Trash2, Reply, Users, Phone } from 'lucide-react';
import { chatApi } from '@/api';
import { wsClient } from '@/lib/ws';
import { useAppDispatch, useAppSelector } from '@/store';
import { appendMessage, setTyping } from '@/store/slices/chatSlice';
import { format, isToday, isYesterday } from 'date-fns';
import Link from 'next/link';
import toast from 'react-hot-toast';

function formatMsgTime(dateStr: string) {
  const d = new Date(dateStr);
  if (isToday(d))     return format(d, 'h:mm a');
  if (isYesterday(d)) return `Yesterday ${format(d, 'h:mm a')}`;
  return format(d, 'MMM d, h:mm a');
}

export default function ChatRoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const router     = useRouter();
  const dispatch   = useAppDispatch();
  const qc         = useQueryClient();
  const me         = useAppSelector(s => s.auth.user);
  const typingUsers = useAppSelector(s => s.chat.typing[Number(roomId)] ?? []);

  const [text,     setText]     = useState('');
  const [sending,  setSending]  = useState(false);
  const [replyTo,  setReplyTo]  = useState<{id:number;preview:string}|null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout>|null>(null);
  const rId = Number(roomId);

  // ── Room details ──────────────────────────────────────────────────────────
  const { data: room } = useQuery({
    queryKey: ['chat','room', rId],
    queryFn:  () => chatApi.getRoomDetails(rId),
  });

  // ── Message history ───────────────────────────────────────────────────────
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['chat','history', rId],
    queryFn:  ({ pageParam = 0 }) => chatApi.getHistory(rId, pageParam, 30),
    getNextPageParam: l => l.hasNext ? l.page + 1 : undefined,
    initialPageParam: 0,
  });

  // Pages come in newest-first; flatten + reverse for display
  const messages = data?.pages.flatMap(p => p.content).reverse() ?? [];

  const { ref: topRef, inView: topInView } = useInView({ threshold: 0.1 });
  useEffect(() => {
    if (topInView && hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [topInView, hasNextPage, isFetchingNextPage]);

  // ── WebSocket subscriptions ───────────────────────────────────────────────
  useEffect(() => {
    let unsubMsg   = () => {};
    let unsubTyping = () => {};

    // onceConnected handles the race where WS is still connecting at mount time
    // (e.g. page refresh directly to a chat URL). Also re-runs on WS reconnect.
    const cancelDeferred = wsClient.onceConnected(() => {
      unsubMsg = wsClient.onRoomMessage(rId, msg => {
        dispatch(appendMessage({ roomId: rId, message: msg }));
        qc.invalidateQueries({ queryKey: ['chat','history', rId] });
        wsClient.markRead(rId);
      });
      unsubTyping = wsClient.onTyping(rId, ({ userId, typing }) => {
        dispatch(setTyping({ roomId: rId, userId, typing }));
      });
    });

    chatApi.markRead(rId).catch(() => {});

    return () => { cancelDeferred(); unsubMsg(); unsubTyping(); };
  }, [rId]);

  // ── Auto scroll to bottom ─────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // ── Typing indicator ──────────────────────────────────────────────────────
  const handleTextChange = (v: string) => {
    setText(v);
    wsClient.sendTyping(rId, true);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => wsClient.sendTyping(rId, false), 2000);
  };

  // ── Send message ──────────────────────────────────────────────────────────
  const send = useCallback(async () => {
    if (!text.trim()) return;
    setSending(true);
    const msg = text;
    setText('');
    wsClient.sendTyping(rId, false);
    try {
      await chatApi.sendMessage(rId, {
        message:         msg,
        messageType:     'TEXT',
        replyToMessageId: replyTo?.id,
      });
      setReplyTo(null);
      qc.invalidateQueries({ queryKey: ['chat','history', rId] });
    } catch {
      setText(msg);
      toast.error('Failed to send');
    } finally { setSending(false); }
  }, [text, rId, replyTo]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  // ── Delete message ────────────────────────────────────────────────────────
  const deleteMessage = async (messageId: number) => {
    try {
      await chatApi.deleteMessage(rId, messageId);
      qc.invalidateQueries({ queryKey: ['chat','history', rId] });
      toast('Message deleted');
    } catch { toast.error('Failed'); }
  };

  // ── Typing display ────────────────────────────────────────────────────────
  const typingNames = typingUsers
    .filter(uid => uid !== me?.id)
    .map(uid => room?.members?.find(m => m.id === uid)?.name ?? 'Someone');

  const isGroup     = room?.roomType === 'GROUP' || room?.roomType === 'COMMUNITY';
  const otherMember = !isGroup ? room?.members?.find(m => m.id !== me?.id) : undefined;

  // ── Group messages by date ────────────────────────────────────────────────
  const getDateLabel = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isToday(d))     return 'Today';
    if (isYesterday(d)) return 'Yesterday';
    return format(d, 'MMMM d, yyyy');
  };

  return (
    <div className="flex flex-col h-screen bg-white max-w-md mx-auto">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
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
            {/* Online indicator for DM */}
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

      {/* ── Messages ───────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1 scrollbar-hide">

        {/* Load more trigger */}
        <div ref={topRef} className="h-1"/>
        {isFetchingNextPage && <div className="flex justify-center py-2"><Loader2 className="animate-spin text-primary-400" size={18}/></div>}
        {isLoading && <div className="flex justify-center py-8"><Loader2 className="animate-spin text-primary-500" size={28}/></div>}

        {messages.map((msg, idx) => {
          const isMine   = msg.sender.id === me?.id;
          const prevMsg  = messages[idx - 1];
          const showDate = !prevMsg || getDateLabel(prevMsg.createdAt) !== getDateLabel(msg.createdAt);
          const showAvatar = !isMine && (!prevMsg || prevMsg.sender.id !== msg.sender.id);

          return (
            <div key={msg.id}>
              {/* Date separator */}
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
                  {/* Sender name (group only) */}
                  {isGroup && !isMine && showAvatar && (
                    <span className="text-xs text-gray-400 mb-1 ml-1">{msg.sender.name}</span>
                  )}

                  {/* Reply preview */}
                  {msg.replyToPreview && (
                    <div className={`text-xs px-3 py-1.5 rounded-lg mb-0.5 max-w-full truncate ${isMine ? 'bg-primary-400/30 text-white' : 'bg-gray-200 text-gray-600'}`}>
                      ↩ {msg.replyToPreview}
                    </div>
                  )}

                  {/* Message bubble */}
                  <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    isMine
                      ? 'bg-primary-500 text-white rounded-br-sm'
                      : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                  }`}>
                    {msg.isDeleted
                      ? <span className="italic opacity-50 text-xs">Message deleted</span>
                      : msg.message
                    }
                  </div>

                  {/* Time + actions */}
                  <div className={`flex items-center gap-2 mt-0.5 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
                    <span className="text-[10px] text-gray-400">{formatMsgTime(msg.createdAt)}</span>

                    {/* Action buttons (appear on hover) */}
                    {!msg.isDeleted && (
                      <div className="hidden group-hover:flex items-center gap-1">
                        <button
                          onClick={() => setReplyTo({ id: msg.id, preview: (msg.message ?? '').slice(0, 50) })}
                          className="p-1 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200"
                        >
                          <Reply size={12}/>
                        </button>
                        {isMine && (
                          <button
                            onClick={() => deleteMessage(msg.id)}
                            className="p-1 rounded-lg bg-gray-100 text-red-400 hover:bg-red-50"
                          >
                            <Trash2 size={12}/>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Spacer for my messages (no avatar) */}
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

      {/* ── Reply preview ───────────────────────────────────────────────────── */}
      {replyTo && (
        <div className="px-4 py-2 bg-primary-50 border-t border-primary-100 flex items-center gap-2 flex-shrink-0">
          <Reply size={14} className="text-primary-500 flex-shrink-0"/>
          <p className="text-xs text-primary-700 flex-1 truncate">Replying to: {replyTo.preview}</p>
          <button onClick={() => setReplyTo(null)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
        </div>
      )}

      {/* ── Input ──────────────────────────────────────────────────────────── */}
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
