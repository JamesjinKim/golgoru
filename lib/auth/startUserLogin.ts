'use client';

import { userSupabaseBrowser } from '@/lib/auth/supabaseBrowser';
import { clearBrowserSupabaseAuthCookies } from './cookies';

export async function startUserLogin() {
  clearBrowserSupabaseAuthCookies();
  const supabase = userSupabaseBrowser();
  const returnTo = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  const redirectTo = `${window.location.origin}/auth/callback?returnTo=${encodeURIComponent(returnTo)}`;
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo },
  });

  if (error) {
    throw error;
  }
}
