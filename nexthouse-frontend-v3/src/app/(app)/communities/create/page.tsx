'use client';
// src/app/(app)/communities/create/page.tsx
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Loader2, Users, Lock, Globe } from 'lucide-react';
import { communitiesApi } from '@/api';
import toast from 'react-hot-toast';

const COMMUNITY_TYPES = [
  'NEIGHBORHOOD', 'SOCIAL', 'SPORTS', 'EDUCATION',
  'ARTS', 'FOOD', 'HEALTH', 'TECHNOLOGY', 'OTHER',
];

const schema = z.object({
  name:            z.string().min(3, 'Minimum 3 characters').max(100),
  description:     z.string().max(500).optional(),
  communityType:   z.string().min(1, 'Select a type'),
  privateCommunity: z.boolean(),
});
type Form = z.infer<typeof schema>;

export default function CreateCommunityPage() {
  const router  = useRouter();
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { communityType: '', privateCommunity: false },
  });

  const isPrivate = watch('privateCommunity');

  const onSubmit = async (data: Form) => {
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

      <form onSubmit={handleSubmit(onSubmit)} className="px-4 py-6 space-y-5 max-w-lg mx-auto">

        {/* Name */}
        <div>
          <label className="label">Community name *</label>
          <input
            {...register('name')}
            type="text"
            placeholder="e.g. Taman Desa Residents"
            className={`input ${errors.name ? 'input-error' : ''}`}
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
            className="input resize-none"
          />
          {errors.description && <p className="mt-1.5 text-xs text-red-500">{errors.description.message}</p>}
        </div>

        {/* Type */}
        <div>
          <label className="label">Community type *</label>
          <div className="grid grid-cols-3 gap-2">
            {COMMUNITY_TYPES.map(type => (
              <button
                key={type}
                type="button"
                onClick={() => setValue('communityType', type)}
                className={`py-2 px-2 rounded-xl text-xs font-semibold border-2 transition ${
                  watch('communityType') === type
                    ? 'bg-primary-500 text-white border-primary-500'
                    : 'border-gray-200 text-gray-600 hover:border-primary-300'
                }`}
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
            {/* Public */}
            <button
              type="button"
              onClick={() => setValue('privateCommunity', false)}
              className={`p-4 rounded-xl border-2 text-left transition ${
                !isPrivate ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <Globe size={20} className={!isPrivate ? 'text-primary-600' : 'text-gray-400'} />
              <p className={`font-semibold text-sm mt-2 ${!isPrivate ? 'text-primary-700' : 'text-gray-700'}`}>Public</p>
              <p className="text-xs text-gray-400 mt-0.5">Anyone can join</p>
            </button>

            {/* Private */}
            <button
              type="button"
              onClick={() => setValue('privateCommunity', true)}
              className={`p-4 rounded-xl border-2 text-left transition ${
                isPrivate ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'
              }`}
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
          disabled={loading}
          className="btn-primary w-full py-3 text-base"
        >
          {loading
            ? <><Loader2 size={18} className="animate-spin" /> Creating…</>
            : <><Users size={18} /> Create Community</>
          }
        </button>
      </form>
    </div>
  );
}
