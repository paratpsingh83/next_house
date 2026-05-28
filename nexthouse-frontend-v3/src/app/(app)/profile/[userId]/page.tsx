'use client';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { ArrowLeft, Loader2, UserCheck, UserPlus, MessageCircle, MapPin, Shield, Calendar } from 'lucide-react';
import { usersApi, postsApi, chatApi } from '@/api';
import PostCard from '@/components/post/PostCard';
import { useAppSelector } from '@/store';
import toast from 'react-hot-toast';
import { useRouter as useNav } from 'next/navigation';
import { format } from 'date-fns';

export default function ProfilePage() {
  const { userId } = useParams<{userId:string}>();
  const router = useRouter();
  const me = useAppSelector(s=>s.auth.user);
  const uId = Number(userId);
  const [following, setFollowing] = useState<boolean|null>(null);
  const { data: user, isLoading } = useQuery({ queryKey:['user',uId], queryFn:()=>usersApi.getProfile(uId), onSuccess:(u:any)=>setFollowing(u.isFollowing??false) } as any);
  const { data: posts } = useQuery({ queryKey:['user','posts',uId], queryFn:()=>postsApi.userPosts(uId) });
  const isSelf = me?.id === uId;
  const isFollowing = following ?? user?.isFollowing ?? false;

  const handleFollow = async () => {
    try {
      if(isFollowing) { await usersApi.unfollow(uId); setFollowing(false); toast('Unfollowed'); }
      else { await usersApi.follow(uId); setFollowing(true); toast.success('Following!'); }
    } catch(e:any) { toast.error(e?.response?.data?.message??'Failed'); }
  };

  const openChat = async () => {
    try { const r = await chatApi.directRoom(uId); router.push(`/chat/${r.id}`); }
    catch { toast.error('Failed to open chat'); }
  };

  if(isLoading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary-500" size={28}/></div>;
  if(!user) return <div className="p-8 text-center text-gray-400">User not found</div>;

  return (
    <div>
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
        <button onClick={()=>router.back()} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100"><ArrowLeft size={20}/></button>
        <h1 className="font-bold text-gray-900">{user.name}</h1>
      </div>
      <div className="px-4 py-6 space-y-5">
        <div className="flex items-start gap-4">
          <div className="w-20 h-20 rounded-2xl bg-primary-100 overflow-hidden flex-shrink-0 flex items-center justify-center">
            {user.profileImage?<img src={user.profileImage} className="w-full h-full object-cover" alt={user.name}/>:<span className="text-primary-600 font-bold text-3xl">{user.name[0]}</span>}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-gray-900">{user.name}</h2>
            <p className="text-gray-500 text-sm">@{user.username}</p>
            {user.bio&&<p className="text-sm text-gray-700 mt-1">{user.bio}</p>}
            <div className="flex items-center gap-4 mt-2">
              <div className="text-center"><p className="font-bold text-gray-900">{user.followerCount??0}</p><p className="text-xs text-gray-400">Followers</p></div>
              <div className="text-center"><p className="font-bold text-gray-900">{user.followingCount??0}</p><p className="text-xs text-gray-400">Following</p></div>
              <div className="text-center"><p className="font-bold text-gray-900">{user.trustScore}</p><p className="text-xs text-gray-400">Trust</p></div>
            </div>
          </div>
        </div>
        {!isSelf&&(
          <div className="flex gap-2">
            <button onClick={handleFollow} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium text-sm transition ${isFollowing?'border border-gray-200 text-gray-700 hover:bg-gray-50':'bg-primary-500 text-white hover:bg-primary-600'}`}>
              {isFollowing?<><UserCheck size={16}/>Following</>:<><UserPlus size={16}/>Follow</>}
            </button>
            <button onClick={openChat} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 font-medium text-sm transition">
              <MessageCircle size={16}/>Message
            </button>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {user.addressVerified&&<span className="badge bg-blue-50 text-blue-600 gap-1"><MapPin size={11}/>Address Verified</span>}
          {user.identityVerified&&<span className="badge bg-green-50 text-green-600 gap-1"><Shield size={11}/>ID Verified</span>}
          <span className={`badge ${user.online?'bg-green-50 text-green-600':'bg-gray-100 text-gray-500'}`}>
            {user.online?'● Online':'Offline'}
          </span>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 mb-3">Posts</h3>
          {posts?.content?.length===0&&<p className="text-sm text-gray-400 text-center py-8">No posts yet</p>}
          <div className="space-y-3">{posts?.content?.map(p=><PostCard key={p.id} post={p}/>)}</div>
        </div>
      </div>
    </div>
  );
}
