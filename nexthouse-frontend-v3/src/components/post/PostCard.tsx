'use client';
// src/components/post/PostCard.tsx
import { useState } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Heart, MessageCircle, Share2, Bookmark, BookmarkCheck, MapPin, MoreHorizontal } from 'lucide-react';
import { postsApi } from '@/api';
import type { PostResponse } from '@/types';
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

export default function PostCard({ post }: { post: PostResponse }) {
  const [liked,   setLiked]   = useState(post.isLiked  ?? false);
  const [saved,   setSaved]   = useState(post.isSaved  ?? false);
  const [likeCount, setLikes] = useState(post.likeCount);

  const toggleLike = async () => {
    const prev = liked;
    setLiked(!prev);
    setLikes(n => n + (prev ? -1 : 1));
    try {
      if (prev) await postsApi.removeReact(post.id);
      else      await postsApi.react(post.id, { reactionType: 'LIKE' });
    } catch {
      setLiked(prev);
      setLikes(n => n + (prev ? 1 : -1));
    }
  };

  const toggleSave = async () => {
    const prev = saved;
    setSaved(!prev);
    try {
      if (prev) { await postsApi.unsave(post.id); toast('Removed from saved'); }
      else      { await postsApi.save(post.id);   toast.success('Post saved'); }
    } catch {
      setSaved(prev);
    }
  };

  const handleShare = async () => {
    await postsApi.share(post.id).catch(() => {});
    const url = `${window.location.origin}/posts/${post.id}`;
    if (navigator.share) {
      navigator.share({ title: 'NexHouse post', url }).catch(() => {});
    } else {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied!');
    }
  };

  const author = post.anonymous ? null : post.createdBy;
  const typeColor = POST_TYPE_COLOR[post.postType] ?? POST_TYPE_COLOR.GENERAL;

  return (
    <article className="card p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <Link href={author ? `/profile/${author.id}` : '#'} className="flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-primary-100 overflow-hidden flex items-center justify-center">
              {author?.profileImage
                ? <img src={author.profileImage} alt={author.name} className="w-full h-full object-cover" />
                : <span className="text-primary-600 font-bold text-sm">{author ? author.name[0].toUpperCase() : 'A'}</span>
              }
            </div>
          </Link>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">
              {author ? author.name : 'Anonymous'}
            </p>
            <div className="flex items-center gap-1 text-xs text-gray-400 flex-wrap">
              <span>{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}</span>
              {post.address && (
                <>
                  <span>·</span>
                  <MapPin size={10} className="flex-shrink-0" />
                  <span className="truncate max-w-[120px]">{post.address}</span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`badge ${typeColor}`}>{post.postType}</span>
          <button className="p-1 text-gray-400 hover:text-gray-600">
            <MoreHorizontal size={18} />
          </button>
        </div>
      </div>

      {/* Content */}
      {post.content && (
        <Link href={`/posts/${post.id}`}>
          <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-line">
            {post.content.length > 300 ? post.content.slice(0, 300) + '…' : post.content}
          </p>
        </Link>
      )}

      {/* Media grid */}
      {post.media && post.media.length > 0 && (
        <Link href={`/posts/${post.id}`}>
          <div className={`grid gap-1 rounded-xl overflow-hidden ${post.media.length > 1 ? 'grid-cols-2' : ''}`}>
            {post.media.slice(0, 4).map((m, i) => (
              <div key={m.id} className="relative aspect-video bg-gray-100 overflow-hidden">
                {m.type === 'IMAGE'
                  ? <img src={m.url} alt="" className="w-full h-full object-cover" loading="lazy" />
                  : <video src={m.url} className="w-full h-full object-cover" muted playsInline />
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

      {/* Hashtags */}
      {post.hashtagString && (
        <div className="flex flex-wrap gap-1.5">
          {post.hashtagString.split(',').slice(0, 5).map(tag => (
            <Link
              key={tag}
              href={`/feed/hashtag/${tag.trim()}`}
              className="text-xs text-primary-600 hover:underline"
            >
              #{tag.trim()}
            </Link>
          ))}
        </div>
      )}

      {/* Community badge */}
      {post.community && (
        <Link href={`/communities/${post.community.id}`} className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-primary-600">
          <div className="w-4 h-4 rounded bg-primary-100 flex items-center justify-center">
            <span className="text-primary-600 text-[10px] font-bold">{post.community.name[0]}</span>
          </div>
          {post.community.name}
        </Link>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-50">
        <div className="flex items-center gap-1">
          <button
            onClick={toggleLike}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition ${
              liked ? 'text-red-500 bg-red-50' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <Heart size={16} className={liked ? 'fill-current' : ''} />
            <span>{likeCount}</span>
          </button>

          <Link
            href={`/posts/${post.id}`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-500 hover:bg-gray-50 transition"
          >
            <MessageCircle size={16} />
            <span>{post.commentCount}</span>
          </Link>

          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-500 hover:bg-gray-50 transition"
          >
            <Share2 size={16} />
            <span>{post.shareCount}</span>
          </button>
        </div>

        <button
          onClick={toggleSave}
          className={`p-2 rounded-lg transition ${saved ? 'text-primary-500' : 'text-gray-400 hover:bg-gray-50'}`}
        >
          {saved ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
        </button>
      </div>
    </article>
  );
}
