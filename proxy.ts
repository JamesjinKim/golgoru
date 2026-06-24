import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { getSupabasePublishableKey, getSupabaseUrl } from '@/lib/env';

// 어드민 인증 경계 (Next 16: proxy 규칙). 소비자 라우트는 matcher 밖 → 무영향(§2.6).
export async function proxy(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createServerClient(getSupabaseUrl(), getSupabasePublishableKey(), {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (toSet) =>
        toSet.forEach(({ name, value, options }) => res.cookies.set(name, value, options)),
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  const path = req.nextUrl.pathname;
  const isLoginPage = path === '/admin/login';
  const isAuthApi = path.startsWith('/api/admin/auth');

  if (!user && !isLoginPage && !isAuthApi) {
    if (path.startsWith('/api/admin')) {
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
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
