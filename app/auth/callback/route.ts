import { NextRequest, NextResponse } from 'next/server';
import { getUserServerSupabase } from '@/lib/auth/supabaseServer';
import { resolveAuthReturnTo } from '@/lib/auth/profile';
import { upsertUserProfileFromAuthUser } from '@/lib/auth/user';

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

  return successResponse;
}
