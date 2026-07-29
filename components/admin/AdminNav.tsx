'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const LINKS = [
  { href: '/admin', label: '전문가' },
  { href: '/admin/applications', label: '입점신청' },
  { href: '/admin/users', label: '사용자' },
  { href: '/admin/requests', label: '상담분석' },
  { href: '/admin/categories', label: '카테고리' },
  { href: '/admin/import', label: 'CSV 일괄등록' },
  { href: '/admin/audit', label: '감사·접속' },
];

export function AdminNav({ email, role }: { email?: string; role?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  if (pathname === '/admin/login') return null;

  const logout = async () => {
    await fetch('/api/admin/auth/logout', { method: 'POST' });
    router.push('/admin/login');
    router.refresh();
  };

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-screen-2xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 sm:px-6 lg:px-10">
        <span className="text-base font-bold text-slate-900">골고루 SOS 어드민</span>
        <nav className="flex flex-wrap gap-1">
          {LINKS.map((l) => {
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-md px-3 py-1.5 text-sm ${
                  active ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          {email && (
            <span className="flex items-center gap-2 text-sm text-slate-600">
              <span className="font-medium text-slate-900">{email}</span>
              {role && (
                <span className={`rounded px-1.5 py-0.5 text-xs font-semibold ${
                  role === 'super_admin'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-slate-100 text-slate-600'
                }`}>
                  {role}
                </span>
              )}
            </span>
          )}
          <button
            onClick={logout}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
          >
            로그아웃
          </button>
        </div>
      </div>
    </header>
  );
}
