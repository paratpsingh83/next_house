'use client';
import { useRef, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft, Shield, MapPin, CheckCircle, Loader2,
  Camera, CreditCard, Lock, ChevronRight,
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { usersApi, verificationApi } from '@/api';
import { useAppDispatch } from '@/store';
import { setUser } from '@/store/slices/authSlice';
import toast from 'react-hot-toast';

export default function VerificationPage() {
  const router   = useRouter();
  const params   = useSearchParams();
  const qc       = useQueryClient();
  const dispatch = useAppDispatch();

  const { data: me, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn:  () => usersApi.getMe(),
  });

  const refresh = async () => {
    const updated = await usersApi.getMe();
    dispatch(setUser(updated));
    qc.setQueryData(['me'], updated);
  };

  useEffect(() => {
    const status = params.get('digilocker');
    if (status === 'success') {
      toast.success('Address verified! +10 trust score 🎉');
      refresh();
    } else if (status === 'error') {
      toast.error('DigiLocker verification failed. Please try again.');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

      <div className="px-4 py-5 space-y-3 max-w-lg mx-auto">

        {/* Trust score */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Trust Score</p>
            <span className="text-lg font-bold text-primary-600">{me?.trustScore ?? 0} / 100</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div
              className="bg-primary-500 h-2 rounded-full transition-all duration-700"
              style={{ width: `${Math.min(me?.trustScore ?? 0, 100)}%` }}
            />
          </div>
          <div className="flex gap-3 mt-2">
            <span className="text-[11px] text-gray-400 flex items-center gap-1">
              <Shield size={10} className="text-green-500"/> Identity +20
            </span>
            <span className="text-[11px] text-gray-400 flex items-center gap-1">
              <MapPin size={10} className="text-blue-500"/> Address +10
            </span>
          </div>
        </div>

        {/* Identity */}
        {me?.identityVerified ? (
          <VerifiedCard
            icon={<Shield size={20} className="text-green-600"/>}
            bg="bg-green-50"
            title="Identity Verified"
            subtitle={me.kycName ? `Verified as ${me.kycName}` : 'Identity confirmed'}
            borderColor="border-green-200"
          />
        ) : (
          <IdentityCard onSuccess={refresh}/>
        )}

        {/* Address */}
        {me?.addressVerified ? (
          <VerifiedCard
            icon={<MapPin size={20} className="text-blue-600"/>}
            bg="bg-blue-50"
            title="Address Verified"
            subtitle="Your address is confirmed"
            borderColor="border-blue-200"
          />
        ) : (
          <AddressCard/>
        )}

        {/* Security note */}
        <div className="flex items-center gap-2 px-1">
          <Lock size={12} className="text-gray-300 flex-shrink-0"/>
          <p className="text-[11px] text-gray-400">
            Your documents are encrypted and used only to verify your identity. We never store your ID number.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Verified card ────────────────────────────────────────────────────────────

function VerifiedCard({ icon, bg, title, subtitle, borderColor }: {
  icon: React.ReactNode; bg: string; title: string; subtitle: string; borderColor: string;
}) {
  return (
    <div className={`card p-4 flex items-center gap-3 border ${borderColor}`}>
      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 ${bg}`}>
        {icon}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-1.5 font-bold text-sm text-gray-900">
          <CheckCircle size={13} className="text-green-500"/> {title}
        </div>
        <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
      </div>
    </div>
  );
}

// ─── Identity card — Selfie + ID Photo ───────────────────────────────────────

function IdentityCard({ onSuccess }: { onSuccess: () => Promise<void> }) {
  const idRef     = useRef<HTMLInputElement>(null);
  const selfieRef = useRef<HTMLInputElement>(null);
  const [idPhoto,     setIdPhoto]     = useState<File | null>(null);
  const [selfie,      setSelfie]      = useState<File | null>(null);
  const [idPreview,   setIdPreview]   = useState<string | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [loading,     setLoading]     = useState(false);

  const pickId = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setIdPhoto(f);
    setIdPreview(URL.createObjectURL(f));
  };

  const pickSelfie = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setSelfie(f);
    setSelfiePreview(URL.createObjectURL(f));
  };

  const handleSubmit = async () => {
    if (!idPhoto || !selfie) {
      toast.error('Please add both your ID photo and selfie');
      return;
    }
    setLoading(true);
    try {
      await verificationApi.verifyKyc(idPhoto, selfie);
      toast.success('Identity verified! +20 trust score 🎉');
      await onSuccess();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const ready = !!idPhoto && !!selfie;

  return (
    <div className="card p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-green-50 flex items-center justify-center flex-shrink-0">
          <Shield size={20} className="text-green-600"/>
        </div>
        <div>
          <p className="font-bold text-gray-900 text-sm">Identity Verification</p>
          <p className="text-xs text-gray-400">Photo of your ID + a selfie — done in 30 seconds</p>
        </div>
      </div>

      {/* Two photo pickers */}
      <div className="grid grid-cols-2 gap-3">

        {/* ID Photo */}
        <div>
          <p className="text-[11px] font-semibold text-gray-500 mb-1.5">
            Aadhaar / PAN / Driving License
          </p>
          <button
            onClick={() => idRef.current?.click()}
            className="w-full aspect-[3/2] rounded-2xl overflow-hidden border-2 border-dashed border-gray-200 hover:border-primary-300 transition flex items-center justify-center bg-gray-50 relative"
          >
            {idPreview ? (
              <img src={idPreview} className="w-full h-full object-cover" alt="ID"/>
            ) : (
              <div className="flex flex-col items-center gap-1.5 py-4">
                <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center">
                  <CreditCard size={18} className="text-primary-500"/>
                </div>
                <p className="text-[11px] text-gray-400 text-center leading-tight px-2">
                  Tap to add<br/>ID photo
                </p>
              </div>
            )}
          </button>
          <input ref={idRef} type="file" accept="image/*" className="hidden" onChange={pickId}/>
        </div>

        {/* Selfie */}
        <div>
          <p className="text-[11px] font-semibold text-gray-500 mb-1.5">Your selfie</p>
          <button
            onClick={() => selfieRef.current?.click()}
            className="w-full aspect-[3/2] rounded-2xl overflow-hidden border-2 border-dashed border-gray-200 hover:border-primary-300 transition flex items-center justify-center bg-gray-50 relative"
          >
            {selfiePreview ? (
              <img src={selfiePreview} className="w-full h-full object-cover" alt="Selfie"/>
            ) : (
              <div className="flex flex-col items-center gap-1.5 py-4">
                <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center">
                  <Camera size={18} className="text-primary-500"/>
                </div>
                <p className="text-[11px] text-gray-400 text-center leading-tight px-2">
                  Tap to take<br/>selfie
                </p>
              </div>
            )}
          </button>
          <input ref={selfieRef} type="file" accept="image/*" capture="user" className="hidden" onChange={pickSelfie}/>
        </div>
      </div>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={loading || !ready}
        className={`w-full py-3 rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2
          ${ready
            ? 'bg-green-500 hover:bg-green-600 text-white'
            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
      >
        {loading
          ? <><Loader2 size={16} className="animate-spin"/> Verifying…</>
          : <><Shield size={16}/> Verify Identity</>
        }
      </button>
    </div>
  );
}

// ─── Address card — DigiLocker one-tap ───────────────────────────────────────

function AddressCard() {
  const [loading, setLoad] = useState(false);

  const handleDigiLocker = async () => {
    setLoad(true);
    try {
      const { url } = await verificationApi.getDigiLockerUrl();
      window.location.href = url;
    } catch {
      toast.error('Could not connect to DigiLocker. Please try again.');
      setLoad(false);
    }
  };

  return (
    <div className="card p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-blue-50 flex items-center justify-center flex-shrink-0">
          <MapPin size={20} className="text-blue-600"/>
        </div>
        <div>
          <p className="font-bold text-gray-900 text-sm">Address Verification</p>
          <p className="text-xs text-gray-400">Connect DigiLocker — one tap, government verified</p>
        </div>
      </div>

      {/* One big button */}
      <button
        onClick={handleDigiLocker}
        disabled={loading}
        className="w-full py-3.5 rounded-2xl bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white font-semibold text-sm transition flex items-center justify-between px-5 disabled:opacity-60"
      >
        <div className="flex items-center gap-2.5">
          {loading
            ? <Loader2 size={18} className="animate-spin"/>
            : <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
                <MapPin size={15}/>
              </div>
          }
          <span>{loading ? 'Connecting…' : 'Verify with DigiLocker'}</span>
        </div>
        {!loading && <ChevronRight size={18} className="opacity-70"/>}
      </button>

      <p className="text-[11px] text-gray-400 text-center">
        Log in with Aadhaar OTP · Auto-redirects back · Takes 30 seconds
      </p>
    </div>
  );
}
