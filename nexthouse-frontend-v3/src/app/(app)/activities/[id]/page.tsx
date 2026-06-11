'use client';
import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CalendarDays, MapPin, Users, Clock, Loader2, UserPlus, LogOut, Lock, CheckCircle, XCircle, Crown, Share2 } from 'lucide-react';
import { activitiesApi } from '@/api';
import { useAppSelector } from '@/store';
import { format, formatDistanceToNow, isPast } from 'date-fns';
import Link from 'next/link';
import toast from 'react-hot-toast';

const TYPE_EMOJI: Record<string, string> = {
  SOCIAL:'🎉', SPORTS:'⚽', LEARNING:'📚', VOLUNTEERING:'🤝',
  FOOD:'🍜', ARTS:'🎨', OUTDOOR:'🌿', NEIGHBORHOOD_WATCH:'👀', OTHER:'📌',
};
const STATUS_COLOR: Record<string, string> = {
  PUBLISHED:'bg-green-50 text-green-600', FULL:'bg-orange-50 text-orange-600',
  CANCELLED:'bg-red-50 text-red-600', COMPLETED:'bg-gray-100 text-gray-500', EXPIRED:'bg-gray-100 text-gray-500',
};

function PendingRequests({ activityId, onApprove, onReject }: { activityId:number; onApprove:(id:number)=>Promise<void>; onReject:(id:number)=>Promise<void> }) {
  const [loadingId, setLoadingId] = useState<number|null>(null);
  const { data, isLoading } = useQuery({ queryKey:['activity-pending',activityId], queryFn:()=>activitiesApi.getMembers(activityId,'PENDING',0,20) });
  const pending = data?.content??[];

  const handleApprove = async (id: number) => {
    setLoadingId(id);
    try { await onApprove(id); } finally { setLoadingId(null); }
  };
  const handleReject = async (id: number) => {
    setLoadingId(id);
    try { await onReject(id); } finally { setLoadingId(null); }
  };

  if(isLoading) return <Loader2 className="animate-spin text-primary-400 mx-auto" size={20}/>;
  if(pending.length===0) return <p className="text-sm text-gray-400 text-center py-2">No pending requests</p>;
  return <div className="space-y-2">{pending.map(m=>(
    <div key={m.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-xl">
      <div className="w-9 h-9 rounded-full bg-primary-100 overflow-hidden flex items-center justify-center flex-shrink-0">
        {m.user.profileImage?<img src={m.user.profileImage} className="w-full h-full object-cover" alt=""/>:<span className="text-primary-600 font-bold text-xs">{m.user.name[0]}</span>}
      </div>
      <p className="text-sm font-medium flex-1 truncate">{m.user.name}</p>
      <button onClick={()=>handleApprove(m.id)} disabled={loadingId!==null} className="p-1.5 rounded-lg bg-green-100 text-green-600 hover:bg-green-200 disabled:opacity-50 disabled:cursor-not-allowed transition">
        {loadingId===m.id ? <Loader2 size={16} className="animate-spin"/> : <CheckCircle size={16}/>}
      </button>
      <button onClick={()=>handleReject(m.id)} disabled={loadingId!==null} className="p-1.5 rounded-lg bg-red-100 text-red-500 hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed transition">
        {loadingId===m.id ? <Loader2 size={16} className="animate-spin"/> : <XCircle size={16}/>}
      </button>
    </div>
  ))}</div>;
}

export default function ActivityDetailPage() {
  const { id } = useParams<{id:string}>();
  const router = useRouter(); const qc = useQueryClient();
  const me = useAppSelector(s=>s.auth.user);
  const [tab, setTab] = useState<'details'|'members'>('details');
  const [joining, setJoining] = useState(false);
  const activityId = Number(id);

  const { data:activity, isLoading, refetch } = useQuery({ queryKey:['activity',activityId], queryFn:()=>activitiesApi.get(activityId), staleTime:0 });
  const { data:membersData, isLoading:loadingMembers } = useQuery({ queryKey:['activity-members',activityId], queryFn:()=>activitiesApi.getMembers(activityId,'APPROVED',0,50), enabled:tab==='members' });
  const members = membersData?.content??[];

  const handleJoin = async () => {
    setJoining(true);
    try { await activitiesApi.join(activityId); toast.success(activity?.approvalRequired?'Join request sent!':'Joined! 🎉'); refetch(); }
    catch(err:any){ toast.error(err?.response?.data?.message??'Failed to join'); }
    finally { setJoining(false); }
  };
  const handleLeave = async () => {
    if(!confirm('Leave this activity?')) return;
    setJoining(true);
    try { await activitiesApi.leave(activityId); toast.success('Left activity'); refetch(); }
    catch(err:any){ toast.error(err?.response?.data?.message??'Failed'); }
    finally { setJoining(false); }
  };
  const handleShare = async () => {
    const url=`${window.location.origin}/activities/${activityId}`;
    if(navigator.share) navigator.share({title:activity?.title,url}).catch(()=>{});
    else { await navigator.clipboard.writeText(url); toast.success('Link copied!'); }
  };
  const handleApprove = async (memberId:number): Promise<void> => {
    try { await activitiesApi.approve(activityId,memberId); toast.success('Approved!'); await qc.refetchQueries({queryKey:['activity-pending',activityId]}); qc.invalidateQueries({queryKey:['activity-members',activityId]}); qc.invalidateQueries({queryKey:['activity',activityId]}); }
    catch { toast.error('Failed to approve'); throw new Error('approve failed'); }
  };
  const handleReject = async (memberId:number): Promise<void> => {
    try { await activitiesApi.reject(activityId,memberId); toast('Rejected'); await qc.refetchQueries({queryKey:['activity-pending',activityId]}); qc.invalidateQueries({queryKey:['activity',activityId]}); }
    catch { toast.error('Failed to reject'); throw new Error('reject failed'); }
  };

  if(isLoading) return <div className="flex justify-center items-center min-h-[60vh]"><Loader2 className="animate-spin text-primary-500" size={32}/></div>;
  if(!activity) return <div className="p-8 text-center"><p className="text-gray-400">Activity not found</p><button onClick={()=>router.back()} className="btn-primary mt-4">Go back</button></div>;

  const isHost=activity.isHost, joinStatus=activity.myJoinStatus;
  const isJoined=joinStatus==='APPROVED', isPending=joinStatus==='PENDING', isRejected=joinStatus==='REJECTED';
  const isFull=activity.status==='FULL', isCancelled=activity.status==='CANCELLED', isExpired=['EXPIRED','COMPLETED'].includes(activity.status);
  const hasEnded=isPast(new Date(activity.activityTime));
  const canJoin=!isJoined&&!isPending&&!isHost&&!isFull&&!isCancelled&&!isExpired&&!hasEnded&&!isRejected;
  const spotsLeft=activity.maxMembers?activity.maxMembers-activity.currentMemberCount:null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Cover */}
      <div className="relative h-48 bg-gradient-to-br from-primary-400 via-teal-400 to-blue-500 flex items-center justify-center overflow-hidden">
        {activity.coverImage?<img src={activity.coverImage} className="w-full h-full object-cover absolute inset-0" alt=""/>:<span className="text-7xl">{TYPE_EMOJI[activity.activityType]??'📌'}</span>}
        <div className="absolute inset-0 bg-black/20"/>
        <button onClick={()=>router.back()} className="absolute top-4 left-4 w-9 h-9 bg-black/30 backdrop-blur-sm rounded-full flex items-center justify-center text-white z-10"><ArrowLeft size={18}/></button>
        <button onClick={handleShare} className="absolute top-4 right-4 w-9 h-9 bg-black/30 backdrop-blur-sm rounded-full flex items-center justify-center text-white z-10"><Share2 size={16}/></button>
        <div className="absolute bottom-4 left-4 z-10"><span className={`badge text-xs font-bold ${STATUS_COLOR[activity.status]??'bg-gray-100 text-gray-500'}`}>{activity.status}</span></div>
      </div>

      {/* Info */}
      <div className="bg-white px-4 pt-4 pb-5 border-b border-gray-100">
        <div className="flex items-center gap-2 mb-1">
          <span className="badge bg-primary-50 text-primary-600 text-xs">{activity.activityType}</span>
          {activity.privateActivity&&<span className="badge bg-gray-100 text-gray-500 text-xs gap-1"><Lock size={10}/>Private</span>}
        </div>
        <h1 className="text-xl font-bold text-gray-900 mt-1">{activity.title}</h1>

        <Link href={`/profile/${activity.hostUser.id}`} className="flex items-center gap-2 mt-3">
          <div className="w-8 h-8 rounded-full bg-primary-100 overflow-hidden flex items-center justify-center flex-shrink-0">
            {activity.hostUser.profileImage?<img src={activity.hostUser.profileImage} className="w-full h-full object-cover" alt=""/>:<span className="text-primary-600 font-bold text-xs">{activity.hostUser.name[0]}</span>}
          </div>
          <div>
            <div className="flex items-center gap-1.5"><span className="text-sm font-semibold text-gray-900">{activity.hostUser.name}</span><Crown size={12} className="text-yellow-500"/></div>
            <span className="text-xs text-gray-400">Host</span>
          </div>
        </Link>

        <div className="mt-4 space-y-2.5">
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <CalendarDays size={16} className="text-primary-500 flex-shrink-0"/>
            <span className="font-medium">{format(new Date(activity.activityTime),'EEEE, MMMM d yyyy')}</span>
            <span className="text-gray-400">{format(new Date(activity.activityTime),'h:mm a')}</span>
          </div>
          {activity.endTime&&<div className="flex items-center gap-3 text-sm text-gray-600"><Clock size={16} className="text-primary-500 flex-shrink-0"/><span>Ends at {format(new Date(activity.endTime),'h:mm a')}</span></div>}
          {activity.address&&<div className="flex items-center gap-3 text-sm text-gray-600"><MapPin size={16} className="text-primary-500 flex-shrink-0"/><span>{activity.address}</span></div>}
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <Users size={16} className="text-primary-500 flex-shrink-0"/>
            <span><strong>{activity.currentMemberCount}</strong>{activity.maxMembers?` / ${activity.maxMembers} spots`:' joined'}
              {spotsLeft!==null&&spotsLeft>0&&<span className="text-green-600 ml-2">({spotsLeft} left)</span>}
              {spotsLeft===0&&<span className="text-red-500 ml-2">(Full)</span>}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-5 flex gap-2">
          {canJoin&&<button onClick={handleJoin} disabled={joining} className="btn-primary flex-1 py-3 gap-2">{joining?<Loader2 size={16} className="animate-spin"/>:<UserPlus size={16}/>}{activity.approvalRequired?'Request to Join':'Join Activity'}</button>}
          {isPending&&<button disabled className="flex-1 py-3 rounded-xl border-2 border-yellow-200 text-yellow-600 text-sm font-semibold flex items-center justify-center gap-2 bg-yellow-50"><Clock size={16}/>Request Pending</button>}
          {isRejected&&<div className="flex-1 py-3 rounded-xl border-2 border-red-100 text-red-400 text-sm font-semibold flex items-center justify-center gap-2 bg-red-50"><XCircle size={16}/>Request Rejected</div>}
          {isJoined&&!isHost&&<button onClick={handleLeave} disabled={joining} className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-600 hover:border-red-300 hover:text-red-500 text-sm font-semibold flex items-center justify-center gap-2 transition"><LogOut size={16}/>Leave Activity</button>}
          {isHost&&<div className="flex-1 py-3 rounded-xl bg-yellow-50 border-2 border-yellow-200 text-yellow-700 text-sm font-semibold flex items-center justify-center gap-2"><Crown size={16}/>You are the host</div>}
          {isFull&&!isJoined&&!isHost&&<div className="flex-1 py-3 rounded-xl bg-orange-50 border-2 border-orange-200 text-orange-600 text-sm font-semibold flex items-center justify-center">Activity is Full</div>}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-white border-b border-gray-100 sticky top-14 z-30">
        {(['details','members'] as const).map(t=>(
          <button key={t} onClick={()=>setTab(t)} className={`flex-1 py-3 text-sm font-semibold border-b-2 transition capitalize ${tab===t?'border-primary-500 text-primary-600':'border-transparent text-gray-400'}`}>
            {t==='members'?`Members (${activity.currentMemberCount})`:'Details'}
          </button>
        ))}
      </div>

      {/* Details Tab */}
      {tab==='details'&&(
        <div className="px-4 py-4 space-y-4">
          {activity.description&&<div className="card p-4"><h3 className="font-bold text-gray-900 mb-2">About this activity</h3><p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{activity.description}</p></div>}
          <div className="card p-4 space-y-3">
            <h3 className="font-bold text-gray-900">Details</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                {label:'Type',    value:`${TYPE_EMOJI[activity.activityType]} ${activity.activityType}`},
                {label:'Privacy', value:activity.privateActivity?'🔒 Private':'🌐 Public'},
                {label:'Approval',value:activity.approvalRequired?'✋ Required':'✅ Auto'},
                {label:'Posted',  value:formatDistanceToNow(new Date(activity.createdAt),{addSuffix:true})},
              ].map(({label,value})=>(
                <div key={label} className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400 mb-1">{label}</p>
                  <p className="font-semibold text-sm text-gray-800">{value}</p>
                </div>
              ))}
            </div>
          </div>
          {activity.community&&<Link href={`/communities/${activity.community.id}`}><div className="card p-4 flex items-center gap-3 hover:shadow-md transition"><div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center">{activity.community.iconImage?<img src={activity.community.iconImage} className="w-full h-full rounded-xl object-cover" alt=""/>:<span className="text-primary-600 font-bold">{activity.community.name[0]}</span>}</div><div><p className="text-xs text-gray-400">Hosted in community</p><p className="font-semibold text-sm text-gray-900">{activity.community.name}</p></div><ArrowLeft size={16} className="rotate-180 text-gray-300 ml-auto"/></div></Link>}
          {isHost&&activity.approvalRequired&&<div className="card p-4"><h3 className="font-bold text-gray-900 mb-3">Pending Approvals</h3><PendingRequests activityId={activityId} onApprove={handleApprove} onReject={handleReject}/></div>}
        </div>
      )}

      {/* Members Tab */}
      {tab==='members'&&(
        <div className="px-4 py-4 space-y-2">
          {loadingMembers&&<div className="flex justify-center py-10"><Loader2 className="animate-spin text-primary-500" size={28}/></div>}
          {!loadingMembers&&members.length===0&&<div className="text-center py-16 text-gray-400"><Users size={40} className="mx-auto mb-3 opacity-30"/><p>No members yet</p></div>}
          {members.map(m=>(
            <Link key={m.id} href={`/profile/${m.user.id}`}>
              <div className="card p-3 flex items-center gap-3 hover:shadow-sm transition">
                <div className="w-11 h-11 rounded-full bg-primary-100 overflow-hidden flex items-center justify-center flex-shrink-0">
                  {m.user.profileImage?<img src={m.user.profileImage} className="w-full h-full object-cover" alt=""/>:<span className="text-primary-600 font-bold">{m.user.name[0]}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2"><p className="font-semibold text-sm truncate">{m.user.name}</p>{m.role==='HOST'&&<Crown size={12} className="text-yellow-500"/>}{m.user.online&&<div className="w-2 h-2 rounded-full bg-green-400"/>}</div>
                  <p className="text-xs text-gray-400">@{m.user.username}</p>
                </div>
                <span className={`badge text-xs ${m.joinStatus==='APPROVED'?'bg-green-50 text-green-600':'bg-yellow-50 text-yellow-600'}`}>{m.joinStatus}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
