'use client';
import { Reply, Send, Loader2 } from 'lucide-react';

interface Props {
  text: string;
  onChange: (v: string) => void;
  onSend: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  sending: boolean;
  replyTo: { id: number; preview: string } | null;
  onCancelReply: () => void;
}

export default function ChatInput({ text, onChange, onSend, onKeyDown, sending, replyTo, onCancelReply }: Props) {
  return (
    <>
      {replyTo && (
        <div className="px-4 py-2 bg-primary-50 border-t border-primary-100 flex items-center gap-2 flex-shrink-0">
          <Reply size={14} className="text-primary-500 flex-shrink-0"/>
          <p className="text-xs text-primary-700 flex-1 truncate">Replying to: {replyTo.preview}</p>
          <button onClick={onCancelReply} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
        </div>
      )}
      <div className="px-4 py-3 border-t border-gray-100 bg-white flex-shrink-0 safe-pb">
        <div className="flex items-end gap-2">
          <textarea
            value={text}
            onChange={e => onChange(e.target.value)}
            onKeyDown={onKeyDown}
            rows={1}
            placeholder="Type a message…"
            className="input flex-1 resize-none max-h-32 py-2.5 text-sm"
          />
          <button
            onClick={onSend}
            disabled={sending || !text.trim()}
            className="btn-primary p-2.5 rounded-xl flex-shrink-0 aspect-square"
          >
            {sending ? <Loader2 size={18} className="animate-spin"/> : <Send size={18}/>}
          </button>
        </div>
      </div>
    </>
  );
}