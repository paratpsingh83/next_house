'use client';
import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { storiesApi, mediaApi } from '@/api';
import { useAppSelector } from '@/store';
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
  onClose,
}: {
  groups: ReturnType<typeof groupByAuthor>;
  initialGroupIdx: number;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [gIdx, setGIdx] = useState(initialGroupIdx);
  const [sIdx, setSIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const group   = groups[gIdx];
  const story   = group?.stories[sIdx];

  const markViewed = useMutation({
    mutationFn: (id: number) => storiesApi.markViewed(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['stories-feed'] }),
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

  // Auto-advance after 5s
  if (story && !story.viewedByMe) {
    markViewed.mutate(story.id);
  }

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
        <div className="absolute top-2 left-2 right-2 z-10 flex gap-1">
          {group.stories.map((_, i) => (
            <div key={i} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
              <div className={`h-full bg-white rounded-full transition-none ${i < sIdx ? 'w-full' : i === sIdx ? 'w-1/2' : 'w-0'}`}/>
            </div>
          ))}
        </div>

        {/* Author header */}
        <div className="absolute top-6 left-3 right-10 z-10 flex items-center gap-2">
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

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-6 right-3 z-10 w-8 h-8 rounded-full bg-black/30 flex items-center justify-center"
        >
          <X size={18} className="text-white"/>
        </button>

        {/* Story content */}
        <div className="w-full h-full" style={bgStyle}>
          {story.mediaType === 'IMAGE' && story.mediaUrl && (
            <img src={story.mediaUrl} className="w-full h-full object-cover" alt="story"/>
          )}
          {story.mediaType === 'VIDEO' && story.mediaUrl && (
            <video src={story.mediaUrl} className="w-full h-full object-cover" autoPlay muted loop/>
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

        {/* Tap areas */}
        <button className="absolute left-0 top-0 h-full w-1/3 z-10" onClick={goPrev}/>
        <button className="absolute right-0 top-0 h-full w-1/3 z-10" onClick={goNext}/>
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stories-feed'] });
      qc.invalidateQueries({ queryKey: ['stories-me'] });
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
        mediaUrl:  uploaded.url,
        mediaType: isVideo ? 'VIDEO' : 'IMAGE',
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

        {/* Add story button */}
        <button
          onClick={() => setCreating(true)}
          className="flex flex-col items-center gap-1.5 flex-shrink-0 no-tap"
        >
          <div className="relative w-14 h-14 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden">
            {me?.profileImage
              ? <img src={me.profileImage} className="w-full h-full object-cover" alt=""/>
              : <span className="text-gray-500 font-bold text-lg">{me?.name?.[0]}</span>
            }
            <div className="absolute bottom-0 right-0 w-5 h-5 bg-primary-500 rounded-full flex items-center justify-center border-2 border-white">
              <Plus size={10} className="text-white"/>
            </div>
          </div>
          <span className="text-[10px] font-medium text-gray-600 w-14 text-center leading-tight truncate">Your story</span>
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
          onClose={() => setViewingGroupIdx(null)}
        />
      )}

      {/* Create story panel */}
      {creating && <CreateStoryPanel onClose={() => setCreating(false)}/>}
    </>
  );
}