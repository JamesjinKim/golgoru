import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '골고루 SOS — 긴급 전문가 연결',
  description: '긴급 상황에서 30초 안에 전문가를 연결합니다.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: '골고루 SOS',
  },
};

export const viewport: Viewport = {
  themeColor: '#006241',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body style={{
        background: 'var(--color-neutral-warm)',
        minHeight: '100vh',
        margin: 0,
      }}>
        <div style={{
          width: '100%',
          maxWidth: 430,
          margin: '0 auto',
          minHeight: '100vh',
          background: 'var(--color-neutral-warm)',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {children}
        </div>
      </body>
    </html>
  );
}
