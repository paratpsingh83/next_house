'use client';
import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X, Loader2, Trash2, Send } from 'lucide-react';
import { storiesApi, mediaApi, chatApi } from '@/api';
import { useAppSelector } from '@/store';
import { useRouter } from 'next/navigation';
import type { StoryResponse } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

// ── Group stories by authorId ─────────────────────────────────────────────────
function groupByAuthor(stories: StoryResponse[]) {
  const map = new Map<number, { author: StoryResponse['author']; stories: StoryResponse[]; hasUnseen: boolean }>();
  for (const s of stories) {
    if (!map.has(s.author.id)) {
      map.set(s.author.id, { author: s.author, stories: [], hasUnseen: false });
    }
    const g = map.get(s.author.id)!;
    g.stories.push(s);
    if (!s.viewedByMe) g.hasUnseen = true;
  }
  return Array.from(map.values());
}

// ── Story viewer modal ────────────────────────────────────────────────────────
function StoryViewer({
  groups,
  initialGroupIdx,
  currentUserId,
  onClose,
}: {
  groups: ReturnType<typeof groupByAuthor>;
  initialGroupIdx: number;
  currentUserId: number;
  onClose: () => void;
}) {
  const qc     = useQueryClient();
  const router = useRouter();
  const [gIdx, setGIdx] = useState(initialGroupIdx);
  const [sIdx, setSIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [replyText, setReplyText]         = useState('');
  const [sendingReply, setSendingReply]   = useState(false);
  const videoRef  = useRef<HTMLVideoElement>(null);
  const goNextRef = useRef<() => void>(() => {});

  const group   = groups[gIdx];
  const story   = group?.stories[sIdx];
  const isMyStory = story?.author?.id === currentUserId;

  const markViewed = useMutation({
    mutationFn: (id: number) => storiesApi.markViewed(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['stories-feed'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => storiesApi.delete(id),
    onSuccess: async () => {
      await Promise.all([
        qc.refetchQueries({ queryKey: ['stories-me'] }),
        qc.refetchQueries({ queryKey: ['stories-feed'] }),
      ]);
      toast.success('Story deleted');
      // go to next or close
      if (sIdx < group.stories.length - 1) {
        setSIdx(s => s + 1);
      } else if (gIdx < groups.length - 1) {
        setGIdx(g => g + 1);
        setSIdx(0);
      } else {
        onClose();
      }
      setConfirmDelete(false);
    },
    onError: () => toast.error('Could not delete story'),
  });

  const goNext = () => {
    if (sIdx < group.stories.length - 1) {
      setSIdx(s => s + 1);
      setProgress(0);
    } else if (gIdx < groups.length - 1) {
      setGIdx(g => g + 1);
      setSIdx(0);
      setProgress(0);
    } else {
      onClose();
    }
  };

  const goPrev = () => {
    if (sIdx > 0) {
      setSIdx(s => s - 1);
      setProgress(0);
    } else if (gIdx > 0) {
      setGIdx(g => g - 1);
      setSIdx(0);
      setProgress(0);
    }
  };

  const handleReply = async () => {
    if (!replyText.trim() || !story || isMyStory) return;
    setSendingReply(true);
    try {
      const room = await chatApi.directRoom(story.author.id);
      await chatApi.sendMessage(room.id, { content: `Replied to your story: ${replyText.trim()}` });
      setReplyText('');
      toast.success('Reply sent!');
      router.push(`/chat/${room.id}`);
      onClose();
    } catch {
      toast.error('Failed to send reply');
    } finally {
      setSendingReply(false);
    }
  };

  // Keep goNextRef in sync so the timer closure is always fresh
  useEffect(() => { goNextRef.current = goNext; });

  // Mark story viewed
  useEffect(() => {
    if (story && !story.viewedByMe) {
      markViewed.mutate(story.id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story?.id]);

  // Auto-advance timer — IMAGE/TEXT: 5s interval; VIDEO: driven by onTimeUpdate
  useEffect(() => {
    setProgress(0);
    if (!story || confirmDelete) return;
    if (story.mediaType === 'VIDEO') return; // video drives its own progress

    const DURATION = 5000; // ms
    const TICK     = 50;
    let elapsed    = 0;

    const id = setInterval(() => {
      elapsed += TICK;
      const pct = Math.min((elapsed / DURATION) * 100, 100);
      setProgress(pct);
      if (elapsed >= DURATION) {
        clearInterval(id);
        goNextRef.current();
      }
    }, TICK);

    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story?.id, confirmDelete]);

  if (!story) return null;

  const bgStyle = story.mediaType === 'TEXT'
    ? { background: story.backgroundColor ?? 'linear-gradient(135deg,#667eea,#764ba2)' }
    : {};

  return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center" onClick={onClose}>
      <div
        className="relative w-full max-w-sm h-full max-h-[100dvh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Progress bars */}
        <div className="absolute top-2 left-2 right-2 z-20 flex gap-1">
          {group.stories.map((_, i) => (
            <div key={i} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full"
                style={{
                  width: i < sIdx ? '100%' : i === sIdx ? `${progress}%` : '0%',
                  transition: i === sIdx ? 'none' : undefined,
                }}
              />
            </div>
          ))}
        </div>

        {/* Author header */}
        <div className="absolute top-6 left-3 right-10 z-20 flex items-center gap-2">
          <div className="w-8 h-8 rounded-full overflow-hidden border border-white/50 flex-shrink-0">
            {group.author.profileImage
              ? <img src={group.author.profileImage} className="w-full h-full object-cover" alt=""/>
              : <span className="w-full h-full bg-primary-500 flex items-center justify-center text-white text-sm font-bold">{group.author.name[0]}</span>
            }
          </div>
          <div>
            <p className="text-white text-xs font-bold drop-shadow">{group.author.name}</p>
            <p className="text-white/70 text-[10px]">
              {formatDistanceToNow(new Date(story.createdAt), { addSuffix: true })}
            </p>
          </div>
        </div>

        {/* Close + Delete — z-20 so tap areas (z-10) don't intercept clicks */}
        <div className="absolute top-6 right-3 z-20 flex items-center gap-2">
          {isMyStory && (
            <button
              onClick={() => setConfirmDelete(true)}
              className="w-8 h-8 rounded-full bg-black/30 flex items-center justify-center"
            >
              <Trash2 size={15} className="text-white"/>
            </button>
          )}
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-black/30 flex items-center justify-center"
          >
            <X size={18} className="text-white"/>
          </button>
        </div>

        {/* Delete confirm sheet */}
        {confirmDelete && (
          <div className="absolute inset-0 z-20 flex items-end justify-center bg-black/60" onClick={() => setConfirmDelete(false)}>
            <div className="w-full max-w-sm bg-white rounded-t-3xl p-5 space-y-3" onClick={e => e.stopPropagation()}>
              <p className="text-base font-bold text-gray-900 text-center">Delete this story?</p>
              <p className="text-sm text-gray-400 text-center">This cannot be undone.</p>
              <button
                onClick={() => deleteMutation.mutate(story.id)}
                disabled={deleteMutation.isPending}
                className="w-full py-3 rounded-2xl bg-red-500 text-white font-semibold text-sm flex items-center justify-center gap-2"
              >
                {deleteMutation.isPending ? <Loader2 size={16} className="animate-spin"/> : <Trash2 size={16}/>}
                {deleteMutation.isPending ? 'Deleting…' : 'Delete story'}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="w-full py-3 rounded-2xl bg-gray-100 text-gray-700 font-semibold text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Story content */}
        <div className="w-full h-full" style={bgStyle}>
          {story.mediaType === 'IMAGE' && story.mediaUrl && (
            <img src={story.mediaUrl} className="w-full h-full object-cover" alt="story"/>
          )}
          {story.mediaType === 'VIDEO' && story.mediaUrl && (
            <video
              ref={videoRef}
              key={story.id}
              src={story.mediaUrl}
              className="w-full h-full object-cover"
              autoPlay
              muted
              playsInline
              onTimeUpdate={e => {
                const v = e.currentTarget;
                if (v.duration && !isNaN(v.duration)) {
                  setProgress((v.currentTime / v.duration) * 100);
                }
              }}
              onEnded={() => goNextRef.current()}
            />
          )}
          {story.mediaType === 'TEXT' && (
            <div className="w-full h-full flex items-center justify-center p-8">
              <p className="text-white text-2xl font-bold text-center leading-snug text-shadow">
                {story.textContent}
              </p>
            </div>
          )}
          {story.textContent && story.mediaType !== 'TEXT' && (
            <div className="absolute bottom-16 left-4 right-4">
              <p className="text-white text-base font-semibold text-center bg-black/30 px-4 py-2 rounded-2xl">
                {story.textContent}
              </p>
            </div>
          )}
        </div>

        {/* Reply bar — only for other people's stories */}
        {!isMyStory && (
          <div className="absolute bottom-4 left-3 right-3 z-20 flex items-center gap-2">
            <input
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleReply()}
              onClick={e => e.stopPropagation()}
              placeholder={`Reply to ${group.author.name.split(' ')[0]}…`}
              className="flex-1 bg-white/20 backdrop-blur-sm border border-white/40 rounded-full px-4 py-2 text-sm text-white placeholder-white/70 outline-none focus:bg-white/30"
            />
            <button
              onClick={(e) => { e.stopPropagation(); handleReply(); }}
              disabled={!replyText.trim() || sendingReply}
              className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm border border-white/40 flex items-center justify-center disabled:opacity-40"
            >
              {sendingReply
                ? <Loader2 size={15} className="animate-spin text-white"/>
                : <Send size={15} className="text-white"/>
              }
            </button>
          </div>
        )}

        {/* Tap areas */}
        <button className="absolute left-0 top-0 h-[85%] w-1/3 z-10" onClick={goPrev}/>
        <button className="absolute right-0 top-0 h-[85%] w-1/3 z-10" onClick={goNext}/>
      </div>
    </div>
  );
}

// ── Create story panel ────────────────────────────────────────────────────────
function CreateStoryPanel({ onClose }: { onClose: () => void }) {
  const qc       = useQueryClient();
  const me       = useAppSelector(s => s.auth.user);
  const fileRef  = useRef<HTMLInputElement>(null);
  const [text,    setText]    = useState('');
  const [bgColor, setBgColor] = useState('#667eea');
  const [uploading, setUploading] = useState(false);

  const createMutation = useMutation({
    mutationFn: storiesApi.create,
    onSuccess: async () => {
      await Promise.all([
        qc.refetchQueries({ queryKey: ['stories-me'] }),
        qc.refetchQueries({ queryKey: ['stories-feed'] }),
      ]);
      toast.success('Story posted!');
      onClose();
    },
    onError: () => toast.error('Failed to post story'),
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const uploaded = await mediaApi.upload(file, 'STORY');
      const isVideo  = file.type.startsWith('video/');
      createMutation.mutate({
        mediaUrl:    uploaded.url,
        mediaId:     uploaded.id,
        mediaType:   isVideo ? 'VIDEO' : 'IMAGE',
        textContent: text || undefined,
      });
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleTextStory = () => {
    if (!text.trim()) return toast.error('Add some text first');
    createMutation.mutate({ mediaType: 'TEXT', textContent: text, backgroundColor: bgColor });
  };

  const BG_OPTIONS = [
    '#667eea','#764ba2','#f093fb','#f5576c',
    '#4facfe','#00f2fe','#43e97b','#38f9d7',
    '#fa709a','#fee140','#30cfd0','#667eea',
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-end justify-center" onClick={onClose}>
      <div
        className="w-full max-w-md bg-white rounded-t-3xl p-5 animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        <div className="sheet-handle"/>
        <h2 className="text-base font-bold text-gray-900 mb-4">Create story</h2>

        {/* Text input */}
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="What's on your mind? (optional text overlay)"
          className="input resize-none h-20 mb-3"
          maxLength={500}
        />

        {/* Background color picker for text stories */}
        <div className="mb-4">
          <p className="text-xs text-gray-500 font-medium mb-2">Background color</p>
          <div className="flex flex-wrap gap-2">
            {BG_OPTIONS.map(c => (
              <button
                key={c}
                onClick={() => setBgColor(c)}
                className={`w-8 h-8 rounded-full border-2 transition ${bgColor === c ? 'border-gray-900 scale-110' : 'border-transparent'}`}
                style={{ background: c }}
              />
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleTextStory}
            disabled={createMutation.isPending || !text.trim()}
            className="flex-1 btn-outline text-sm disabled:opacity-50"
          >
            Post text story
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading || createMutation.isPending}
            className="flex-1 btn-primary text-sm"
          >
            {uploading ? <Loader2 size={14} className="animate-spin"/> : null}
            {uploading ? 'Uploading…' : 'Add photo/video'}
          </button>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*,video/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
    </div>
  );
}

// ── Main StoriesRow export ────────────────────────────────────────────────────
export default function StoriesRow() {
  const me = useAppSelector(s => s.auth.user);
  const [viewingGroupIdx, setViewingGroupIdx] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);

  const { data: feedStories = [] } = useQuery({
    queryKey: ['stories-feed'],
    queryFn:  storiesApi.getFeed,
    staleTime: 60_000,
  });

  const { data: myStories = [] } = useQuery({
    queryKey: ['stories-me'],
    queryFn:  storiesApi.getMyStories,
    staleTime: 60_000,
  });

  const groups = groupByAuthor(feedStories);

  const myGroup = myStories.length > 0
    ? [{ author: { id: me?.id ?? 0, name: me?.name ?? '', username: me?.username ?? '', profileImage: me?.profileImage }, stories: myStories, hasUnseen: false }]
    : [];

  const allGroups = [...myGroup, ...groups];

  return (
    <>
      <div className="flex gap-3 px-4 pt-4 pb-3 overflow-x-auto scrollbar-hide">

        {/* My story — viewer if stories exist, creator if none */}
        <button
          onClick={() => myStories.length > 0 ? setViewingGroupIdx(0) : setCreating(true)}
          className="flex flex-col items-center gap-1.5 flex-shrink-0 no-tap"
        >
          <div className={`relative ${myStories.length > 0 ? 'story-ring' : ''}`}>
            <div className={`relative flex items-center justify-center overflow-hidden ${
              myStories.length > 0
                ? 'w-[52px] h-[52px] rounded-full bg-white p-0.5'
                : 'w-14 h-14 rounded-full bg-gray-100 border-2 border-dashed border-gray-300'
            }`}>
              {me?.profileImage
                ? <img src={me.profileImage} className="w-full h-full object-cover rounded-full" alt=""/>
                : <span className="text-gray-500 font-bold text-lg">{me?.name?.[0]}</span>
              }
            </div>
            <div
              onClick={e => { e.stopPropagation(); setCreating(true); }}
              className="absolute bottom-0 right-0 w-5 h-5 bg-primary-500 rounded-full flex items-center justify-center border-2 border-white cursor-pointer z-10"
            >
              <Plus size={10} className="text-white"/>
            </div>
          </div>
          <span className="text-[10px] font-medium text-gray-600 w-14 text-center leading-tight truncate">
            {myStories.length > 0 ? 'Your story' : 'Add story'}
          </span>
        </button>

        {/* Feed story rings */}
        {groups.map((group, i) => (
          <button
            key={group.author.id}
            onClick={() => setViewingGroupIdx(i + (myGroup.length > 0 ? 1 : 0))}
            className="flex flex-col items-center gap-1.5 flex-shrink-0 no-tap"
          >
            <div className={group.hasUnseen ? 'story-ring' : 'story-ring-seen'}>
              <div className="w-13 h-13 rounded-full bg-white p-0.5 overflow-hidden" style={{ width: 52, height: 52 }}>
                {group.author.profileImage
                  ? <img src={group.author.profileImage} className="w-full h-full rounded-full object-cover" alt=""/>
                  : <div className="w-full h-full rounded-full bg-primary-100 flex items-center justify-center">
                      <span className="text-primary-600 font-bold text-sm">{group.author.name[0]}</span>
                    </div>
                }
              </div>
            </div>
            <span className="text-[10px] font-medium text-gray-600 w-14 text-center leading-tight truncate">
              {group.author.name.split(' ')[0]}
            </span>
          </button>
        ))}
      </div>

      {/* Story viewer */}
      {viewingGroupIdx !== null && (
        <StoryViewer
          groups={allGroups}
          initialGroupIdx={viewingGroupIdx}
          currentUserId={me?.id ?? 0}
          onClose={() => setViewingGroupIdx(null)}
        />
      )}

      {/* Create story panel */}
      {creating && <CreateStoryPanel onClose={() => setCreating(false)}/>}
    </>
  );
}