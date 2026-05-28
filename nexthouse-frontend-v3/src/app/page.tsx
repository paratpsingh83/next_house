'use client';
// src/app/page.tsx — redirect to feed or login
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector } from '@/store';

export default function RootPage() {
  const router = useRouter();
  const { isAuth, loading } = useAppSelector(s => s.auth);

  useEffect(() => {
    if (!loading) router.replace(isAuth ? '/feed' : '/login');
  }, [isAuth, loading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-primary-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-16 h-16 rounded-2xl bg-primary-500 flex items-center justify-center">
          <span className="text-white text-2xl font-bold">N</span>
        </div>
        <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  );
}
