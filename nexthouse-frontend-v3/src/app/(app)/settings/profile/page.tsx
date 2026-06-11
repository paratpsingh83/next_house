'use client';
// src/app/(app)/settings/profile/page.tsx
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Camera, Loader2, MapPin, Save, User } from 'lucide-react';
import { usersApi, mediaApi } from '@/api';
import { useAppDispatch, useAppSelector } from '@/store';
import { setUser } from '@/store/slices/authSlice';
import toast from 'react-hot-toast';

const schema = z.object({
  name:    z.string().min(2,'Min 2 characters').max(100),
  bio:     z.string().max(300).optional(),
  gender:  z.enum(['MALE','FEMALE','OTHER','']).optional(),
  address: z.string().max(200).optional(),
  city:    z.string().max(100).optional(),
  country: z.string().max(100).optional(),
});
type Form = z.infer<typeof schema>;

export default function EditProfilePage() {
  const router   = useRouter();
  const dispatch = useAppDispatch();
  const me       = useAppSelector(s => s.auth.user);
  const [saving,    setSaving]    = useState(false);
  const [uploading, setUploading] = useState(false);
  const [avatar,    setAvatar]    = useState(me?.profileImage ?? '');
  const [loc, setLoc] = useState<{lat:number;lon:number}|null>(null);
  const [locLoading, setLocLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: {
      name:    me?.name    ?? '',
      bio:     me?.bio     ?? '',
      gender:  (me?.gender as any) ?? '',
      address: '',
      city:    '',
      country: '',
    },
  });

  // ── Avatar upload ──────────────────────────────────────────────────────────
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const preview = URL.createObjectURL(file);
      setAvatar(preview);
      const media = await mediaApi.upload(file, 'USER', me?.id);
      setAvatar(media.url);
      toast.success('Photo updated!');
    } catch { toast.error('Upload failed'); setAvatar(me?.profileImage ?? ''); }
    finally { setUploading(false); }
  };

  // ── Get current location ───────────────────────────────────────────────────
  const getLocation = () => {
    setLocLoading(true);
    navigator.geolocation?.getCurrentPosition(
      p => { setLoc({ lat: p.coords.latitude, lon: p.coords.longitude }); setLocLoading(false); toast.success('Location updated!'); },
      () => { setLocLoading(false); toast.error('Could not get location'); }
    );
  };

  // ── Save ───────────────────────────────────────────────────────────────────
  const onSubmit = async (data: Form) => {
    setSaving(true);
    try {
      const updated = await usersApi.updateProfile({
        name:         data.name,
        bio:          data.bio,
        gender:       data.gender || undefined,
        profileImage: avatar || undefined,
        address:      data.address,
        city:         data.city,
        country:      data.country,
        latitude:     loc?.lat,
        longitude:    loc?.lon,
      });
      dispatch(setUser(updated));
      toast.success('Profile saved!');
      router.back();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to save');
    } finally { setSaving(false); }
  };

  if (!me) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-4 h-14 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => router.back()} className="p-1.5 rounded-xl text-gray-500 hover:bg-gray-100">
          <ArrowLeft size={20} />
        </button>
        <h1 className="font-bold text-gray-900 flex-1">Edit Profile</h1>
        <button form="edit-profile-form" type="submit" disabled={saving} className="btn-primary text-sm px-4 py-2 gap-1.5">
          {saving ? <Loader2 size={14} className="animate-spin"/> : <Save size={14}/>}
          Save
        </button>
      </div>

      <form id="edit-profile-form" onSubmit={handleSubmit(onSubmit)} className="px-4 py-6 space-y-5 max-w-lg mx-auto pb-20">

        {/* Avatar */}
        <div className="flex flex-col items-center gap-3 py-4">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-primary-100 overflow-hidden flex items-center justify-center">
              {avatar
                ? <img src={avatar} className="w-full h-full object-cover" alt="Avatar"/>
                : <span className="text-primary-600 font-bold text-3xl">{me.name[0]}</span>
              }
              {uploading && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-full">
                  <Loader2 size={20} className="animate-spin text-white"/>
                </div>
              )}
            </div>
            <label className="absolute bottom-0 right-0 w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center cursor-pointer shadow-lg">
              <Camera size={14} className="text-white"/>
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={uploading}/>
            </label>
          </div>
          <p className="text-xs text-gray-400">Tap camera icon to change photo</p>
        </div>

        {/* Name */}
        <div>
          <label className="label">Full name *</label>
          <input {...register('name')} type="text" className={`input ${errors.name?'input-error':''}`}/>
          {errors.name && <p className="mt-1.5 text-xs text-red-500">{errors.name.message}</p>}
        </div>

        {/* Username (read-only) */}
        <div>
          <label className="label">Username</label>
          <div className="input bg-gray-50 text-gray-500 cursor-not-allowed">@{me.username}</div>
          <p className="text-xs text-gray-400 mt-1">Username cannot be changed</p>
        </div>

        {/* Bio */}
        <div>
          <label className="label">Bio</label>
          <textarea {...register('bio')} rows={3} placeholder="Tell your neighbours about yourself…" className="input resize-none"/>
          <p className="text-xs text-gray-400 mt-1">{(me.bio?.length ?? 0)}/300</p>
        </div>

        {/* Gender */}
        <div>
          <label className="label">Gender</label>
          <select {...register('gender')} className="input">
            <option value="">Prefer not to say</option>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
            <option value="OTHER">Other</option>
          </select>
        </div>

        {/* Location */}
        <div className="card p-4 space-y-3">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <MapPin size={16} className="text-primary-500"/>Location
          </h3>
          <div>
            <label className="label">Address</label>
            <input {...register('address')} type="text" placeholder="Your street address" className="input"/>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">City</label>
              <input {...register('city')} type="text" placeholder="Kuala Lumpur" className="input"/>
            </div>
            <div>
              <label className="label">Country</label>
              <input {...register('country')} type="text" placeholder="Malaysia" className="input"/>
            </div>
          </div>
          <button type="button" onClick={getLocation} disabled={locLoading}
            className="w-full py-2.5 rounded-xl border-2 border-primary-200 text-primary-600 text-sm font-semibold flex items-center justify-center gap-2 hover:bg-primary-50 transition">
            {locLoading ? <Loader2 size={16} className="animate-spin"/> : <MapPin size={16}/>}
            {loc ? '✅ GPS location captured' : 'Use my current GPS location'}
          </button>
        </div>

        {/* Trust Score Info */}
        <div className="card p-4 bg-primary-50 border-primary-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-primary-800">Trust Score</p>
              <p className="text-xs text-primary-600 mt-0.5">Verified by the community</p>
            </div>
            <div className="w-14 h-14 rounded-full bg-primary-500 flex items-center justify-center">
              <span className="text-white font-bold text-lg">{me.trustScore}</span>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {me.addressVerified && <span className="badge bg-white text-primary-600 gap-1">📍 Address Verified</span>}
            {me.identityVerified && <span className="badge bg-white text-primary-600 gap-1">✅ Identity Verified</span>}
          </div>
        </div>
      </form>
    </div>
  );
}
