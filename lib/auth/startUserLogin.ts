'use client';

import { userSupabaseBrowser } from '@/lib/auth/supabaseBrowser';

export async function startUserLogin() {
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
