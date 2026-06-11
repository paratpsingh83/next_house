'use client';
// src/app/(auth)/forgot-password/page.tsx
import { useState } from 'react';
import Link from 'next/link';
import { Loader2, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { authApi } from '@/api';
import toast from 'react-hot-toast';

type Step = 'request' | 'verify' | 'reset' | 'done';

export default function ForgotPasswordPage() {
  const [step,       setStep]       = useState<Step>('request');
  const [identifier, setIdentifier] = useState('');
  const [otp,        setOtp]        = useState('');
  const [resetToken, setResetToken] = useState('');
  const [password,   setPassword]   = useState('');
  const [confirm,    setConfirm]    = useState('');
  const [showPw,     setShowPw]     = useState(false);
  const [loading,    setLoading]    = useState(false);

  const isEmail = identifier.includes('@');

  // ── Step 1: request OTP ───────────────────────────────────────────────────
  const onRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) return;
    setLoading(true);
    try {
      await authApi.forgotPassword(isEmail ? { email: identifier } : { phone: identifier });
      toast.success('OTP sent!');
      setStep('verify');
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: verify OTP → get reset token ─────────────────────────────────
  const onVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim()) return;
    setLoading(true);
    try {
      const token = await authApi.verifyOtp({
        ...(isEmail ? { email: identifier } : { phone: identifier }),
        otp,
        purpose: 'PASSWORD_RESET',
      });
      if (!token) throw new Error('No reset token returned');
      setResetToken(token);
      setStep('reset');
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Invalid or expired OTP');
    } finally {
      setLoading(false);
    }
  };

  // ── Step 3: set new password ──────────────────────────────────────────────
  const onReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    if (password !== confirm) { toast.error('Passwords do not match'); return; }
    setLoading(true);
    try {
      await authApi.resetPassword({ resetToken, newPassword: password, confirmPassword: confirm });
      toast.success('Password reset! Please log in.');
      setStep('done');
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Reset failed. Please start over.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-[400px]">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Reset password</h1>
          <p className="text-gray-500 mt-1">
            {step === 'request' && 'Enter your email or phone to receive an OTP'}
            {step === 'verify'  && `Enter the 6-digit code sent to ${identifier}`}
            {step === 'reset'   && 'Set your new password'}
            {step === 'done'    && 'Password updated'}
          </p>
        </div>

        {/* ── Step indicator ─────────────────────────────────────────────── */}
        {step !== 'done' && (
          <div className="flex gap-2 mb-6">
            {(['request', 'verify', 'reset'] as Step[]).map((s, i) => (
              <div
                key={s}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  ['request', 'verify', 'reset'].indexOf(step) >= i
                    ? 'bg-primary-500'
                    : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
        )}

        {/* ── Step 1: request ───────────────────────────────────────────── */}
        {step === 'request' && (
          <form onSubmit={onRequest} className="card p-8 space-y-5">
            <div>
              <label className="label">Email or phone number</label>
              <input
                type="text"
                value={identifier}
                onChange={e => setIdentifier(e.target.value)}
                placeholder="you@example.com or +60123456789"
                className="input"
                required
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-3">
              {loading ? <><Loader2 size={18} className="animate-spin inline mr-1" />Sending…</> : 'Send OTP'}
            </button>
          </form>
        )}

        {/* ── Step 2: verify OTP ────────────────────────────────────────── */}
        {step === 'verify' && (
          <form onSubmit={onVerify} className="card p-8 space-y-5">
            <div>
              <label className="label">6-digit OTP</label>
              <input
                type="text"
                inputMode="numeric"
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
                className="input text-center tracking-widest text-xl"
                maxLength={6}
                required
              />
            </div>
            <button type="submit" disabled={loading || otp.length < 6} className="btn-primary w-full py-3">
              {loading ? <><Loader2 size={18} className="animate-spin inline mr-1" />Verifying…</> : 'Verify OTP'}
            </button>
            <button
              type="button"
              onClick={() => { setStep('request'); setOtp(''); }}
              className="w-full text-sm text-gray-500 hover:text-gray-700"
            >
              Resend OTP
            </button>
          </form>
        )}

        {/* ── Step 3: new password ──────────────────────────────────────── */}
        {step === 'reset' && (
          <form onSubmit={onReset} className="card p-8 space-y-5">
            <div>
              <label className="label">New password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  className="input pr-10"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div>
              <label className="label">Confirm password</label>
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Repeat your password"
                className="input"
                required
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-3">
              {loading ? <><Loader2 size={18} className="animate-spin inline mr-1" />Resetting…</> : 'Reset password'}
            </button>
          </form>
        )}

        {/* ── Done ─────────────────────────────────────────────────────── */}
        {step === 'done' && (
          <div className="card p-8 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto text-3xl">✓</div>
            <p className="text-gray-700 font-medium">Your password has been reset.</p>
            <Link href="/login" className="btn-primary w-full block text-center">Log in</Link>
          </div>
        )}

        <Link href="/login" className="mt-6 flex items-center justify-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft size={16} /> Back to login
        </Link>
      </div>
    </div>
  );
}