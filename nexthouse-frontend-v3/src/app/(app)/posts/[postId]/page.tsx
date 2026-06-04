'use client';
import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { useInView } from 'react-intersection-observer';
import { useEffect } from 'react';
import { ArrowLeft, Loader2, Send, Heart, MessageCircle, Share2, Bookmark, BookmarkCheck, ThumbsUp, Star, Smile, Zap, MoreHorizontal, Reply, Trash2 } from 'lucide-react';
import { postsApi } from '@/api';
import PostCard from '@/components/post/PostCard';
import { useAppSelector } from '@/store';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import toast from 'react-hot-toast';

const REACTIONS = [
  { type: 'LIKE',      icon: ThumbsUp,  label: 'Like',      color: 'text-blue-500',   bg: 'bg-blue-50'   },
  { type: 'HEART',     icon: Heart,     label: 'Love',      color: 'text-red-500',    bg: 'bg-red-50'    },
  { type: 'HELPFUL',   icon: Star,      label: 'Helpful',   color: 'text-yellow-500', bg: 'bg-yellow-50' },
  { type: 'CELEBRATE', icon: Zap,       label: 'Celebrate', color: 'text-purple-500', bg: 'bg-purple-50' },
  { type: 'CURIOUS',   icon: Smile,     label: 'Curious',   color: 'text-orange-500', bg: 'bg-orange-50' },
];

