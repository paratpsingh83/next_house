// src/app/layout.tsx — server component (NO 'use client')
import type { Metadata } from 'next';
import Providers from '@/components/common/Providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'NexHouse — Hyperlocal Community',
  description: 'Connect with your neighbourhood on NexHouse',
  themeColor: '#10b981',
  viewport: 'width=device-width, initial-scale=1, viewport-fit=cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-sans">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
