'use client';
import type { ActivityResponse } from '@/types';
import { CalendarDays, MapPin, Users } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';

export const TYPE_EMOJI: Record<string, string> = {
  SOCIAL: '🎉', SPORTS: '⚽', LEARNING: '📚', VOLUNTEERING: '🤝',
  FOOD: '🍜', ARTS: '🎨', OUTDOOR: '🌿', NEIGHBORHOOD_WATCH: '👀', OTHER: '📌', ALL: '🗂️',
};

export const STATUS_COLOR: Record<string, string> = {
  PUBLISHED: 'bg-green-50 text-green-600',
  FULL:      'bg-orange-50 text-orange-600',
  CANCELLED: 'bg-red-50 text-red-600',
  COMPLETED: 'bg-gray-100 text-gray-500',
};

export default function ActivityCard({ activity: a }: { activity: ActivityResponse }) {
  return (
    <Link href={`/activities/${a.id}`}>
      <div className="card p-4 hover:shadow-md transition space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{TYPE_EMOJI[a.activityType] ?? '📌'}</span>
              <span className="badge bg-primary-50 text-primary-600 text-xs">{a.activityType}</span>
              {a.status !== 'PUBLISHED' && (
                <span className={`badge text-xs ${STATUS_COLOR[a.status] ?? 'bg-gray-100 text-gray-500'}`}>{a.status}</span>
              )}
            </div>
            <h3 className="font-bold text-gray-900 leading-snug">{a.title}</h3>
          </div>
          <div className={`badge text-xs flex-shrink-0 ${
            a.myJoinStatus === 'APPROVED' ? 'bg-green-50 text-green-600' :
            a.myJoinStatus === 'PENDING'  ? 'bg-yellow-50 text-yellow-600' :
            a.isHost ? 'bg-yellow-50 text-yellow-700' : 'bg-gray-100 text-gray-500'
          }`}>
            {a.isHost ? '👑 Host' : a.myJoinStatus === 'NONE' ? 'Open' : a.myJoinStatus}
          </div>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <CalendarDays size={11}/>{format(new Date(a.activityTime), 'MMM d, h:mm a')}
          </span>
          {a.address && (
            <span className="flex items-center gap-1"><MapPin size={11}/>{a.address}</span>
          )}
          <span className="flex items-center gap-1">
            <Users size={11}/>{a.currentMemberCount}{a.maxMembers ? `/${a.maxMembers}` : ''} people
          </span>
        </div>

        <div className="flex items-center gap-2 pt-1 border-t border-gray-50">
          <div className="w-5 h-5 rounded-full bg-primary-100 overflow-hidden flex items-center justify-center flex-shrink-0">
            {a.hostUser.profileImage
              ? <img src={a.hostUser.profileImage} className="w-full h-full object-cover" alt=""/>
              : <span className="text-primary-600 font-bold text-[9px]">{a.hostUser.name[0]}</span>
            }
          </div>
          <span className="text-xs text-gray-400">
            by <span className="font-medium text-gray-600">{a.hostUser.name}</span>
          </span>
        </div>
      </div>
    </Link>
  );
}