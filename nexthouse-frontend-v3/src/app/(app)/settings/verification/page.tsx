'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, MapPin, Shield, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '@/api';
import type { UserResponse } from '@/types';
import { useAppDispatch } from '@/store';
import { setUser } from '@/store/slices/authSlice';
import toast from 'react-hot-toast';

export default function VerificationPage() {
  const router = useRouter();
  const qc     = useQueryClient();
  const dispatch = useAppDispatch();
  const [addressLoading,  setAddressLoading]  = useState(false);
  const [identityLoading, setIdentityLoading] = useState(false);

  const { data: me, isLoading } = useQuery<UserResponse>({
    queryKey: ['me'],
    queryFn:  () => usersApi.getMe(),
  });

  const handleAddressVerify = async () => {
    setAddressLoading(true);
    try {
      await usersApi.verifyAddress();
      toast.success('Address verified! +10 trust score');
      const updated = await usersApi.getMe();
      dispatch(setUser(updated));
      qc.invalidateQueries({ queryKey: ['me'] });
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Verification failed');
    } finally {
      setAddressLoading(false);
    }
  };

  const handleIdentityVerify = async () => {
    setIdentityLoading(true);
    try {
      await usersApi.verifyIdentity();
      toast.success('Identity verified! +20 trust score');
      const updated = await usersApi.getMe();
      dispatch(setUser(updated));
      qc.invalidateQueries({ queryKey: ['me'] });
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Verification failed');
    } finally {
      setIdentityLoading(false);
    }
  };

  if (isLoading) return (
    <div className="flex justify-center items-center min-h-[60vh]">
      <Loader2 className="animate-spin text-primary-500" size={28}/>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 h-14 bg-white border-b border-gray-100 sticky top-0 z-10">
        <button onClick={() => router.back()} className="p-1.5 rounded-xl text-gray-500 hover:bg-gray-100">
          <ArrowLeft size={20}/>
        </button>
        <p className="font-bold text-gray-900">Verification</p>
      </div>

      <div className="px-4 py-5 space-y-4">
        {/* Info banner */}
        <div className="card p-4 bg-blue-50 border border-blue-100 flex gap-3">
          <AlertCircle size={18} className="text-blue-500 flex-shrink-0 mt-0.5"/>
          <p className="text-xs text-blue-700 leading-relaxed">
            Verified accounts build more trust in the community. Each verification adds to your trust score and shows a badge on your profile.
          </p>
        </div>

        {/* Address Verification */}
        <div className="card p-5">
          <div className="flex items-start gap-3">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 ${me?.addressVerified ? 'bg-blue-100' : 'bg-gray-100'}`}>
              <MapPin size={20} className={me?.addressVerified ? 'text-blue-600' : 'text-gray-400'}/>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-bold text-gray-900 text-sm">Address Verification</p>
                {me?.addressVerified && (
                  <span className="flex items-center gap-1 text-xs text-blue-600 font-semibold">
                    <CheckCircle size={12}/> Verified
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                Confirm you live at your registered address. Adds +10 trust score.
              </p>
              {me && !me.addressVerified && (!me.address) && (
                <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                  <AlertCircle size={11}/> Set your address in Edit Profile first
                </p>
              )}
            </div>
          </div>

          {!me?.addressVerified && (
            <button
              onClick={handleAddressVerify}
              disabled={addressLoading || !me?.address}
              className="mt-4 w-full py-2.5 rounded-xl bg-blue-500 text-white text-sm font-semibold hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
            >
              {addressLoading ? <Loader2 size={16} className="animate-spin"/> : <MapPin size={16}/>}
              Verify Address
            </button>
          )}
          {me?.addressVerified && (
            <div className="mt-4 w-full py-2.5 rounded-xl bg-blue-50 text-blue-600 text-sm font-semibold flex items-center justify-center gap-2">
              <CheckCircle size={16}/> Address Verified
            </div>
          )}
        </div>

        {/* Identity Verification */}
        <div className="card p-5">
          <div className="flex items-start gap-3">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 ${me?.identityVerified ? 'bg-green-100' : 'bg-gray-100'}`}>
              <Shield size={20} className={me?.identityVerified ? 'text-green-600' : 'text-gray-400'}/>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-bold text-gray-900 text-sm">Identity Verification</p>
                {me?.identityVerified && (
                  <span className="flex items-center gap-1 text-xs text-green-600 font-semibold">
                    <CheckCircle size={12}/> Verified
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                Verify your identity to become a trusted member of the community. Adds +20 trust score.
              </p>
            </div>
          </div>

          {!me?.identityVerified && (
            <button
              onClick={handleIdentityVerify}
              disabled={identityLoading}
              className="mt-4 w-full py-2.5 rounded-xl bg-green-500 text-white text-sm font-semibold hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
            >
              {identityLoading ? <Loader2 size={16} className="animate-spin"/> : <Shield size={16}/>}
              Verify Identity
            </button>
          )}
          {me?.identityVerified && (
            <div className="mt-4 w-full py-2.5 rounded-xl bg-green-50 text-green-600 text-sm font-semibold flex items-center justify-center gap-2">
              <CheckCircle size={16}/> Identity Verified
            </div>
          )}
        </div>

        {/* Trust score info */}
        <div className="card p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Your Trust Score</p>
          <div className="flex items-center gap-4">
            <div className="text-3xl font-bold text-primary-600">{me?.trustScore ?? 0}</div>
            <div className="flex-1">
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className="bg-primary-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min((me?.trustScore ?? 0), 100)}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">out of 100</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}