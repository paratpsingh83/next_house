'use client';
// src/components/post/PostCard.tsx
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Heart, MessageCircle, Share2, Bookmark, BookmarkCheck, MapPin, MoreHorizontal, Flag, Trash2, Copy } from 'lucide-react';
import { postsApi } from '@/api';
import type { PostResponse } from '@/types';
import { useAppSelector } from '@/store';
import toast from 'react-hot-toast';

const POST_TYPE_COLOR: Record<string, string> = {
  NEWS:           'bg-blue-50 text-blue-600',
  HELP:           'bg-orange-50 text-orange-600',
  SAFETY:         'bg-red-50 text-red-600',
  MARKETPLACE:    'bg-green-50 text-green-600',
  EVENT:          'bg-purple-50 text-purple-600',
  RECOMMENDATION: 'bg-yellow-50 text-yellow-700',
  GENERAL:        'bg-gray-100 text-gray-600',
};

const REPORT_REASONS = ['Spam', 'Misinformation', 'Hate speech', 'Harassment', 'Inappropriate content', 'Other'];

export default function PostCard({ post, onDelete }: { post: PostResponse; onDelete?: () => void }) {
  const me = useAppSelector(s => s.auth.user);
  const [liked,     setLiked]     = useState(post.isLiked   ?? false);
  const [saved,     setSaved]     = useState(post.isSaved   ?? false);
  const [likeCount, setLikes]     = useState(post.likeCount ?? 0);
  const [showMenu,  setShowMenu]  = useState(false);
  const [showReport,setShowReport]= useState(false);
  const [reporting, setReporting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isMine  = me?.id === post.createdBy?.id;
  const author  = post.anonymous ? null : post.createdBy;
  const typeColor = POST_TYPE_COLOR[post.postType] ?? POST_TYPE_COLOR.GENERAL;

  // Close menu on outside click
  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  // ── Like ──────────────────────────────────────────────────────────────────
  const toggleLike = async () => {
    const prev = liked;
    setLiked(!prev);
    setLikes(n => n + (prev ? -1 : 1));
    try {
      if (prev) await postsApi.removeReact(post.id);
      else      await postsApi.react(post.id, { reactionType: 'LIKE' });
    } catch { setLiked(prev); setLikes(n => n + (prev ? 1 : -1)); }
  };

  // ── Save ──────────────────────────────────────────────────────────────────
  const toggleSave = async () => {
    const prev = saved;
    setSaved(!prev);
    try {
      if (prev) { await postsApi.unsave(post.id); toast('Removed from saved'); }
      else      { await postsApi.save(post.id);   toast.success('Post saved!'); }
    } catch { setSaved(prev); }
  };

  // ── Share ─────────────────────────────────────────────────────────────────
  const handleShare = async () => {
    setShowMenu(false);
    await postsApi.share(post.id).catch(() => {});
    const url = `${window.location.origin}/posts/${post.id}`;
    if (navigator.share) navigator.share({ title: 'NexHouse post', url }).catch(() => {});
    else { await navigator.clipboard.writeText(url); toast.success('Link copied!'); }
  };

  // ── Copy link ─────────────────────────────────────────────────────────────
  const copyLink = async () => {
    setShowMenu(false);
    const url = `${window.location.origin}/posts/${post.id}`;
    await navigator.clipboard.writeText(url);
    toast.success('Link copied!');
  };

  // ── Delete (own posts) ────────────────────────────────────────────────────
  const handleDelete = async () => {
    setShowMenu(false);
    if (!confirm('Delete this post?')) return;
    try {
      await postsApi.delete(post.id);
      toast.success('Post deleted');
      onDelete?.();
    } catch { toast.error('Failed to delete'); }
  };

  // ── Report ────────────────────────────────────────────────────────────────
  const handleReport = async (reason: string) => {
    setReporting(true);
    try {
      await postsApi.report(post.id, reason);
      toast.success('Post reported. Thank you!');
      setShowReport(false);
    } catch { toast.error('Failed to report'); }
    finally { setReporting(false); }
  };

  return (
    <article className="card p-4 space-y-3">

      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Link href={author ? `/profile/${author.id}` : '#'} className="flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-primary-100 overflow-hidden flex items-center justify-center">
              {author?.profileImage
                ? <img src={author.profileImage} alt={author.name} className="w-full h-full object-cover"/>
                : <span className="text-primary-600 font-bold text-sm">{author ? author.name[0].toUpperCase() : 'A'}</span>
              }
            </div>
          </Link>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-900 truncate">
              {author ? author.name : 'Anonymous'}
            </p>
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <span>{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}</span>
              {post.address && (
                <><span>·</span><MapPin size={10}/><span className="truncate max-w-[100px]">{post.address}</span></>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`badge text-xs ${typeColor}`}>{post.postType}</span>

          {/* ── More menu ──────────────────────────────────────────────────── */}
          <div className="relative" ref={menuRef}>
            <button onClick={() => setShowMenu(v => !v)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition">
              <MoreHorizontal size={18}/>
            </button>

            {showMenu && (
              <div className="absolute right-0 top-8 w-48 bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden z-50">
                <button onClick={copyLink} className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition">
                  <Copy size={15} className="text-gray-400"/>Copy link
                </button>
                <button onClick={handleShare} className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition">
                  <Share2 size={15} className="text-gray-400"/>Share
                </button>
                {isMine ? (
                  <button onClick={handleDelete} className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-red-500 hover:bg-red-50 transition border-t border-gray-50">
                    <Trash2 size={15}/>Delete post
                  </button>
                ) : (
                  <button onClick={() => { setShowMenu(false); setShowReport(true); }}
                    className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-red-500 hover:bg-red-50 transition border-t border-gray-50">
                    <Flag size={15}/>Report post
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Report modal ─────────────────────────────────────────────────────── */}
      {showReport && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end justify-center" onClick={() => setShowReport(false)}>
          <div className="bg-white w-full max-w-md rounded-t-3xl p-5 space-y-3" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-gray-900 text-center">Report this post</h3>
            <p className="text-xs text-gray-400 text-center">Why are you reporting this?</p>
            <div className="space-y-2">
              {REPORT_REASONS.map(reason => (
                <button key={reason} onClick={() => handleReport(reason)} disabled={reporting}
                  className="w-full py-3 px-4 rounded-xl border-2 border-gray-200 text-sm font-medium text-gray-700 hover:border-red-300 hover:bg-red-50 hover:text-red-600 transition text-left">
                  {reason}
                </button>
              ))}
            </div>
            <button onClick={() => setShowReport(false)} className="w-full py-3 text-sm text-gray-400 font-medium">Cancel</button>
          </div>
        </div>
      )}

      {/* ── Content ──────────────────────────────────────────────────────────── */}
      {post.content && (
        <Link href={`/posts/${post.id}`}>
          <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-line">
            {post.content.length > 280 ? post.content.slice(0, 280) + '…' : post.content}
          </p>
        </Link>
      )}

      {/* ── Media ────────────────────────────────────────────────────────────── */}
      {post.media && post.media.length > 0 && (
        <Link href={`/posts/${post.id}`}>
          <div className={`grid gap-1 rounded-xl overflow-hidden ${post.media.length === 1 ? '' : 'grid-cols-2'}`}>
            {post.media.slice(0, 4).map((m, i) => (
              <div key={m.id} className={`relative bg-gray-100 overflow-hidden ${post.media!.length === 1 ? 'aspect-video' : 'aspect-square'}`}>
                {m.type === 'IMAGE'
                  ? <img src={m.url} alt="" className="w-full h-full object-cover" loading="lazy"/>
                  : <video src={m.url} className="w-full h-full object-cover" muted playsInline/>
                }
                {i === 3 && post.media!.length > 4 && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <span className="text-white text-xl font-bold">+{post.media!.length - 4}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Link>
      )}

      {/* ── Hashtags ─────────────────────────────────────────────────────────── */}
      {post.hashtagString && (
        <div className="flex flex-wrap gap-1.5">
          {post.hashtagString.split(',').slice(0, 5).map(tag => (
            <span key={tag} className="text-xs text-primary-600 hover:underline cursor-pointer">
              #{tag.trim()}
            </span>
          ))}
        </div>
      )}

      {/* ── Community badge ───────────────────────────────────────────────────── */}
      {post.community && (
        <Link href={`/communities/${post.community.id}`}
          className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-primary-600 bg-gray-50 px-2.5 py-1 rounded-lg">
          <div className="w-4 h-4 rounded bg-primary-100 flex items-center justify-center">
            <span className="text-primary-600 text-[9px] font-bold">{post.community.name[0]}</span>
          </div>
          {post.community.name}
        </Link>
      )}

      {/* ── Reaction summary ──────────────────────────────────────────────────── */}
      {post.reactions && post.reactions.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-gray-400">
          {post.reactions.slice(0, 3).map(r => (
            <span key={r.reactionType}>
              {r.reactionType === 'LIKE' ? '👍' : r.reactionType === 'HEART' ? '❤️' : r.reactionType === 'HELPFUL' ? '⭐' : r.reactionType === 'CELEBRATE' ? '⚡' : '😊'}
              {r.count}
            </span>
          ))}
        </div>
      )}

      {/* ── Actions ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-50">
        <div className="flex items-center gap-1">
          <button onClick={toggleLike}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition ${liked ? 'text-red-500 bg-red-50' : 'text-gray-500 hover:bg-gray-50'}`}>
            <Heart size={15} className={liked ? 'fill-current' : ''}/><span>{likeCount}</span>
          </button>

          <Link href={`/posts/${post.id}`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-500 hover:bg-gray-50 transition">
            <MessageCircle size={15}/><span>{post.commentCount ?? 0}</span>
          </Link>

          <button onClick={handleShare}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-500 hover:bg-gray-50 transition">
            <Share2 size={15}/><span>{post.shareCount ?? 0}</span>
          </button>
        </div>

        <button onClick={toggleSave}
          className={`p-2 rounded-lg transition ${saved ? 'text-primary-500' : 'text-gray-400 hover:bg-gray-50'}`}>
          {saved ? <BookmarkCheck size={18}/> : <Bookmark size={18}/>}
        </button>
      </div>
    </article>
  );
}
