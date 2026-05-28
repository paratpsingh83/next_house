'use client';
// src/app/layout.tsx
import React from 'react';
import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { store } from '@/store';
import AuthProvider from '@/components/auth/AuthProvider';
import WSProvider from '@/components/common/WSProvider';
import './globals.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 5 * 60 * 1000, retry: 1, refetchOnWindowFocus: false },
  },
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#10b981" />
        <title>NexHouse — Hyperlocal Community</title>
        <meta name="description" content="Connect with your neighbourhood on NexHouse" />
      </head>
      <body>
        <Provider store={store}>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <WSProvider>
                {children}
                <Toaster
                  position="top-center"
                  toastOptions={{
                    duration: 4000,
                    style: { borderRadius: '12px', fontSize: '14px' },
                    success: { style: { background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0' } },
                    error:   { style: { background: '#fef2f2', color: '#991b1b', border: '1px solid #fca5a5' } },
                  }}
                />
              </WSProvider>
            </AuthProvider>
          </QueryClientProvider>
        </Provider>
      </body>
    </html>
  );
}
