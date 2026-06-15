import type { Metadata } from 'next';
import '@/styles/admin.css';
import { AdminNav } from '@/components/admin/AdminNav';
import { getAdminIdentity } from '@/lib/admin/auth';

export const metadata: Metadata = {
  title: '골고루 SOS 어드민',
  robots: { index: false, follow: false },
};

// 어드민 독립 root 레이아웃 (소비자 app/(site) 와 분리 — 멀티 root).
// PC 모니터 기준 넓은 레이아웃 + 반응형.
export default async function AdminRootLayout({ children }: { children: React.ReactNode }) {
  const identity = await getAdminIdentity(); // 로그인 페이지에선 null

  return (
    <html lang="ko">
      <body className="admin-root min-h-screen">
        <AdminNav email={identity?.email} role={identity?.role} />
        <main className="mx-auto w-full max-w-screen-2xl px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
