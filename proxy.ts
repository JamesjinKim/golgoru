import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { getSupabasePublishableKey, getSupabaseUrl } from '@/lib/env';
import { getSupabaseAuthCookieName, isInvalidRefreshTokenError } from '@/lib/auth/cookies';
import {
  applySupabaseAuthCookieExpiryToResponse,
  applySupabaseSetAllToResponse,
  getSupabaseAuthCookieNamesFromNames,
} from '@/lib/auth/response';

// Supabase SSR 세션 쿠키 동기화 + 어드민 인증 경계 (Next 16: proxy 규칙).
export async function proxy(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createServerClient(getSupabaseUrl(), getSupabasePublishableKey(), {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (toSet, headers) => {
        toSet.forEach(({ name, value, options }) => {
          req.cookies.set({ name, value, ...options });
        });
        applySupabaseSetAllToResponse(res, toSet, headers);
      },
    },
  });

  const { data: { user }, error } = await supabase.auth.getUser();
  const path = req.nextUrl.pathname;
  const isLoginPage = path === '/admin/login';
  const isAuthApi = path.startsWith('/api/admin/auth');
  const isAdminPage = path.startsWith('/admin');
  const isAdminApi = path.startsWith('/api/admin');

  if (isInvalidRefreshTokenError(error)) {
    applySupabaseAuthCookieExpiryToResponse(
      res,
      getSupabaseAuthCookieNamesFromNames(
        getSupabaseAuthCookieName(),
        req.cookies.getAll().map((cookie) => cookie.name),
      ),
    );
  }

  if (!user && !isLoginPage && !isAuthApi && (isAdminPage || isAdminApi)) {
    if (isAdminApi) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = '/admin/login';
    return NextResponse.redirect(url);
  }

  // 로그인 상태로 로그인페이지 접근 → 대시보드
  if (user && isLoginPage) {
    const url = req.nextUrl.clone();
    url.pathname = '/admin';
    return NextResponse.redirect(url);
  }

  return res;
}

export const config = {
  matcher: ['/', '/admin/:path*', '/api/admin/:path*'],
};
