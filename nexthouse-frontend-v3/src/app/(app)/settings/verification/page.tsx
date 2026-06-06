'use client';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, MapPin, Shield, CheckCircle, Loader2,
  AlertCircle, Upload, X, FileText, ChevronDown,
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { usersApi, mediaApi } from '@/api';
import type { UserResponse } from '@/types';
import { useAppDispatch } from '@/store';
import { setUser } from '@/store/slices/authSlice';
import toast from 'react-hot-toast';

// ─── Config ───────────────────────────────────────────────────────────────────

const IDENTITY_DOC_TYPES = [
  { value: 'AADHAAR',         label: 'Aadhaar Card' },
  { value: 'PASSPORT',        label: 'Passport' },
  { value: 'DRIVING_LICENSE', label: 'Driving License' },
  { value: 'NATIONAL_ID',     label: 'National ID Card' },
  { value: 'VOTER_ID',        label: 'Voter ID Card' },
];

const ADDRESS_DOC_TYPES = [
  { value: 'UTILITY_BILL',       label: 'Electricity / Water Bill' },
  { value: 'RENTAL_AGREEMENT',   label: 'Rental / Lease Agreement' },
  { value: 'BANK_STATEMENT',     label: 'Bank Statement' },
  { value: 'GOVERNMENT_LETTER',  label: 'Government Letter' },
  { value: 'PROPERTY_TAX',       label: 'Property Tax Receipt' },
];

// ─── Sub-component: one verification card ────────────────────────────────────

interface VerifyCardProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  iconBg: string;
  btnColor: string;
  docTypes: { value: string; label: string }[];
  verified: boolean;
  verifiedLabel: string;
  verifiedColor: string;
  onSubmit: (docType: string, mediaId: number) => Promise<void>;
  entityType: string;
}

