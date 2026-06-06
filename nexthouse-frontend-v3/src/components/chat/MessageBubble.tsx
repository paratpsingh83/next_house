'use client';
import type { ChatMessageResponse } from '@/types';
import { Reply, Undo2, Trash2 } from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';

export function formatMsgTime(dateStr: string) {
  const d = new Date(dateStr);
  if (isToday(d))     return format(d, 'h:mm a');
  if (isYesterday(d)) return `Yesterday ${format(d, 'h:mm a')}`;
  return format(d, 'MMM d, h:mm a');
}

export function canUnsend(createdAt: string) {
  return Date.now() - new Date(createdAt).getTime() < 60_000;
}

interface Props {
  msg: ChatMessageResponse;
  isMine: boolean;
  isGroup: boolean;
  showAvatar: boolean;
  onReply: (id: number, preview: string) => void;
  onUnsend: (id: number) => void;
  onDelete: (id: number) => void;
}

export default function MessageBubble({ msg, isMine, isGroup, showAvatar, onReply, onUnsend, onDelete }: Props) {
  if (msg.isUnsent && !isMine) return null;

  return (
    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'} gap-2 group`}>
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

        {msg.replyToPreview && !msg.isUnsent && (
          <div className={`text-xs px-3 py-1.5 rounded-lg mb-0.5 max-w-full truncate ${
            isMine ? 'bg-primary-400/30 text-white' : 'bg-gray-200 text-gray-600'
          }`}>
            ↩ {msg.replyToPreview}
          </div>
        )}

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

        <div className={`flex items-center gap-2 mt-0.5 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
          <span className="text-[10px] text-gray-400">{formatMsgTime(msg.createdAt)}</span>

          {!msg.isDeleted && !msg.isUnsent && (
            <div className="hidden group-hover:flex items-center gap-1">
              <button
                onClick={() => onReply(msg.id, (msg.message ?? '').slice(0, 50))}
                className="p-1 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200"
              >
                <Reply size={12}/>
              </button>
              {isMine && canUnsend(msg.createdAt) && (
                <button
                  onClick={() => onUnsend(msg.id)}
                  className="p-1 rounded-lg bg-gray-100 text-orange-400 hover:bg-orange-50"
                  title="Unsend (removes for everyone)"
                >
                  <Undo2 size={12}/>
                </button>
              )}
              <button
                onClick={() => onDelete(msg.id)}
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
  );
}