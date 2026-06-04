'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Loader2, Lock, Eye, EyeOff } from 'lucide-react';
import { authApi } from '@/api';
import toast from 'react-hot-toast';

const schema = z.object({
  currentPassword: z.string().min(1,'Required'),
  newPassword:     z.string().min(8,'Min 8 characters'),
  confirmPassword: z.string(),
}).refine(d => d.newPassword === d.confirmPassword, { message:'Passwords do not match', path:['confirmPassword'] });
type Form = z.infer<typeof schema>;

export default function ChangePasswordPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<Form>({ resolver: zodResolver(schema) });

  const onSubmit = async (d: Form) => {
    setLoading(true);
    try {
      await authApi.changePassword({ currentPassword: d.currentPassword, newPassword: d.newPassword });
      toast.success('Password changed successfully!');
      reset();
      router.back();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to change password');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-4 h-14 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => router.back()} className="p-1.5 rounded-xl text-gray-500 hover:bg-gray-100"><ArrowLeft size={20}/></button>
        <h1 className="font-bold text-gray-900">Change Password</h1>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="px-4 py-6 space-y-5 max-w-lg mx-auto">
        {[
          { f:'currentPassword', l:'Current password', show:showCurrent, toggle:()=>setShowCurrent(v=>!v) },
          { f:'newPassword',     l:'New password',     show:showNew,     toggle:()=>setShowNew(v=>!v) },
          { f:'confirmPassword', l:'Confirm new password', show:showNew, toggle:()=>setShowNew(v=>!v) },
        ].map(({ f, l, show, toggle }) => (
          <div key={f}>
            <label className="label">{l}</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-3.5 text-gray-400"/>
              <input {...register(f as any)} type={show?'text':'password'} placeholder="••••••••"
                className={`input pl-9 pr-11 ${(errors as any)[f]?'input-error':''}`}/>
              <button type="button" onClick={toggle} className="absolute right-3 top-3.5 text-gray-400">
                {show?<EyeOff size={16}/>:<Eye size={16}/>}
              </button>
            </div>
            {(errors as any)[f] && <p className="mt-1.5 text-xs text-red-500">{(errors as any)[f].message}</p>}
          </div>
        ))}
        <button type="submit" disabled={loading} className="btn-primary w-full py-3">
          {loading?<><Loader2 size={18} className="animate-spin"/>Changing…</>:'Change Password'}
        </button>
      </form>
    </div>
  );
}
