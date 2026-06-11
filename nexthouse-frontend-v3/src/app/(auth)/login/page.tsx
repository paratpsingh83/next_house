'use client';
// src/app/(auth)/login/page.tsx
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react';
import { useAppDispatch } from '@/store';
import { setCredentials } from '@/store/slices/authSlice';
import { authApi } from '@/api';
import { tokens } from '@/lib/apiClient';
import toast from 'react-hot-toast';

const schema = z.object({
  identifier: z.string().min(1, 'Email, phone, or username is required'),
  password:   z.string().min(1, 'Password is required'),
});
type Form = z.infer<typeof schema>;

export default function LoginPage() {
  const router   = useRouter();
  const dispatch = useAppDispatch();
  const [showPwd,         setShowPwd]         = useState(false);
  const [loading,         setLoading]         = useState(false);
  const [twoFactorToken,  setTwoFactorToken]  = useState<string | null>(null);
  const [otp,             setOtp]             = useState('');
  const [otpLoading,      setOtpLoading]      = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<Form>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: Form) => {
    setLoading(true);
    try {
      const res = await authApi.login({
        identifier: data.identifier,
        password:   data.password,
        deviceType: 'WEB',
      });

      if (res.twoFactorRequired && res.twoFactorToken) {
        setTwoFactorToken(res.twoFactorToken);
        return;
      }

      if (res.user && res.accessToken) {
        tokens.setWsToken(res.accessToken);
        dispatch(setCredentials({ user: res.user }));
        toast.success(`Welcome back, ${res.user.name}!`);
        router.push('/feed');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const onVerify2FA = async () => {
    if (!twoFactorToken || otp.trim().length < 4) return;
    setOtpLoading(true);
    try {
      const res = await authApi.verify2FA(twoFactorToken, otp.trim());
      if (res.user && res.accessToken) {
        tokens.setWsToken(res.accessToken);
        dispatch(setCredentials({ user: res.user }));
        toast.success(`Welcome back, ${res.user.name}!`);
        router.push('/feed');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Invalid OTP. Please try again.');
    } finally {
      setOtpLoading(false);
    }
  };

  // ── 2FA step ────────────────────────────────────────────────────────────────
  if (twoFactorToken) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-[400px]">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-500 shadow-lg mb-4">
              <ShieldCheck className="text-white" size={28} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Two-Factor Authentication</h1>
            <p className="text-gray-500 mt-1">Enter the OTP sent to your phone</p>
          </div>

          <div className="card p-8 space-y-5">
            <div>
              <label className="label">One-Time Password</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="input text-center text-2xl tracking-[0.5em]"
                autoFocus
              />
            </div>

            <button
              onClick={onVerify2FA}
              disabled={otpLoading || otp.length < 4}
              className="btn-primary w-full py-3 text-base"
            >
              {otpLoading ? <><Loader2 size={18} className="animate-spin" /> Verifying…</> : 'Verify'}
            </button>

            <button
              type="button"
              onClick={() => setTwoFactorToken(null)}
              className="w-full text-sm text-gray-500 hover:text-gray-700 text-center"
            >
              Back to login
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Login step ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-[400px]">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-500 shadow-lg mb-4">
            <span className="text-white text-2xl font-bold">N</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
          <p className="text-gray-500 mt-1">Sign in to NextHouse</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="card p-8 space-y-5">
          <div>
            <label className="label">Email, phone, or username</label>
            <input
              {...register('identifier')}
              type="text"
              placeholder="you@example.com"
              autoComplete="username"
              className={`input ${errors.identifier ? 'input-error' : ''}`}
            />
            {errors.identifier && <p className="mt-1.5 text-xs text-red-500">{errors.identifier.message}</p>}
          </div>

          <div>
            <label className="label">Password</label>
            <div className="relative">
              <input
                {...register('password')}
                type={showPwd ? 'text' : 'password'}
                placeholder="••••••••"
                autoComplete="current-password"
                className={`input pr-11 ${errors.password ? 'input-error' : ''}`}
              />
              <button
                type="button"
                onClick={() => setShowPwd(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.password && <p className="mt-1.5 text-xs text-red-500">{errors.password.message}</p>}
          </div>

          <div className="text-right">
            <Link href="/forgot-password" className="text-sm text-primary-600 hover:underline">
              Forgot password?
            </Link>
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-base">
            {loading ? <><Loader2 size={18} className="animate-spin" /> Signing in…</> : 'Sign in'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-primary-600 font-semibold hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