export default function PostDetailPage() {
  const { postId } = useParams<{postId:string}>();
  const router = useRouter();
  const me = useAppSelector(s => s.auth.user);
  const qc = useQueryClient();
  const [comment,   setComment]   = useState('');
  const [posting,   setPosting]   = useState(false);
  const [replyTo,   setReplyTo]   = useState<{id:number;name:string}|null>(null);
  const [showReact, setShowReact] = useState(false);
  const pId = Number(postId);

  const { data: post, isLoading } = useQuery({
    queryKey: ['post', pId],
    queryFn:  () => postsApi.get(pId),
  });

  const { data: commentsData, isLoading: loadingComments, refetch: refetchComments, fetchNextPage: fetchNextComments, hasNextPage: hasMoreComments, isFetchingNextPage: fetchingMoreComments } = useInfiniteQuery({
    queryKey: ['post-comments', pId],
    queryFn:  ({ pageParam = 0 }) => postsApi.getComments(pId, pageParam, 20),
    getNextPageParam: l => l.hasNext ? l.page + 1 : undefined,
    initialPageParam: 0,
  });

  const comments = commentsData?.pages.flatMap(p => p.content) ?? [];
  const { ref: commentsEndRef, inView } = useInView({ threshold: 0.1 });
  useEffect(() => {
    if (inView && hasMoreComments && !fetchingMoreComments) fetchNextComments();
  }, [inView, hasMoreComments, fetchingMoreComments]);

  // ── Add comment ───────────────────────────────────────────────────────────
  const submitComment = async () => {
    if (!comment.trim()) return;
    setPosting(true);
    try {
      await postsApi.addComment(pId, {
        comment,
        parentCommentId: replyTo?.id,
      });
      setComment('');
      setReplyTo(null);
      refetchComments();
    } catch { toast.error('Failed to comment'); }
    finally { setPosting(false); }
  };

  // ── React to post ──────────────────────────────────────────────────────────
  const handleReact = async (reactionType: string) => {
    setShowReact(false);
    try {
      if (post?.myReactionType === reactionType) {
        await postsApi.removeReact(pId);
      } else {
        await postsApi.react(pId, { reactionType });
      }
      qc.invalidateQueries({ queryKey: ['post', pId] });
    } catch { toast.error('Failed'); }
  };

  // ── Like comment ──────────────────────────────────────────────────────────
  const likeComment = async (commentId: number) => {
    try {
      await postsApi.likeComment(commentId);
      refetchComments();
    } catch {}
  };

  // ── Delete comment ────────────────────────────────────────────────────────
  const deleteComment = async (commentId: number) => {
    if (!confirm('Delete this comment?')) return;
    try {
      await postsApi.deleteComment(commentId);
      refetchComments();
      toast('Comment deleted');
    } catch { toast.error('Failed'); }
  };

  const currentReaction = REACTIONS.find(r => r.type === post?.myReactionType);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 h-14 bg-white border-b border-gray-100 sticky top-0 z-10">
        <button onClick={() => router.back()} className="p-1.5 rounded-xl text-gray-500 hover:bg-gray-100">
          <ArrowLeft size={20}/>
        </button>
        <h1 className="font-bold text-gray-900">Post</h1>
      </div>

      <div className="px-4 py-4 space-y-4">
        {isLoading && <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary-500" size={28}/></div>}

        {/* Post card */}
        {post && <PostCard post={post}/>}

        {/* Reaction picker */}
        {post && (
          <div className="card p-4">
            <p className="text-xs font-semibold text-gray-500 mb-3">React to this post</p>
            <div className="flex items-center gap-2 flex-wrap">
              {REACTIONS.map(({ type, icon: Icon, label, color, bg }) => (
                <button
                  key={type}
                  onClick={() => handleReact(type)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 transition text-sm font-medium ${
                    post.myReactionType === type
                      ? `border-current ${color} ${bg}`
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  <Icon size={16} className={post.myReactionType === type ? 'fill-current' : ''}/>
                  <span className="text-xs">{label}</span>
                </button>
              ))}
            </div>

            {/* Reaction summary */}
            {post.reactions && post.reactions.length > 0 && (
              <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-50">
                {post.reactions.map(r => {
                  const reaction = REACTIONS.find(rx => rx.type === r.reactionType);
                  if (!reaction) return null;
                  const Icon = reaction.icon;
                  return (
                    <div key={r.reactionType} className="flex items-center gap-1">
                      <Icon size={14} className={reaction.color}/>
                      <span className="text-xs text-gray-500">{r.count}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Comments section */}
        <div className="card p-4">
          <h3 className="font-bold text-gray-900 mb-4">
            Comments ({post?.commentCount ?? 0})
          </h3>

          {/* Comment input */}
          {me && (
            <div className="mb-4 space-y-2">
              {replyTo && (
                <div className="flex items-center gap-2 px-3 py-2 bg-primary-50 rounded-xl">
                  <Reply size={12} className="text-primary-500"/>
                  <p className="text-xs text-primary-700 flex-1">Replying to {replyTo.name}</p>
                  <button onClick={() => setReplyTo(null)} className="text-gray-400 text-lg leading-none">×</button>
                </div>
              )}
              <div className="flex items-end gap-2">
                <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {me.profileImage
                    ? <img src={me.profileImage} className="w-full h-full object-cover" alt=""/>
                    : <span className="text-primary-600 font-bold text-sm">{me.name[0]}</span>
                  }
                </div>
                <div className="flex-1 flex gap-2">
                  <input
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                    onKeyDown={e => { if(e.key==='Enter'){e.preventDefault();submitComment();} }}
                    placeholder={replyTo ? `Reply to ${replyTo.name}…` : 'Write a comment…'}
                    className="input flex-1 text-sm py-2.5"
                  />
                  <button onClick={submitComment} disabled={posting || !comment.trim()} className="btn-primary p-2.5 rounded-xl flex-shrink-0">
                    {posting ? <Loader2 size={18} className="animate-spin"/> : <Send size={18}/>}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Comments list */}
          {loadingComments && <div className="flex justify-center py-6"><Loader2 className="animate-spin text-primary-400" size={22}/></div>}

          {!loadingComments && comments.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              <MessageCircle size={32} className="mx-auto mb-2 opacity-30"/>
              <p className="text-sm">No comments yet — be the first!</p>
            </div>
          )}

          <div className="space-y-4">
            {comments.map(c => (
              <div key={c.id} className="group">
                <div className="flex gap-2.5">
                  <Link href={`/profile/${c.commentedBy.id}`} className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center">
                      {c.commentedBy.profileImage
                        ? <img src={c.commentedBy.profileImage} className="w-full h-full object-cover" alt=""/>
                        : <span className="text-gray-500 font-bold text-xs">{c.commentedBy.name[0]}</span>
                      }
                    </div>
                  </Link>
                  <div className="flex-1 min-w-0">
                    {/* Bubble */}
                    <div className="bg-gray-50 rounded-2xl rounded-tl-sm px-3.5 py-2.5">
                      <Link href={`/profile/${c.commentedBy.id}`}>
                        <span className="text-xs font-bold text-gray-800 hover:text-primary-600">{c.commentedBy.name}</span>
                      </Link>
                      {c.edited && <span className="text-[10px] text-gray-400 ml-1">(edited)</span>}
                      <p className="text-sm text-gray-700 mt-0.5 leading-relaxed">{c.comment}</p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3 mt-1.5 ml-1">
                      <span className="text-[10px] text-gray-400">
                        {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
                      </span>
                      <button onClick={() => likeComment(c.id)} className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1 transition">
                        <Heart size={11}/>
                        {c.likeCount > 0 && c.likeCount}
                      </button>
                      <button onClick={() => setReplyTo({ id: c.id, name: c.commentedBy.name })} className="text-xs text-gray-400 hover:text-primary-600 flex items-center gap-1 transition">
                        <Reply size={11}/>Reply
                      </button>
                      {c.commentedBy.id === me?.id && (
                        <button onClick={() => deleteComment(c.id)} className="text-xs text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition flex items-center gap-1">
                          <Trash2 size={11}/>
                        </button>
                      )}
                    </div>

                    {/* Replies */}
                    {c.replyCount !== undefined && c.replyCount > 0 && (
                      <div className="mt-2 ml-2 space-y-2 border-l-2 border-gray-100 pl-3">
                        {c.replies?.map(reply => (
                          <div key={reply.id} className="flex gap-2">
                            <div className="w-7 h-7 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center flex-shrink-0">
                              {reply.commentedBy.profileImage
                                ? <img src={reply.commentedBy.profileImage} className="w-full h-full object-cover" alt=""/>
                                : <span className="text-gray-500 font-bold text-[10px]">{reply.commentedBy.name[0]}</span>
                              }
                            </div>
                            <div className="flex-1 bg-gray-50 rounded-2xl rounded-tl-sm px-3 py-2">
                              <span className="text-xs font-bold text-gray-800">{reply.commentedBy.name}</span>
                              <p className="text-xs text-gray-700 mt-0.5">{reply.comment}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div ref={commentsEndRef} className="h-2"/>
        </div>
      </div>
    </div>
  );
}
