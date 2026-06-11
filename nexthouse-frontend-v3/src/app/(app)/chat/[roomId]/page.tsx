'use client';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useInfiniteQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { useInView } from 'react-intersection-observer';
import { ArrowLeft, Loader2, Users } from 'lucide-react';
import { chatApi } from '@/api';
import { wsClient } from '@/lib/ws';
import { useAppDispatch, useAppSelector } from '@/store';
import { appendMessage, setTyping } from '@/store/slices/chatSlice';
import { format, isToday, isYesterday } from 'date-fns';
import Link from 'next/link';
import toast from 'react-hot-toast';
import type { ChatMessageResponse, PageResponse } from '@/types';
import MessageBubble from '@/components/chat/MessageBubble';
import TypingIndicator from '@/components/chat/TypingIndicator';
import ChatInput from '@/components/chat/ChatInput';

function getDateLabel(dateStr: string) {
  const d = new Date(dateStr);
  if (isToday(d))     return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'MMMM d, yyyy');
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
  const [replyTo, setReplyTo] = useState<{ id: number; preview: string } | null>(null);
  const bottomRef    = useRef<HTMLDivElement>(null);
  const lastMsgIdRef = useRef<number | null>(null);
  const typingTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rId = Number(roomId);

  const { data: room } = useQuery({
    queryKey: ['chat', 'room', rId],
    queryFn:  () => chatApi.getRoomDetails(rId),
  });

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['chat', 'history', rId],
    queryFn:  ({ pageParam = 0 }) => chatApi.getHistory(rId, pageParam, 30),
    getNextPageParam: l => l.hasNext ? l.page + 1 : undefined,
    initialPageParam: 0,
  });

  const messages = useMemo(
    () => data?.pages.flatMap(p => p.content).reverse() ?? [],
    [data]
  );

  const { ref: topRef, inView: topInView } = useInView({ threshold: 0.1 });
  useEffect(() => {
    if (topInView && hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [topInView, hasNextPage, isFetchingNextPage]);

  useEffect(() => {
    let unsubMsg    = () => {};
    let unsubTyping = () => {};

    const cancelDeferred = wsClient.onceConnected(() => {
      unsubMsg = wsClient.onRoomMessage(rId, msg => {
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

  useEffect(() => {
    const latestId = messages[messages.length - 1]?.id ?? null;
    if (latestId !== null && latestId !== lastMsgIdRef.current) {
      lastMsgIdRef.current = latestId;
      if (!isFetchingNextPage) {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [messages]);

  const handleTextChange = (v: string) => {
    setText(v);
    wsClient.sendTyping(rId, true);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => wsClient.sendTyping(rId, false), 2000);
  };

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

  const sendImage = useCallback((mediaUrl: string) => {
    if (!wsClient.isConnected()) { toast.error('Not connected. Please wait…'); return; }
    wsClient.sendMessage(rId, { messageType: 'IMAGE', mediaUrl });
  }, [rId]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

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

  const unsend = async (messageId: number) => {
    try {
      await chatApi.unsendMessage(rId, messageId);
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

  const handleReact = async (messageId: number, emoji: string) => {
    try {
      const updated = await chatApi.react(rId, messageId, emoji);
      qc.setQueryData<InfiniteData<PageResponse<ChatMessageResponse>>>(
        ['chat', 'history', rId],
        old => !old ? old : {
          ...old,
          pages: old.pages.map(page => ({
            ...page,
            content: page.content.map(m => m.id === updated.id ? { ...m, reactions: updated.reactions } : m),
          })),
        }
      );
    } catch { toast.error('Failed to react'); }
  };

  const typingNames = typingUsers
    .filter(uid => uid !== me?.id)
    .map(uid => room?.members?.find(m => m.id === uid)?.name ?? 'Someone');

  const isGroup     = room?.roomType === 'GROUP' || room?.roomType === 'COMMUNITY';
  const otherMember = !isGroup ? room?.members?.find(m => m.id !== me?.id) : undefined;

  return (
    <div className="flex flex-col h-screen bg-white max-w-md mx-auto">

      {/* Header */}
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

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1 scrollbar-hide">
        <div ref={topRef} className="h-1"/>
        {isFetchingNextPage && (
          <div className="flex justify-center py-2"><Loader2 className="animate-spin text-primary-400" size={18}/></div>
        )}
        {isLoading && (
          <div className="flex justify-center py-8"><Loader2 className="animate-spin text-primary-500" size={28}/></div>
        )}

        {messages.map((msg, idx) => {
          const isMine    = msg.sender.id === me?.id;
          const prevMsg   = messages[idx - 1];
          const showDate  = !prevMsg || getDateLabel(prevMsg.createdAt) !== getDateLabel(msg.createdAt);
          const showAvatar = !isMine && (!prevMsg || prevMsg.sender.id !== msg.sender.id);

          return (
            <div key={msg.id}>
              {showDate && (
                <div className="flex items-center gap-2 my-4">
                  <div className="flex-1 h-px bg-gray-100"/>
                  <span className="text-xs text-gray-400 font-medium px-2">{getDateLabel(msg.createdAt)}</span>
                  <div className="flex-1 h-px bg-gray-100"/>
                </div>
              )}
              <MessageBubble
                msg={msg}
                isMine={isMine}
                isGroup={isGroup}
                showAvatar={showAvatar}
                onReply={(id, preview) => setReplyTo({ id, preview })}
                onUnsend={unsend}
                onDelete={deleteForMe}
                onReact={handleReact}
              />
            </div>
          );
        })}

        <TypingIndicator names={typingNames}/>
        <div ref={bottomRef}/>
      </div>

      <ChatInput
        text={text}
        onChange={handleTextChange}
        onSend={send}
        onSendImage={sendImage}
        onKeyDown={handleKey}
        sending={sending}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
      />
    </div>
  );
}