'use client';

import { userSupabaseBrowser } from '@/lib/auth/supabaseBrowser';
import { clearBrowserSupabaseAuthCookies } from './cookies';

export type OAuthProvider = 'google' | 'kakao';

export async function startUserLogin(provider: OAuthProvider = 'google') {
  clearBrowserSupabaseAuthCookies();
  const supabase = userSupabaseBrowser();
  const returnTo = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  const redirectTo = `${window.location.origin}/auth/callback?returnTo=${encodeURIComponent(returnTo)}`;
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo },
  });

  if (error) {
    throw error;
  }
}
