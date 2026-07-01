import { NextRequest, NextResponse } from 'next/server';
import { getUserServerSupabase } from '@/lib/auth/supabaseServer';
import { getSupabaseAuthCookieName } from '@/lib/auth/cookies';
import {
  applySupabaseAuthCookieExpiryToResponse,
  getSupabaseAuthCookieNamesFromNames,
} from '@/lib/auth/response';

export async function POST(req: NextRequest) {
  const response = NextResponse.json({ ok: true });
  const supabase = await getUserServerSupabase(response);
  await supabase.auth.signOut();

  const cookieNames = getSupabaseAuthCookieNamesFromNames(
    getSupabaseAuthCookieName(),
    req.cookies.getAll().map((cookie) => cookie.name),
  );

  applySupabaseAuthCookieExpiryToResponse(response, cookieNames);
  return response;
}
