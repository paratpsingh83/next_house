'use client';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import {
  Heart, MessageCircle, Share2, Bookmark, BookmarkCheck,
  MapPin, MoreHorizontal, Flag, Trash2, Copy, ChevronLeft,
  ChevronRight, Shield, Star, Zap, Smile, Loader2,
} from 'lucide-react';
import { postsApi } from '@/api';
import type { PostResponse } from '@/types';
import { useAppSelector } from '@/store';
import toast from 'react-hot-toast';

const POST_TYPE_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  NEWS:           { bg: 'bg-blue-50',    text: 'text-blue-600',   label: 'News'           },
  HELP:           { bg: 'bg-orange-50',  text: 'text-orange-600', label: 'Help'           },
  SAFETY:         { bg: 'bg-red-50',     text: 'text-red-600',    label: 'Safety'         },
  MARKETPLACE:    { bg: 'bg-green-50',   text: 'text-green-600',  label: 'Marketplace'    },
  EVENT:          { bg: 'bg-purple-50',  text: 'text-purple-600', label: 'Event'          },
  RECOMMENDATION: { bg: 'bg-amber-50',   text: 'text-amber-700',  label: 'Recommendation' },
  GENERAL:        { bg: 'bg-gray-100',   text: 'text-gray-600',   label: 'General'        },
};

const REACTIONS = [
  { type: 'LIKE',      emoji: '👍', label: 'Like'      },
  { type: 'HEART',     emoji: '❤️', label: 'Love'      },
  { type: 'HELPFUL',   emoji: '⭐', label: 'Helpful'   },
  { type: 'CELEBRATE', emoji: '🎉', label: 'Celebrate' },
  { type: 'CURIOUS',   emoji: '🤔', label: 'Curious'   },
];

const REPORT_REASONS = [
  'Spam or misleading',
  'Misinformation',
  'Hate speech',
  'Harassment',
  'Inappropriate content',
  'Violence or danger',
  'Other',
];

