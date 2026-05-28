'use client';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Loader2, Send } from 'lucide-react';
import { postsApi } from '@/api';
import PostCard from '@/components/post/PostCard';
import { useAppSelector } from '@/store';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

export default function PostDetailPage() {
  const { postId } = useParams<{postId:string}>();
  const router = useRouter();
  const me = useAppSelector(s=>s.auth.user);
  const qc = useQueryClient();
  const [comment, setComment] = useState('');
  const [posting, setPosting] = useState(false);
  const pId = Number(postId);
  const { data: post, isLoading } = useQuery({ queryKey:['post',pId], queryFn:()=>postsApi.get(pId) });
  const { data: comments } = useQuery({ queryKey:['post','comments',pId], queryFn:()=>postsApi.getComments(pId) });

  const submitComment = async () => {
    if(!comment.trim()) return;
    setPosting(true);
    try {
      await postsApi.addComment(pId, { comment });
      setComment('');
      qc.invalidateQueries({queryKey:['post','comments',pId]});
      toast.success('Comment added');
    } catch { toast.error('Failed'); }
    finally { setPosting(false); }
  };

  return (
    <div>
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 sticky top-0 bg-white z-10">
        <button onClick={()=>router.back()} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100"><ArrowLeft size={20}/></button>
        <h1 className="font-bold text-gray-900">Post</h1>
      </div>
      <div className="px-4 py-4 space-y-4">
        {isLoading&&<div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary-500" size={28}/></div>}
        {post&&<PostCard post={post}/>}
        {/* Comment input */}
        {me&&<div className="flex gap-3 items-end">
          <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
            {me.profileImage?<img src={me.profileImage} className="w-full h-full object-cover" alt=""/>:<span className="text-primary-600 font-bold text-sm">{me.name[0]}</span>}
          </div>
          <div className="flex-1 flex gap-2">
            <input value={comment} onChange={e=>setComment(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();submitComment();}}} placeholder="Write a comment…" className="input flex-1 text-sm"/>
            <button onClick={submitComment} disabled={posting||!comment.trim()} className="btn-primary p-2.5 rounded-xl">
              {posting?<Loader2 size={18} className="animate-spin"/>:<Send size={18}/>}
            </button>
          </div>
        </div>}
        {/* Comments */}
        <div className="space-y-3">
          {comments?.content?.map(c=>(
            <div key={c.id} className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 overflow-hidden mt-0.5">
                {c.commentedBy.profileImage?<img src={c.commentedBy.profileImage} className="w-full h-full object-cover" alt=""/>:<span className="text-gray-500 font-bold text-xs">{c.commentedBy.name[0]}</span>}
              </div>
              <div className="flex-1">
                <div className="bg-gray-50 rounded-xl px-3 py-2.5">
                  <p className="text-xs font-semibold text-gray-700">{c.commentedBy.name}</p>
                  <p className="text-sm text-gray-700 mt-0.5">{c.comment}</p>
                </div>
                <p className="text-xs text-gray-400 mt-1 ml-1">{formatDistanceToNow(new Date(c.createdAt),{addSuffix:true})}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
