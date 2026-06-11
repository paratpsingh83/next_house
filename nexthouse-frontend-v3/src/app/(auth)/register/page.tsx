'use client';
// src/app/(auth)/register/page.tsx
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { useAppDispatch } from '@/store';
import { setCredentials } from '@/store/slices/authSlice';
import { authApi } from '@/api';
import { tokens } from '@/lib/apiClient';
import toast from 'react-hot-toast';

const schema = z.object({
  name:        z.string().min(2, 'At least 2 characters'),
  username:    z.string().min(3, 'At least 3 characters').max(50)
                .regex(/^[a-zA-Z0-9_]+$/, 'Letters, numbers, underscore only'),
  phoneNumber: z.string().min(8, 'Valid phone number required'),
  email:       z.string().email('Valid email required').or(z.literal('')).optional(),
  password:    z.string().min(8, 'At least 8 characters'),
  confirm:     z.string(),
}).refine(d => d.password === d.confirm, { message: 'Passwords do not match', path: ['confirm'] });
type Form = z.infer<typeof schema>;

export default function RegisterPage() {
  const router   = useRouter();
  const dispatch = useAppDispatch();
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<Form>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: Form) => {
    setLoading(true);
    try {
      const res = await authApi.register({
        name:        data.name,
        username:    data.username,
        phoneNumber: data.phoneNumber,
        email:       data.email || undefined,
        password:    data.password,
        deviceType:  'WEB',
      });

      if (res.user && res.accessToken) {
        tokens.setWsToken(res.accessToken);  // sessionStorage — for WebSocket only
        dispatch(setCredentials({ user: res.user }));
        toast.success('Account created! Welcome to NextHouse 🎉');
        router.push('/feed');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const fields = [
    { name: 'name',        label: 'Full name',          type: 'text',     placeholder: 'John Doe',        auto: 'name' },
    { name: 'username',    label: 'Username',            type: 'text',     placeholder: 'john_doe',        auto: 'username' },
    { name: 'phoneNumber', label: 'Phone number',        type: 'tel',      placeholder: '+60123456789',    auto: 'tel' },
    { name: 'email',       label: 'Email (optional)',    type: 'email',    placeholder: 'john@email.com',  auto: 'email' },
    { name: 'password',    label: 'Password',            type: 'password', placeholder: '••••••••',        auto: 'new-password' },
    { name: 'confirm',     label: 'Confirm password',    type: 'password', placeholder: '••••••••',        auto: 'new-password' },
  ] as const;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-[400px]">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-500 shadow-lg mb-4">
            <span className="text-white text-2xl font-bold">N</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Join NextHouse</h1>
          <p className="text-gray-500 mt-1">Connect with your neighbourhood</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="card p-8 space-y-4">
          {fields.map(f => (
            <div key={f.name}>
              <label className="label">{f.label}</label>
              <input
                {...register(f.name)}
                type={f.type}
                placeholder={f.placeholder}
                autoComplete={f.auto}
                className={`input ${errors[f.name] ? 'input-error' : ''}`}
              />
              {errors[f.name] && <p className="mt-1.5 text-xs text-red-500">{errors[f.name]!.message}</p>}
            </div>
          ))}

          <button type="submit" disabled={loading} className="btn-primary w-full py-3 mt-2">
            {loading ? <><Loader2 size={18} className="animate-spin" /> Creating account…</> : 'Create account'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-primary-600 font-semibold hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