export default function PostCard({ post, onDelete }: { post: PostResponse; onDelete?: () => void }) {
  const me = useAppSelector(s => s.auth.user);

  const [myReaction,   setMyReaction]   = useState(post.isLiked ? 'LIKE' : null as string | null);
  const [saved,        setSaved]        = useState(post.isSaved ?? false);
  const [likeCount,    setLikeCount]    = useState(post.likeCount ?? 0);
  const [commentCount, setCommentCount] = useState(post.commentCount ?? 0);
  const [shareCount,   setShareCount]   = useState(post.shareCount ?? 0);
  const [showMenu,     setShowMenu]     = useState(false);
  const [showReport,   setShowReport]   = useState(false);
  const [showReactions,setShowReactions]= useState(false);
  const [showRepost,   setShowRepost]   = useState(false);
  const [repostCaption,setRepostCaption]= useState('');
  const [reposting,    setReposting]    = useState(false);
  const [reporting,    setReporting]    = useState(false);
  const [mediaIdx,     setMediaIdx]     = useState(0);
  const [likeAnimating,setLikeAnimating]= useState(false);

  const menuRef = useRef<HTMLDivElement>(null);

  const isMine    = me?.id === post.createdBy?.id;
  const author    = post.anonymous ? null : post.createdBy;
  const typeStyle = POST_TYPE_STYLE[post.postType] ?? POST_TYPE_STYLE.GENERAL;
  const media     = post.media ?? [];

  // Close menus on outside click
  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  // ── Reaction ──────────────────────────────────────────────────────────────────
  const applyReaction = async (type: string) => {
    setShowReactions(false);
    const prev = myReaction;
    const wasReacting = prev === type;

    setMyReaction(wasReacting ? null : type);
    setLikeCount(n => n + (wasReacting ? -1 : prev ? 0 : 1));
    if (!wasReacting) { setLikeAnimating(true); setTimeout(() => setLikeAnimating(false), 400); }

    try {
      if (wasReacting) await postsApi.removeReact(post.id);
      else             await postsApi.react(post.id, { reactionType: type });
    } catch {
      setMyReaction(prev);
      setLikeCount(n => n + (wasReacting ? 1 : prev ? 0 : -1));
    }
  };

  const handleLikePress = () => {
    if (myReaction) { applyReaction(myReaction); return; }
    applyReaction('LIKE');
  };

  const handleLikeLongPress = () => setShowReactions(true);

  // Long-press handling
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onPressStart = () => { pressTimer.current = setTimeout(handleLikeLongPress, 400); };
  const onPressEnd   = ()  => {
    if (pressTimer.current) { clearTimeout(pressTimer.current); pressTimer.current = null; }
  };

  // ── Save ──────────────────────────────────────────────────────────────────────
  const toggleSave = async () => {
    const prev = saved;
    setSaved(!prev);
    try {
      if (prev) { await postsApi.unsave(post.id); toast('Removed from saved', { icon: '🔖' }); }
      else      { await postsApi.save(post.id);   toast.success('Saved!'); }
    } catch { setSaved(prev); }
  };

  // ── Share (native) ────────────────────────────────────────────────────────────
  const handleShare = async () => {
    setShowMenu(false);
    await postsApi.share(post.id).catch(() => {});
    const url = `${window.location.origin}/posts/${post.id}`;
    if (navigator.share) navigator.share({ title: post.content?.slice(0, 60) ?? 'NextHouse post', url }).catch(() => {});
    else { await navigator.clipboard.writeText(url); toast.success('Link copied!'); }
  };

  // ── Repost ────────────────────────────────────────────────────────────────────
  const handleRepost = async () => {
    setReposting(true);
    try {
      await postsApi.repost(post.id, repostCaption.trim() || undefined);
      setShareCount(c => c + 1);
      setShowRepost(false);
      setRepostCaption('');
      toast.success('Reposted to your feed!');
    } catch { toast.error('Failed to repost'); }
    finally  { setReposting(false); }
  };

  // ── Delete ────────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    setShowMenu(false);
    if (!confirm('Delete this post?')) return;
    try {
      await postsApi.delete(post.id);
      toast.success('Post deleted');
      onDelete?.();
    } catch { toast.error('Failed to delete'); }
  };

  // ── Report ────────────────────────────────────────────────────────────────────
  const handleReport = async (reason: string) => {
    setReporting(true);
    try {
      await postsApi.report(post.id, reason);
      toast.success('Reported — thank you for keeping the community safe 🙏');
      setShowReport(false);
    } catch { toast.error('Failed to report'); }
    finally { setReporting(false); }
  };

  // ── Media carousel ────────────────────────────────────────────────────────────
  const prevMedia = () => setMediaIdx(i => Math.max(0, i - 1));
  const nextMedia = () => setMediaIdx(i => Math.min(media.length - 1, i + 1));

  // ── Reaction emoji for button display ─────────────────────────────────────────
  const activeEmoji = myReaction ? REACTIONS.find(r => r.type === myReaction)?.emoji : null;

  return (
    <article className="card animate-fade-in-up">

      {/* ── Header ──────────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-2 px-4 pt-4 pb-2">
        <Link href={author ? `/profile/${author.id}` : '#'} className="flex items-center gap-3 min-w-0 flex-1 no-tap">
          <div className="relative flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-primary-100 overflow-hidden flex items-center justify-center">
              {author?.profileImage
                ? <img src={author.profileImage} alt={author.name} className="w-full h-full object-cover"/>
                : <span className="text-primary-600 font-bold text-sm">{author ? author.name[0].toUpperCase() : 'A'}</span>
              }
            </div>
            {author?.online && (
              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-white"/>
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-bold text-gray-900 truncate">
                {author ? author.name : 'Anonymous'}
              </p>
              {author?.addressVerified && (
                <Shield size={11} className="text-blue-500 flex-shrink-0" aria-label="Address Verified"/>
              )}
              {(author?.trustScore ?? 0) >= 80 && (
                <Star size={11} className="text-amber-500 flex-shrink-0" aria-label="Trusted Neighbour"/>
              )}
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <span>{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}</span>
              {post.address && (
                <><span>·</span><MapPin size={9}/><span className="truncate max-w-[90px]">{post.address}</span></>
              )}
            </div>
          </div>
        </Link>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className={`badge text-[10px] ${typeStyle.bg} ${typeStyle.text}`}>{typeStyle.label}</span>

          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowMenu(v => !v)}
              className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition"
            >
              <MoreHorizontal size={17}/>
            </button>

            {showMenu && (
              <div className="absolute right-0 top-9 w-52 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50 animate-scale-in">
                {!isMine && (
                  <button onClick={() => { setShowMenu(false); setShowRepost(true); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition">
                    <Share2 size={15} className="text-primary-500"/>Repost to feed
                  </button>
                )}
                <button onClick={handleShare}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition border-t border-gray-50">
                  <Share2 size={15} className="text-gray-400"/>Share link
                </button>
                <button onClick={async () => { setShowMenu(false); const url=`${window.location.origin}/posts/${post.id}`; await navigator.clipboard.writeText(url); toast.success('Link copied!'); }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition border-t border-gray-50">
                  <Copy size={15} className="text-gray-400"/>Copy link
                </button>
                {isMine ? (
                  <button onClick={handleDelete}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-500 hover:bg-red-50 transition border-t border-gray-100">
                    <Trash2 size={15}/>Delete post
                  </button>
                ) : (
                  <button onClick={() => { setShowMenu(false); setShowReport(true); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-500 hover:bg-red-50 transition border-t border-gray-100">
                    <Flag size={15}/>Report post
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────────────────────────── */}
      {post.content && (
        <Link href={`/posts/${post.id}`} className="block px-4 pb-3 no-tap">
          <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-line">
            {post.content.length > 300
              ? <>{post.content.slice(0, 300)}<span className="text-primary-500 font-medium">… more</span></>
              : post.content
            }
          </p>
        </Link>
      )}

      {/* ── Original post (repost embed) ────────────────────────────────────────── */}
      {post.originalPost && (
        <Link href={`/posts/${post.originalPost.id}`} className="block mx-4 mb-3 rounded-2xl border border-gray-200 bg-gray-50 overflow-hidden hover:bg-gray-100 transition no-tap">
          {/* original media thumbnail */}
          {(post.originalPost.thumbnailUrl || (post.originalPost.media && post.originalPost.media.length > 0)) && (
            <div className="w-full h-36 overflow-hidden bg-gray-200">
              <img
                src={post.originalPost.thumbnailUrl ?? post.originalPost.media![0].thumbnailUrl ?? post.originalPost.media![0].url}
                alt=""
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          )}
          <div className="p-3">
            {/* original author */}
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-6 h-6 rounded-full bg-primary-100 overflow-hidden flex-shrink-0 flex items-center justify-center">
                {post.originalPost.createdBy?.profileImage
                  ? <img src={post.originalPost.createdBy.profileImage} alt="" className="w-full h-full object-cover"/>
                  : <span className="text-primary-600 font-bold text-[10px]">
                      {post.originalPost.createdBy ? post.originalPost.createdBy.name[0].toUpperCase() : 'A'}
                    </span>
                }
              </div>
              <span className="text-xs font-semibold text-gray-700 truncate">
                {post.originalPost.createdBy?.name ?? 'Anonymous'}
              </span>
              {post.originalPost.postType && (
                <span className={`ml-auto text-[9px] font-medium px-1.5 py-0.5 rounded-lg flex-shrink-0 ${POST_TYPE_STYLE[post.originalPost.postType]?.bg ?? 'bg-gray-100'} ${POST_TYPE_STYLE[post.originalPost.postType]?.text ?? 'text-gray-600'}`}>
                  {POST_TYPE_STYLE[post.originalPost.postType]?.label ?? post.originalPost.postType}
                </span>
              )}
            </div>
            {/* original content */}
            {post.originalPost.content && (
              <p className="text-xs text-gray-600 leading-relaxed line-clamp-3">
                {post.originalPost.content}
              </p>
            )}
          </div>
        </Link>
      )}

      {/* ── Hashtags ────────────────────────────────────────────────────────────── */}
      {post.hashtagString && (
        <div className="flex flex-wrap gap-1.5 px-4 pb-2">
          {post.hashtagString.split(',').slice(0, 6).map(tag => (
            <Link key={tag} href={`/hashtag/${encodeURIComponent(tag.trim())}`}>
              <span className="text-xs text-primary-600 font-medium hover:underline">#{tag.trim()}</span>
            </Link>
          ))}
        </div>
      )}

      {/* ── Media carousel ──────────────────────────────────────────────────────── */}
      {media.length > 0 && (
        <div className="relative overflow-hidden bg-gray-100" style={{ aspectRatio: media.length === 1 ? '4/3' : '1/1' }}>
          <div
            className="flex h-full transition-transform duration-300 ease-out"
            style={{ transform: `translateX(-${mediaIdx * 100}%)`, width: `${media.length * 100}%` }}
          >
            {media.map((m, i) => (
              <div key={m.id} className="flex-shrink-0 h-full" style={{ width: `${100 / media.length}%` }}>
                {m.type === 'VIDEO'
                  ? <video src={m.url} className="w-full h-full object-cover" muted playsInline controls={mediaIdx === i}/>
                  : <img src={m.url} alt="" className="w-full h-full object-cover" loading="lazy"/>
                }
              </div>
            ))}
          </div>

          {/* Prev / next */}
          {media.length > 1 && (
            <>
              {mediaIdx > 0 && (
                <button onClick={e => { e.preventDefault(); prevMedia(); }}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center text-white">
                  <ChevronLeft size={18}/>
                </button>
              )}
              {mediaIdx < media.length - 1 && (
                <button onClick={e => { e.preventDefault(); nextMedia(); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center text-white">
                  <ChevronRight size={18}/>
                </button>
              )}
              {/* Dots */}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                {media.map((_, i) => (
                  <div key={i} className={`rounded-full transition-all duration-200 ${i === mediaIdx ? 'w-4 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/50'}`}/>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Community badge ─────────────────────────────────────────────────────── */}
      {post.community && (
        <div className="px-4 pt-2">
          <Link href={`/communities/${post.community.id}`}
            className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-primary-600 bg-gray-50 px-2.5 py-1 rounded-lg transition">
            <div className="w-4 h-4 rounded bg-primary-100 flex items-center justify-center">
              <span className="text-primary-600 text-[9px] font-bold">{post.community.name[0]}</span>
            </div>
            {post.community.name}
          </Link>
        </div>
      )}

      {/* ── Reactions summary ────────────────────────────────────────────────────── */}
      {likeCount > 0 && (
        <div className="px-4 pt-2 flex items-center gap-1.5">
          <div className="flex -space-x-1">
            {REACTIONS.filter(r => (post.reactions ?? []).some(pr => pr.reactionType === r.type))
              .slice(0, 3)
              .map(r => (
                <span key={r.type} className="text-base">{r.emoji}</span>
              ))
            }
          </div>
          <span className="text-xs text-gray-500">{likeCount} {likeCount === 1 ? 'reaction' : 'reactions'}</span>
        </div>
      )}

      {/* ── Actions ─────────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-50 mt-2">
        <div className="flex items-center gap-1">

          {/* Reaction picker overlay */}
          <div className="relative">
            {showReactions && (
              <div className="absolute bottom-10 left-0 bg-white rounded-2xl shadow-xl border border-gray-100 px-3 py-2 flex gap-2 z-50 animate-pop-in">
                {REACTIONS.map(r => (
                  <button
                    key={r.type}
                    onClick={() => applyReaction(r.type)}
                    className="flex flex-col items-center gap-0.5 hover:scale-125 transition-transform duration-150"
                    title={r.label}
                  >
                    <span className="text-xl">{r.emoji}</span>
                    <span className="text-[9px] text-gray-400">{r.label}</span>
                  </button>
                ))}
                <div className="absolute -bottom-1.5 left-4 w-3 h-3 bg-white border-r border-b border-gray-100 rotate-45"/>
              </div>
            )}

            <button
              onClick={handleLikePress}
              onMouseDown={onPressStart}
              onMouseUp={onPressEnd}
              onMouseLeave={onPressEnd}
              onTouchStart={onPressStart}
              onTouchEnd={onPressEnd}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all duration-150 no-tap
                ${myReaction ? 'bg-red-50 text-red-500' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              {activeEmoji
                ? <span className={`text-base ${likeAnimating ? 'animate-heartbeat' : ''}`}>{activeEmoji}</span>
                : <Smile size={15} className={likeAnimating ? 'animate-heartbeat' : ''}/>
              }
              <span>{likeCount > 0 ? likeCount : ''}</span>
            </button>
          </div>

          <Link
            href={`/posts/${post.id}`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm text-gray-500 hover:bg-gray-50 transition no-tap"
          >
            <MessageCircle size={15}/>
            <span>{commentCount > 0 ? commentCount : ''}</span>
          </Link>

          <button
            onClick={() => !isMine ? setShowRepost(true) : handleShare()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm text-gray-500 hover:bg-gray-50 transition"
          >
            <Share2 size={15}/>
            {shareCount > 0 && <span>{shareCount}</span>}
          </button>
        </div>

        <button
          onClick={toggleSave}
          className={`p-2 rounded-xl transition press ${saved ? 'text-primary-500 bg-primary-50' : 'text-gray-400 hover:bg-gray-50'}`}
        >
          {saved ? <BookmarkCheck size={18}/> : <Bookmark size={18}/>}
        </button>
      </div>

      {/* ── Report bottom sheet ─────────────────────────────────────────────────── */}
      {showReport && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center animate-fade-in" onClick={() => setShowReport(false)}>
          <div className="sheet w-full max-w-md animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="sheet-handle"/>
            <div className="px-5 pb-2">
              <h3 className="font-bold text-gray-900 text-center text-base">Report Post</h3>
              <p className="text-xs text-gray-400 text-center mt-1 mb-4">Help us keep the community safe</p>
              <div className="space-y-1.5">
                {REPORT_REASONS.map(reason => (
                  <button key={reason} onClick={() => handleReport(reason)} disabled={reporting}
                    className="w-full py-3 px-4 rounded-xl border-2 border-gray-100 text-sm font-medium text-gray-700 hover:border-red-300 hover:bg-red-50 hover:text-red-600 transition text-left active:scale-[0.98]">
                    {reason}
                  </button>
                ))}
              </div>
              <button onClick={() => setShowReport(false)} className="w-full py-4 text-sm text-gray-400 font-medium mt-2">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Repost bottom sheet ─────────────────────────────────────────────────── */}
      {showRepost && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center animate-fade-in" onClick={() => setShowRepost(false)}>
          <div className="sheet w-full max-w-md animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="sheet-handle"/>
            <div className="px-5 pb-5">
              <h3 className="font-bold text-gray-900 text-center text-base mb-4">Repost to your feed</h3>

              {/* Embedded original preview */}
              <div className="border-2 border-gray-100 rounded-2xl p-3 mb-3 bg-gray-50">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-6 h-6 rounded-full bg-primary-100 overflow-hidden flex-shrink-0 flex items-center justify-center">
                    {post.createdBy?.profileImage
                      ? <img src={post.createdBy.profileImage} className="w-full h-full object-cover" alt=""/>
                      : <span className="text-[10px] font-bold text-primary-600">{post.createdBy?.name?.[0]}</span>
                    }
                  </div>
                  <span className="text-xs font-semibold text-gray-700">{post.createdBy?.name ?? 'Anonymous'}</span>
                </div>
                <p className="text-sm text-gray-600 line-clamp-3">{post.content}</p>
              </div>

              <textarea
                value={repostCaption}
                onChange={e => setRepostCaption(e.target.value)}
                placeholder="Add a comment (optional)"
                rows={3}
                maxLength={2000}
                className="input resize-none w-full mb-3"
              />

              <div className="flex gap-3">
                <button onClick={() => setShowRepost(false)} className="flex-1 btn-outline py-3">Cancel</button>
                <button
                  onClick={handleRepost}
                  disabled={reposting}
                  className="flex-1 btn-primary py-3 gap-2"
                >
                  {reposting ? <Loader2 size={15} className="animate-spin"/> : <Share2 size={15}/>}
                  Repost
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}