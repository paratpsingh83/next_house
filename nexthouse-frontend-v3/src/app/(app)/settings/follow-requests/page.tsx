'use client';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, UserCheck, UserX, Loader2, Users } from 'lucide-react';
import { usersApi } from '@/api';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import { useState } from 'react';

export default function FollowRequestsPage() {
  const router = useRouter();
  const qc     = useQueryClient();
  const [processing, setProcessing] = useState<number | null>(null);

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['follow-requests'],
    queryFn:  () => usersApi.getFollowRequests(),
  });

  const handleAccept = async (requestId: number, name: string) => {
    setProcessing(requestId);
    try {
      await usersApi.acceptFollowRequest(requestId);
      qc.invalidateQueries({ queryKey: ['follow-requests'] });
      toast.success(`${name} is now following you`);
    } catch {
      toast.error('Failed to accept');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (requestId: number, name: string) => {
    setProcessing(requestId);
    try {
      await usersApi.rejectFollowRequest(requestId);
      qc.invalidateQueries({ queryKey: ['follow-requests'] });
      toast.success(`Request from ${name} removed`);
    } catch {
      toast.error('Failed to reject');
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 h-14 flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 -ml-2 rounded-xl hover:bg-gray-100 transition">
          <ChevronLeft size={22} className="text-gray-700"/>
        </button>
        <h1 className="text-lg font-bold text-gray-900">Follow Requests</h1>
        {requests.length > 0 && (
          <span className="ml-1 min-w-[22px] h-[22px] bg-primary-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1">
            {requests.length}
          </span>
        )}
      </div>

      <div className="px-4 py-4">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="animate-spin text-primary-500" size={28}/>
          </div>
        ) : requests.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center">
              <Users size={28} className="text-gray-400"/>
            </div>
            <p className="font-bold text-gray-600">No pending requests</p>
            <p className="text-sm text-gray-400 text-center">
              When someone requests to follow your private account, they&apos;ll appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="section-title">People who want to follow you</p>
            <div className="card overflow-hidden divide-y divide-gray-50">
              {requests.map(({ requestId, requester, requestedAt }) => (
                <div key={requestId} className="flex items-center gap-3 px-4 py-3">
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-full bg-primary-100 overflow-hidden flex items-center justify-center flex-shrink-0">
                    {requester.profileImage
                      ? <img src={requester.profileImage} className="w-full h-full object-cover" alt=""/>
                      : <span className="text-primary-600 font-bold text-lg">{requester.name[0]}</span>
                    }
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{requester.name}</p>
                    <p className="text-xs text-gray-400">@{requester.username}</p>
                    {requestedAt && (
                      <p className="text-[10px] text-gray-300 mt-0.5">
                        {formatDistanceToNow(new Date(requestedAt), { addSuffix: true })}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleAccept(requestId, requester.name)}
                      disabled={processing === requestId}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-primary-500 text-white text-xs font-semibold hover:bg-primary-600 transition disabled:opacity-50"
                    >
                      {processing === requestId
                        ? <Loader2 size={12} className="animate-spin"/>
                        : <UserCheck size={13}/>
                      }
                      Confirm
                    </button>
                    <button
                      onClick={() => handleReject(requestId, requester.name)}
                      disabled={processing === requestId}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gray-100 text-gray-700 text-xs font-semibold hover:bg-gray-200 transition disabled:opacity-50"
                    >
                      {processing === requestId
                        ? <Loader2 size={12} className="animate-spin"/>
                        : <UserX size={13}/>
                      }
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-xs text-gray-400 text-center pt-2 pb-4">
              These people won&apos;t be notified if you decline.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}