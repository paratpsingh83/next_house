'use client';
// src/components/post/CreatePostModal.tsx
import { useState } from 'react';
import { X, Loader2, Image as ImageIcon } from 'lucide-react';
import { postsApi, mediaApi } from '@/api';
import type { UserResponse } from '@/types';
import toast from 'react-hot-toast';

const POST_TYPES = ['GENERAL', 'NEWS', 'HELP', 'EVENT', 'SAFETY', 'RECOMMENDATION'] as const;

interface Props {
  user: UserResponse;
  lat:  number;
  lon:  number;
  communityId?: number;
  onClose:   () => void;
  onCreated: () => void;
}

export default function CreatePostModal({ user, lat, lon, communityId, onClose, onCreated }: Props) {
  const [content,   setContent]   = useState('');
  const [postType,  setPostType]  = useState('GENERAL');
  const [anonymous, setAnonymous] = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [mediaIds,  setMediaIds]  = useState<number[]>([]);
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const media = await mediaApi.upload(file, 'POST');
      setMediaIds(ids => [...ids, media.id]);
      toast.success('Media uploaded');
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!content.trim()) { toast.error('Write something first'); return; }
    setLoading(true);
    try {
      await postsApi.create({ postType, content, latitude: lat, longitude: lon, anonymous, mediaIds, communityId });
      toast.success('Post created!');
      onCreated();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to create post');
    } finally {
      setLoading(false);
    }
  };

  return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm px-0 sm:px-4">
        <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Create post</h2>
            <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100">
              <X size={20} />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 space-y-4">
            {/* Author */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                {user.profileImage
                    ? <img src={user.profileImage} className="w-full h-full rounded-full object-cover" alt={user.name}/>
                    : <span className="text-primary-600 font-bold">{user.name[0]}</span>
                }
              </div>
              <div>
                <p className="text-sm font-semibold">{anonymous ? 'Anonymous' : user.name}</p>
                <label className="flex items-center gap-1.5 text-xs text-gray-400 cursor-pointer mt-0.5">
                  <input type="checkbox" checked={anonymous} onChange={e => setAnonymous(e.target.checked)} className="rounded w-3 h-3"/>
                  Post anonymously
                </label>
              </div>
            </div>

            {/* Post type */}
            <div className="flex flex-wrap gap-2">
              {POST_TYPES.map(t => (
                  <button
                      key={t}
                      onClick={() => setPostType(t)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition border ${
                          postType === t
                              ? 'bg-primary-500 text-white border-primary-500'
                              : 'border-gray-200 text-gray-600 hover:border-primary-300'
                      }`}
                  >
                    {t}
                  </button>
              ))}
            </div>

            {/* Content */}
            <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                rows={5}
                maxLength={5000}
                placeholder={`What's happening in your neighbourhood?`}
                className="input resize-none text-sm"
                autoFocus
            />
            <div className="text-xs text-gray-400 text-right">{content.length}/5000</div>

            {/* Media upload */}
            <div className="flex items-center gap-3">
              <label className="btn-outline cursor-pointer text-xs gap-1.5">
                {uploading ? <Loader2 size={14} className="animate-spin"/> : <ImageIcon size={14}/>}
                {uploading ? 'Uploading…' : 'Add photo'}
                <input type="file" accept="image/*,video/*" className="hidden" onChange={handleFileUpload}/>
              </label>
              {mediaIds.length > 0 && <span className="text-xs text-primary-600">{mediaIds.length} file{mediaIds.length > 1 ? 's' : ''} added</span>}
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 pb-5">
            <button
                onClick={handleSubmit}
                disabled={loading || !content.trim()}
                className="btn-primary w-full py-3"
            >
              {loading ? <><Loader2 size={18} className="animate-spin"/> Posting…</> : 'Post'}
            </button>
          </div>
        </div>
      </div>
  );
}
