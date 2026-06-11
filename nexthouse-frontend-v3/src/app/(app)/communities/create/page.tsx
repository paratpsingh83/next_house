'use client';
// src/app/(app)/communities/create/page.tsx
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Loader2, Users, Lock, Globe, AlertCircle, ShieldOff } from 'lucide-react';
import { communitiesApi } from '@/api';
import { useAppSelector } from '@/store';
import toast from 'react-hot-toast';

const COMMUNITY_TYPES = [
  'NEIGHBORHOOD', 'SOCIAL', 'SPORTS', 'EDUCATION',
  'ARTS', 'FOOD', 'HEALTH', 'TECHNOLOGY', 'OTHER',
];

const schema = z.object({
  name:             z.string().min(3, 'Minimum 3 characters').max(100),
  description:      z.string().max(500).optional(),
  communityType:    z.string().min(1, 'Select a type'),
  privateCommunity: z.boolean(),
});
type Form = z.infer<typeof schema>;

export default function CreateCommunityPage() {
  const router  = useRouter();
  const me      = useAppSelector(s => s.auth.user);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { communityType: '', privateCommunity: false },
  });

  const isPrivate = watch('privateCommunity');

  // ── Eligibility checks ───────────────────────────────────────────────────────
  const isUnverified  = me?.verificationStatus === 'UNVERIFIED';
  const isInactive    = me?.accountStatus !== 'ACTIVE';
  const isBlocked     = isUnverified || isInactive;

  const onSubmit = async (data: Form) => {
    if (isBlocked) return;
    setLoading(true);
    try {
      const community = await communitiesApi.create({
        name:             data.name,
        description:      data.description,
        communityType:    data.communityType,
        privateCommunity: data.privateCommunity,
      });
      toast.success('Community created!');
      router.push(`/communities/${community.id}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to create community');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 h-14 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => router.back()} className="p-1.5 rounded-xl text-gray-500 hover:bg-gray-100">
          <ArrowLeft size={20} />
        </button>
        <h1 className="font-bold text-gray-900">Create Community</h1>
      </div>

      <div className="px-4 py-6 space-y-5 max-w-lg mx-auto">

        {/* ── Eligibility banners ───────────────────────────────────────────── */}
        {isUnverified && (
          <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <AlertCircle size={20} className="text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-800 text-sm">Account not verified</p>
              <p className="text-amber-700 text-xs mt-0.5">
                Verify your phone or email before creating a community.
              </p>
            </div>
          </div>
        )}

        {!isUnverified && isInactive && (
          <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
            <ShieldOff size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-800 text-sm">Account not active</p>
              <p className="text-red-700 text-xs mt-0.5">
                Your account status is <strong>{me?.accountStatus}</strong>. Community creation is unavailable.
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

          {/* Name */}
          <div>
            <label className="label">Community name *</label>
            <input
              {...register('name')}
              type="text"
              placeholder="e.g. Taman Desa Residents"
              disabled={isBlocked}
              className={`input ${errors.name ? 'input-error' : ''} ${isBlocked ? 'opacity-50 cursor-not-allowed' : ''}`}
            />
            {errors.name && <p className="mt-1.5 text-xs text-red-500">{errors.name.message}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="label">Description</label>
            <textarea
              {...register('description')}
              rows={3}
              placeholder="What is this community about?"
              disabled={isBlocked}
              className={`input resize-none ${isBlocked ? 'opacity-50 cursor-not-allowed' : ''}`}
            />
          </div>

          {/* Type */}
          <div>
            <label className="label">Community type *</label>
            <div className="grid grid-cols-3 gap-2">
              {COMMUNITY_TYPES.map(type => (
                <button
                  key={type}
                  type="button"
                  disabled={isBlocked}
                  onClick={() => setValue('communityType', type)}
                  className={`py-2 px-2 rounded-xl text-xs font-semibold border-2 transition ${
                    watch('communityType') === type
                      ? 'bg-primary-500 text-white border-primary-500'
                      : 'border-gray-200 text-gray-600 hover:border-primary-300'
                  } ${isBlocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {type}
                </button>
              ))}
            </div>
            {errors.communityType && <p className="mt-1.5 text-xs text-red-500">{errors.communityType.message}</p>}
          </div>

          {/* Privacy */}
          <div>
            <label className="label">Privacy</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={isBlocked}
                onClick={() => setValue('privateCommunity', false)}
                className={`p-4 rounded-xl border-2 text-left transition ${
                  !isPrivate ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'
                } ${isBlocked ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <Globe size={20} className={!isPrivate ? 'text-primary-600' : 'text-gray-400'} />
                <p className={`font-semibold text-sm mt-2 ${!isPrivate ? 'text-primary-700' : 'text-gray-700'}`}>Public</p>
                <p className="text-xs text-gray-400 mt-0.5">Anyone can join</p>
              </button>

              <button
                type="button"
                disabled={isBlocked}
                onClick={() => setValue('privateCommunity', true)}
                className={`p-4 rounded-xl border-2 text-left transition ${
                  isPrivate ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'
                } ${isBlocked ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <Lock size={20} className={isPrivate ? 'text-primary-600' : 'text-gray-400'} />
                <p className={`font-semibold text-sm mt-2 ${isPrivate ? 'text-primary-700' : 'text-gray-700'}`}>Private</p>
                <p className="text-xs text-gray-400 mt-0.5">Approval required</p>
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || isBlocked}
            className="btn-primary w-full py-3 text-base disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading
              ? <><Loader2 size={18} className="animate-spin" /> Creating…</>
              : <><Users size={18} /> Create Community</>
            }
          </button>

          {isBlocked && (
            <p className="text-center text-xs text-gray-400">
              {isUnverified
                ? 'Verify your account to unlock community creation.'
                : 'Community creation requires an active account.'}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}