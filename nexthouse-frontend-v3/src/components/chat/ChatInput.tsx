'use client';
import { useRef, useState } from 'react';
import { Reply, Send, Loader2, ImagePlus, X } from 'lucide-react';
import { mediaApi } from '@/api';
import toast from 'react-hot-toast';

interface Props {
  text: string;
  onChange: (v: string) => void;
  onSend: () => void;
  onSendImage: (mediaUrl: string) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  sending: boolean;
  replyTo: { id: number; preview: string } | null;
  onCancelReply: () => void;
}

export default function ChatInput({ text, onChange, onSend, onSendImage, onKeyDown, sending, replyTo, onCancelReply }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview,   setPreview]   = useState<string | null>(null);
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    setUploading(true);
    try {
      const uploaded = await mediaApi.upload(file, 'CHAT');
      setPendingUrl(uploaded.url);
    } catch {
      toast.error('Image upload failed');
      setPreview(null);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const sendImage = () => {
    if (!pendingUrl) return;
    onSendImage(pendingUrl);
    setPreview(null);
    setPendingUrl(null);
  };

  const cancelImage = () => {
    setPreview(null);
    setPendingUrl(null);
  };

  return (
    <>
      {replyTo && (
        <div className="px-4 py-2 bg-primary-50 border-t border-primary-100 flex items-center gap-2 flex-shrink-0">
          <Reply size={14} className="text-primary-500 flex-shrink-0"/>
          <p className="text-xs text-primary-700 flex-1 truncate">Replying to: {replyTo.preview}</p>
          <button onClick={onCancelReply} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
        </div>
      )}

      {/* Image preview bar */}
      {preview && (
        <div className="px-4 py-2 border-t border-gray-100 bg-white flex items-center gap-3 flex-shrink-0">
          <div className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">
            <img src={preview} className="w-full h-full object-cover" alt=""/>
            {uploading && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <Loader2 size={16} className="animate-spin text-white"/>
              </div>
            )}
          </div>
          <p className="text-xs text-gray-500 flex-1">{uploading ? 'Uploading…' : 'Ready to send'}</p>
          <button onClick={cancelImage} className="p-1.5 rounded-lg hover:bg-gray-100">
            <X size={16} className="text-gray-400"/>
          </button>
          <button
            onClick={sendImage}
            disabled={uploading || !pendingUrl}
            className="btn-primary py-2 px-3 text-sm gap-1.5 disabled:opacity-50"
          >
            <Send size={14}/> Send
          </button>
        </div>
      )}

      <div className="px-4 py-3 border-t border-gray-100 bg-white flex-shrink-0 safe-pb">
        <div className="flex items-end gap-2">
          <button
            onClick={() => fileRef.current?.click()}
            className="p-2.5 rounded-xl text-gray-400 hover:bg-gray-100 hover:text-primary-500 transition flex-shrink-0"
            title="Send image"
          >
            <ImagePlus size={20}/>
          </button>
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
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile}/>
      </div>
    </>
  );
}
