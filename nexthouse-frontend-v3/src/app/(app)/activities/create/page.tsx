'use client';
// src/app/(app)/activities/create/page.tsx
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Loader2, CalendarDays, MapPin, Users, Lock, Globe } from 'lucide-react';
import { activitiesApi } from '@/api';
import type { ActivityType } from '@/types';
import toast from 'react-hot-toast';

const ACTIVITY_TYPES: ActivityType[] = ['SOCIAL','SPORTS','LEARNING','VOLUNTEERING','FOOD','ARTS','OUTDOOR','NEIGHBORHOOD_WATCH','OTHER'];
const TYPE_EMOJI: Record<string, string> = {
  SOCIAL:'🎉', SPORTS:'⚽', LEARNING:'📚', VOLUNTEERING:'🤝',
  FOOD:'🍜', ARTS:'🎨', OUTDOOR:'🌿', NEIGHBORHOOD_WATCH:'👀', OTHER:'📌',
};

const schema = z.object({
  title:           z.string().min(3,'Min 3 characters').max(200),
  description:     z.string().max(2000).optional(),
  activityType:    z.string().min(1,'Select a type'),
  activityTime:    z.string().min(1,'Select date and time'),
  endTime:         z.string().optional(),
  maxMembers:      z.number().min(2).max(10000).optional().or(z.literal('')),
  privateActivity: z.boolean(),
  approvalRequired:z.boolean(),
  address:         z.string().optional(),
});
type Form = z.infer<typeof schema>;

