'use client';
import { useState, useEffect } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useInView } from 'react-intersection-observer';
import { Loader2, Shield, AlertTriangle, PlusCircle } from 'lucide-react';
import { safetyApi } from '@/api';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

const SEVERITY_COLOR: Record<string,string> = { LOW:'bg-blue-50 text-blue-600', MEDIUM:'bg-yellow-50 text-yellow-600', HIGH:'bg-orange-50 text-orange-600', CRITICAL:'bg-red-50 text-red-600' };

export default function SafetyPage() {
  const [loc, setLoc] = useState({lat:3.139,lon:101.6869});
  useEffect(()=>{navigator.geolocation?.getCurrentPosition(p=>setLoc({lat:p.coords.latitude,lon:p.coords.longitude}));}, []);
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage, refetch } = useInfiniteQuery({ queryKey:['safety','nearby',loc], queryFn:({pageParam=0})=>safetyApi.nearby(loc.lat,loc.lon,5000,pageParam), getNextPageParam:l=>l.hasNext?l.page+1:undefined, initialPageParam:0 });
  const items = data?.pages.flatMap(p=>p.content)??[];
  const { ref, inView } = useInView({threshold:0.1});
  useEffect(()=>{if(inView&&hasNextPage&&!isFetchingNextPage)fetchNextPage();},[inView,hasNextPage,isFetchingNextPage]);
  const resolve = async (id:number) => { try { await safetyApi.resolve(id); toast.success('Alert resolved'); refetch(); } catch{toast.error('Failed');} };
  return (
    <div className="px-4 py-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Safety Alerts</h1>
      </div>
      {isLoading&&<div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary-500" size={28}/></div>}
      {!isLoading&&items.length===0&&<div className="text-center py-16 text-gray-400"><Shield size={40} className="mx-auto mb-3 opacity-30 text-green-500"/><p className="font-medium text-green-600">All clear nearby!</p><p className="text-sm mt-1">No active safety alerts in your area.</p></div>}
      <div className="space-y-3">
        {items.map(a=>(
          <div key={a.id} className={`card p-4 space-y-3 ${a.emergency?'border-red-200 bg-red-50/50':''}`}>
            <div className="flex items-start gap-3">
              <AlertTriangle size={20} className={a.severity==='CRITICAL'||a.emergency?'text-red-500':'text-yellow-500'} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-gray-900">{a.title}</h3>
                  {a.emergency&&<span className="badge bg-red-500 text-white text-xs animate-pulse">🚨 EMERGENCY</span>}
                  <span className={`badge text-xs ${SEVERITY_COLOR[a.severity]??'bg-gray-100 text-gray-600'}`}>{a.severity}</span>
                </div>
                {a.description&&<p className="text-sm text-gray-600 mt-1">{a.description}</p>}
                <div className="flex items-center gap-3 text-xs text-gray-400 mt-2">
                  <span>by {a.reportedBy.name}</span>
                  <span>{formatDistanceToNow(new Date(a.createdAt),{addSuffix:true})}</span>
                  {a.address&&<span>{a.address}</span>}
                </div>
              </div>
            </div>
            {!a.resolvedAt&&<button onClick={()=>resolve(a.id)} className="text-xs text-gray-500 hover:text-primary-600 border border-gray-200 hover:border-primary-300 px-3 py-1.5 rounded-lg transition">Mark as resolved</button>}
            {a.resolvedAt&&<span className="text-xs text-green-600 flex items-center gap-1"><Shield size={12}/>Resolved</span>}
          </div>
        ))}
      </div>
      <div ref={ref} className="h-4"/>
    </div>
  );
}