function VerifyCard({
  title, subtitle, icon, iconBg, btnColor,
  docTypes, verified, verifiedLabel, verifiedColor,
  onSubmit, entityType,
}: VerifyCardProps) {
  const fileRef   = useRef<HTMLInputElement>(null);
  const [docType,   setDocType]   = useState('');
  const [preview,   setPreview]   = useState<string | null>(null);
  const [mediaId,   setMediaId]   = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting,setSubmitting]= useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Preview
    setPreview(URL.createObjectURL(file));
    setMediaId(null);
    // Upload
    setUploading(true);
    try {
      const res = await mediaApi.upload(file, entityType);
      setMediaId(res.id);
    } catch {
      toast.error('Upload failed. Please try again.');
      setPreview(null);
    } finally {
      setUploading(false);
    }
  };

  const clearFile = () => {
    setPreview(null);
    setMediaId(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleSubmit = async () => {
    if (!docType)  { toast.error('Please select a document type');  return; }
    if (!mediaId)  { toast.error('Please upload your document');     return; }
    setSubmitting(true);
    try {
      await onSubmit(docType, mediaId);
    } finally {
      setSubmitting(false);
    }
  };

  if (verified) {
    return (
      <div className="card p-5">
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
            {icon}
          </div>
          <div>
            <p className="font-bold text-gray-900 text-sm">{title}</p>
            <span className={`flex items-center gap-1 text-xs font-semibold mt-0.5 ${verifiedColor}`}>
              <CheckCircle size={12}/> {verifiedLabel}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
          {icon}
        </div>
        <div className="flex-1">
          <p className="font-bold text-gray-900 text-sm">{title}</p>
          <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{subtitle}</p>
        </div>
      </div>

      {/* Step 1 — Document type */}
      <div>
        <p className="text-xs font-semibold text-gray-500 mb-1.5">Step 1 — Select document type</p>
        <div className="relative">
          <select
            value={docType}
            onChange={e => setDocType(e.target.value)}
            className="w-full appearance-none border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-primary-300 pr-8"
          >
            <option value="">-- Choose document --</option>
            {docTypes.map(d => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/>
        </div>
      </div>

      {/* Step 2 — Upload */}
      <div>
        <p className="text-xs font-semibold text-gray-500 mb-1.5">Step 2 — Upload document photo</p>

        {!preview ? (
          <button
            onClick={() => fileRef.current?.click()}
            className="w-full border-2 border-dashed border-gray-200 rounded-xl py-6 flex flex-col items-center gap-2 hover:border-primary-300 hover:bg-primary-50 transition"
          >
            <Upload size={22} className="text-gray-300"/>
            <p className="text-xs text-gray-400">Tap to upload image or PDF</p>
            <p className="text-xs text-gray-300">Max 50 MB · JPG, PNG, PDF</p>
          </button>
        ) : (
          <div className="relative rounded-xl overflow-hidden border border-gray-200">
            <img src={preview} alt="Document" className="w-full max-h-44 object-cover"/>
            {uploading && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <Loader2 size={24} className="animate-spin text-white"/>
              </div>
            )}
            {!uploading && (
              <button
                onClick={clearFile}
                className="absolute top-2 right-2 w-7 h-7 bg-black/60 rounded-full flex items-center justify-center text-white"
              >
                <X size={14}/>
              </button>
            )}
            {!uploading && mediaId && (
              <div className="absolute bottom-2 left-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle size={10}/> Uploaded
              </div>
            )}
          </div>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={submitting || uploading || !docType || !mediaId}
        className={`w-full py-2.5 rounded-xl text-white text-sm font-semibold transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${btnColor}`}
      >
        {submitting ? <Loader2 size={16} className="animate-spin"/> : <FileText size={16}/>}
        Submit for Verification
      </button>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function VerificationPage() {
  const router   = useRouter();
  const qc       = useQueryClient();
  const dispatch = useAppDispatch();

  const { data: me, isLoading } = useQuery<UserResponse>({
    queryKey: ['me'],
    queryFn:  () => usersApi.getMe(),
  });

  const refresh = async () => {
    const updated = await usersApi.getMe();
    dispatch(setUser(updated));
    qc.setQueryData(['me'], updated);
  };

  const handleAddressVerify = async (docType: string, mediaId: number) => {
    await usersApi.verifyAddress(docType, mediaId);
    toast.success('Address verified! +10 trust score');
    await refresh();
  };

  const handleIdentityVerify = async (docType: string, mediaId: number) => {
    await usersApi.verifyIdentity(docType, mediaId);
    toast.success('Identity verified! +20 trust score');
    await refresh();
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
        {/* Info */}
        <div className="card p-4 bg-blue-50 border border-blue-100 flex gap-3">
          <AlertCircle size={18} className="text-blue-500 flex-shrink-0 mt-0.5"/>
          <p className="text-xs text-blue-700 leading-relaxed">
            Upload a clear photo of your document. Make sure all text is readable. Your documents are stored securely and only used for verification.
          </p>
        </div>

        {/* Identity Verification */}
        <VerifyCard
          title="Identity Verification"
          subtitle="Upload a government-issued photo ID. Adds +20 trust score."
          icon={<Shield size={20} className={me?.identityVerified ? 'text-green-600' : 'text-gray-400'}/>}
          iconBg={me?.identityVerified ? 'bg-green-100' : 'bg-gray-100'}
          btnColor="bg-green-500 hover:bg-green-600"
          docTypes={IDENTITY_DOC_TYPES}
          verified={!!me?.identityVerified}
          verifiedLabel="Identity Verified"
          verifiedColor="text-green-600"
          onSubmit={handleIdentityVerify}
          entityType="USER"
        />

        {/* Address Verification */}
        <VerifyCard
          title="Address Verification"
          subtitle="Upload a document proving your current address. Adds +10 trust score."
          icon={<MapPin size={20} className={me?.addressVerified ? 'text-blue-600' : 'text-gray-400'}/>}
          iconBg={me?.addressVerified ? 'bg-blue-100' : 'bg-gray-100'}
          btnColor="bg-blue-500 hover:bg-blue-600"
          docTypes={ADDRESS_DOC_TYPES}
          verified={!!me?.addressVerified}
          verifiedLabel="Address Verified"
          verifiedColor="text-blue-600"
          onSubmit={handleAddressVerify}
          entityType="USER"
        />

        {/* Trust score */}
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