export default function CreateActivityPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [loc, setLoc] = useState({ lat: 3.139, lon: 101.6869 });

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      p => setLoc({ lat: p.coords.latitude, lon: p.coords.longitude })
    );
  }, []);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { activityType: '', privateActivity: false, approvalRequired: false },
  });

  const selectedType    = watch('activityType');
  const isPrivate       = watch('privateActivity');
  const needsApproval   = watch('approvalRequired');

  const onSubmit = async (data: Form) => {
    setLoading(true);
    try {
      const activity = await activitiesApi.create({
        title:            data.title,
        description:      data.description,
        activityType:     data.activityType as ActivityType,
        activityTime:     data.activityTime,
        endTime:          data.endTime || undefined,
        maxMembers:       data.maxMembers ? Number(data.maxMembers) : undefined,
        privateActivity:  data.privateActivity,
        approvalRequired: data.approvalRequired,
        latitude:         loc.lat,
        longitude:        loc.lon,
        address:          data.address,
      });
      toast.success('Activity created! 🎉');
      router.push(`/activities/${activity.id}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to create activity');
    } finally { setLoading(false); }
  };

  // Min datetime for input (now)
  const minDateTime = new Date();
  minDateTime.setMinutes(minDateTime.getMinutes() - minDateTime.getTimezoneOffset());
  const minDateTimeStr = minDateTime.toISOString().slice(0, 16);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 h-14 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => router.back()} className="p-1.5 rounded-xl text-gray-500 hover:bg-gray-100">
          <ArrowLeft size={20} />
        </button>
        <h1 className="font-bold text-gray-900">Create Activity</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="px-4 py-6 space-y-5 max-w-lg mx-auto pb-20">

        {/* Title */}
        <div>
          <label className="label">Activity title *</label>
          <input {...register('title')} type="text" placeholder="e.g. Morning Yoga in the Park" className={`input ${errors.title?'input-error':''}`}/>
          {errors.title && <p className="mt-1.5 text-xs text-red-500">{errors.title.message}</p>}
        </div>

        {/* Type */}
        <div>
          <label className="label">Activity type *</label>
          <div className="grid grid-cols-3 gap-2">
            {ACTIVITY_TYPES.map(type => (
              <button key={type} type="button" onClick={() => setValue('activityType', type)}
                className={`py-2.5 px-2 rounded-xl text-xs font-semibold border-2 transition flex flex-col items-center gap-1 ${
                  selectedType === type ? 'bg-primary-500 text-white border-primary-500' : 'border-gray-200 text-gray-600 hover:border-primary-300'
                }`}>
                <span className="text-base">{TYPE_EMOJI[type]}</span>
                <span>{type.replace('_',' ')}</span>
              </button>
            ))}
          </div>
          {errors.activityType && <p className="mt-1.5 text-xs text-red-500">{errors.activityType.message}</p>}
        </div>

        {/* Description */}
        <div>
          <label className="label">Description</label>
          <textarea {...register('description')} rows={3} placeholder="Tell people what this activity is about…" className="input resize-none"/>
        </div>

        {/* Date & Time */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label flex items-center gap-1"><CalendarDays size={14}/>Start time *</label>
            <input {...register('activityTime')} type="datetime-local" min={minDateTimeStr} className={`input text-sm ${errors.activityTime?'input-error':''}`}/>
            {errors.activityTime && <p className="mt-1.5 text-xs text-red-500">{errors.activityTime.message}</p>}
          </div>
          <div>
            <label className="label flex items-center gap-1"><CalendarDays size={14}/>End time</label>
            <input {...register('endTime')} type="datetime-local" min={minDateTimeStr} className="input text-sm"/>
          </div>
        </div>

        {/* Location */}
        <div>
          <label className="label flex items-center gap-1"><MapPin size={14}/>Address</label>
          <input {...register('address')} type="text" placeholder="e.g. Central Park, KL" className="input"/>
          <p className="text-xs text-gray-400 mt-1">📍 Your current GPS location will be used automatically</p>
        </div>

        {/* Max members */}
        <div>
          <label className="label flex items-center gap-1"><Users size={14}/>Max participants</label>
          <input {...register('maxMembers', { valueAsNumber: true })} type="number" min={2} max={10000} placeholder="Leave empty for unlimited" className="input"/>
        </div>

        {/* Privacy & Approval */}
        <div className="space-y-3">
          <label className="label">Settings</label>

          {/* Private toggle */}
          <div
            onClick={() => setValue('privateActivity', !isPrivate)}
            className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition ${isPrivate ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'}`}
          >
            {isPrivate ? <Lock size={20} className="text-primary-600 flex-shrink-0"/> : <Globe size={20} className="text-gray-400 flex-shrink-0"/>}
            <div className="flex-1">
              <p className={`font-semibold text-sm ${isPrivate ? 'text-primary-700' : 'text-gray-700'}`}>
                {isPrivate ? 'Private activity' : 'Public activity'}
              </p>
              <p className="text-xs text-gray-400">{isPrivate ? 'Only people you approve can join' : 'Anyone nearby can see and join'}</p>
            </div>
            <div className={`w-11 h-6 rounded-full transition-colors ${isPrivate ? 'bg-primary-500' : 'bg-gray-300'} relative flex-shrink-0`}>
              <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${isPrivate ? 'translate-x-5' : 'translate-x-0.5'}`}/>
            </div>
          </div>

          {/* Approval required toggle */}
          <div
            onClick={() => setValue('approvalRequired', !needsApproval)}
            className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition ${needsApproval ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'}`}
          >
            <Users size={20} className={needsApproval ? 'text-primary-600 flex-shrink-0' : 'text-gray-400 flex-shrink-0'}/>
            <div className="flex-1">
              <p className={`font-semibold text-sm ${needsApproval ? 'text-primary-700' : 'text-gray-700'}`}>
                {needsApproval ? 'Approval required' : 'Auto-accept members'}
              </p>
              <p className="text-xs text-gray-400">{needsApproval ? 'You approve each join request' : 'Members join instantly'}</p>
            </div>
            <div className={`w-11 h-6 rounded-full transition-colors ${needsApproval ? 'bg-primary-500' : 'bg-gray-300'} relative flex-shrink-0`}>
              <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${needsApproval ? 'translate-x-5' : 'translate-x-0.5'}`}/>
            </div>
          </div>
        </div>

        {/* Submit */}
        <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-base sticky bottom-4">
          {loading ? <><Loader2 size={18} className="animate-spin"/>Creating…</> : <>🎉 Create Activity</>}
        </button>
      </form>
    </div>
  );
}
