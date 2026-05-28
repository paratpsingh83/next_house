'use client';
// src/app/(auth)/forgot-password/page.tsx
import { useState } from 'react';
import Link from 'next/link';
import { Loader2, ArrowLeft } from 'lucide-react';
import { authApi } from '@/api';
import toast from 'react-hot-toast';

export default function ForgotPasswordPage() {
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const isEmail = value.includes('@');

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;
    setLoading(true);
    try {
      await authApi.forgotPassword(isEmail ? { email: value } : { phone: value });
      setSent(true);
      toast.success('OTP sent!');
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-[400px]">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Reset password</h1>
          <p className="text-gray-500 mt-1">Enter your email or phone to receive an OTP</p>
        </div>

        {sent ? (
          <div className="card p-8 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-primary-100 flex items-center justify-center mx-auto">
              <span className="text-3xl">📩</span>
            </div>
            <p className="text-gray-700 font-medium">OTP sent to <strong>{value}</strong></p>
            <p className="text-sm text-gray-500">Check your phone or email for the 6-digit code. Valid for 10 minutes.</p>
            <Link href="/login" className="btn-primary w-full">Back to login</Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="card p-8 space-y-5">
            <div>
              <label className="label">Email or phone number</label>
              <input
                type="text"
                value={value}
                onChange={e => setValue(e.target.value)}
                placeholder="you@example.com or +60123456789"
                className="input"
                required
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-3">
              {loading ? <><Loader2 size={18} className="animate-spin" /> Sending…</> : 'Send OTP'}
            </button>
          </form>
        )}

        <Link href="/login" className="mt-6 flex items-center justify-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft size={16} /> Back to login
        </Link>
      </div>
    </div>
  );
}
