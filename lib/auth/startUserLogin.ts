'use client';

import { userSupabaseBrowser } from '@/lib/auth/supabaseBrowser';
import { clearBrowserSupabaseAuthCookies } from './cookies';

export type OAuthProvider = 'google' | 'kakao';

export async function startUserLogin(provider: OAuthProvider = 'google', returnTo?: string) {
  clearBrowserSupabaseAuthCookies();
  const supabase = userSupabaseBrowser();
  // returnTo 미지정 시 현재 페이지로 복귀(홈·전문가 등). 로그인 전용 페이지(/login,/signup)에서는
  // 그 페이지로 되돌아오면 안 되므로 호출부가 명시적으로 '/'를 넘긴다.
  const backTo = returnTo ?? `${window.location.pathname}${window.location.search}${window.location.hash}`;
  const redirectTo = `${window.location.origin}/auth/callback?returnTo=${encodeURIComponent(backTo)}`;
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo },
  });

  if (error) {
    throw error;
  }
}
