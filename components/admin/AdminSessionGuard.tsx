'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

// 어드민 세션 만료 조기 감지.
// 주기적(3분) + 창 포커스 시 /api/admin/me 를 확인해, 만료(401)면 로그인 화면으로 이동한다.
// 유효 세션이면 이 호출이 토큰 갱신을 겸해 유휴 만료도 방지한다.
const CHECK_INTERVAL_MS = 3 * 60 * 1000; // 3분

export function AdminSessionGuard() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname === '/admin/login') return;

    let stopped = false;
    const check = async () => {
      try {
        const res = await fetch('/api/admin/me', { cache: 'no-store' });
        if (!stopped && res.status === 401 && window.location.pathname !== '/admin/login') {
          window.location.href = '/admin/login';
        }
      } catch {
        /* 네트워크 오류는 무시 (일시적 오류로 로그아웃시키지 않음) */
      }
    };

    const id = setInterval(check, CHECK_INTERVAL_MS);
    const onFocus = () => check();
    window.addEventListener('focus', onFocus);

    return () => {
      stopped = true;
      clearInterval(id);
      window.removeEventListener('focus', onFocus);
    };
  }, [pathname]);

  return null;
}
