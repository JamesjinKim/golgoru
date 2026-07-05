import { NextRequest, NextResponse } from 'next/server';
import { getUserServerSupabase } from '@/lib/auth/supabaseServer';
import { resolveAuthReturnTo } from '@/lib/auth/profile';
import { upsertUserProfileFromAuthUser } from '@/lib/auth/user';
import { hasRequiredConsent } from '@/lib/auth/consent';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const returnTo = resolveAuthReturnTo(url.origin, url.searchParams.get('returnTo'));

  if (!code) {
    return NextResponse.redirect(new URL('/', url.origin));
  }

  const successResponse = NextResponse.redirect(new URL(returnTo, url.origin));
  const supabase = await getUserServerSupabase(successResponse);
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    const failUrl = new URL('/', url.origin);
    failUrl.searchParams.set('auth', 'error');
    return NextResponse.redirect(failUrl);
  }

  try {
    await upsertUserProfileFromAuthUser(data.user);
  } catch (profileError) {
    console.error('[auth] profile upsert error:', profileError);
    const failUrl = new URL('/', url.origin);
    failUrl.searchParams.set('auth', 'profile');
    return NextResponse.redirect(failUrl);
  }

  const { data: consentRow } = await supabaseAdmin
    .from('profiles')
    .select('terms_agreed_at,privacy_agreed_at,thirdparty_agreed_at,marketing_agreed_at')
    .eq('id', data.user.id)
    .maybeSingle();

  // 필수 동의 미완료(신규 가입자) → 동의 게이트로. 세션 쿠키는 successResponse에 이미 실려 있으므로
  // 그 헤더를 유지한 채 Location만 /consent로 바꾼다. (동의 완료 후 ConsentForm이 홈으로 보낼 때 환영 토스트)
  if (!hasRequiredConsent(consentRow)) {
    const consentUrl = new URL('/consent', url.origin);
    consentUrl.searchParams.set('returnTo', returnTo);
    successResponse.headers.set('Location', consentUrl.toString());
    return successResponse;
  }

  // 동의 완료자(재로그인) → 홈으로 복귀할 때 환영 토스트. 홈(/)이 목적지일 때만 welcome 부여.
  if (returnTo === '/') {
    const homeUrl = new URL('/', url.origin);
    homeUrl.searchParams.set('welcome', '1');
    successResponse.headers.set('Location', homeUrl.toString());
  }

  return successResponse;
}
