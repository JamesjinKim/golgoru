import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { getSupabasePublishableKey, getSupabaseUrl } from '@/lib/env';
import { getSupabaseAuthCookieName, isInvalidRefreshTokenError } from '@/lib/auth/cookies';
import {
  applySupabaseAuthCookieExpiryToResponse,
  applySupabaseSetAllToResponse,
  getSupabaseAuthCookieNamesFromNames,
} from '@/lib/auth/response';
import { hasRequiredConsent } from '@/lib/auth/consent';
import { hasCompleteProfile } from '@/lib/auth/profileFields';

// Supabase SSR 세션 쿠키 동기화 + 어드민 인증 경계 + 소비자 동의 게이트 (Next 16: proxy 규칙).
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

  // ── 어드민 인증 경계 (기존) ──────────────────────────────────
  if (isAdminPage || isAdminApi) {
    if (!user && !isLoginPage && !isAuthApi) {
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

  // ── 소비자 동의 게이트 (신규) ────────────────────────────────
  // 로그인 세션은 있으나 필수 동의·개인정보가 미완료면 서비스 이용을 막고 /consent 로 보낸다.
  // 동의/약관/로그인/가입/입점신청/공개 API 는 matcher 에서 제외되어 여기 도달하지 않는다.
  // (profiles 는 self-select RLS 로 본인 행 조회 가능)
  if (user) {
    const { data: profileRow, error: profileError } = await supabase
      .from('profiles')
      .select('terms_agreed_at,privacy_agreed_at,thirdparty_agreed_at,full_name,phone,gender,region')
      .eq('id', user.id)
      .maybeSingle();

    // 조회 실패 시엔 게이트를 적용하지 않는다(fail-open) — 일시적 오류로 정상 사용자를 막지 않기 위함.
    if (!profileError && (!hasRequiredConsent(profileRow) || !hasCompleteProfile(profileRow))) {
      const url = req.nextUrl.clone();
      url.pathname = '/consent';
      url.search = '';
      url.searchParams.set('returnTo', path + req.nextUrl.search);
      const redirectRes = NextResponse.redirect(url);
      // getUser 과정에서 갱신됐을 수 있는 세션 쿠키를 리다이렉트 응답에도 유지
      res.cookies.getAll().forEach((c) => redirectRes.cookies.set(c));
      return redirectRes;
    }
  }

  return res;
}

export const config = {
  // 소비자 서비스 경로 + 어드민. 동의/약관/로그인/가입/입점신청/공개 API·정적 자산은 제외.
  matcher: [
    '/',
    '/experts/:path*',
    '/expert/:path*',
    '/result/:path*',
    '/admin/:path*',
    '/api/admin/:path*',
  ],
};
