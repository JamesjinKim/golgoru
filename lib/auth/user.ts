import type { User } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabase';
import { hasSupabasePublicConfig } from '@/lib/env';
import { cookies } from 'next/headers';
import { getUserServerSupabase } from './supabaseServer';
import { getSupabaseAuthCookieName, isInvalidRefreshTokenError } from './cookies';
import { mapAuthUserToProfileRow, type UserProfile } from './profile';

export interface CurrentUserProfile {
  user: User | null;
  profile: UserProfile | null;
}

export async function upsertUserProfileFromAuthUser(user: User): Promise<UserProfile> {
  const profile = mapAuthUserToProfileRow(user);

  const { data: existing, error: selectError } = await supabaseAdmin
    .from('profiles')
    .select('id,role')
    .eq('id', user.id)
    .maybeSingle();

  if (selectError) {
    throw selectError;
  }

  if (existing) {
    const { error } = await supabaseAdmin
      .from('profiles')
      .update({
        display_name: profile.display_name,
        email: profile.email,
        avatar_url: profile.avatar_url,
      })
      .eq('id', user.id);

    if (error) throw error;
    return { ...profile, role: existing.role as UserProfile['role'] };
  }

  const { error } = await supabaseAdmin.from('profiles').insert(profile);
  if (error) throw error;
  return profile;
}

// 세션 쿠키가 하나도 없으면 비로그인이 확정이므로 auth 서버 왕복을 건너뛴다.
// 값이 빈 쿠키와 code-verifier(로그인 진행용)는 세션으로 치지 않는다.
async function hasAuthSessionCookie(): Promise<boolean> {
  const base = getSupabaseAuthCookieName();
  const store = await cookies();
  return store.getAll().some(
    ({ name, value }) =>
      Boolean(value) &&
      (name === base || name.startsWith(`${base}.`)) &&
      !name.endsWith('-code-verifier'),
  );
}

export async function getCurrentUserProfile(): Promise<CurrentUserProfile> {
  if (!hasSupabasePublicConfig()) {
    return { user: null, profile: null };
  }

  // 비로그인 요청에서 Supabase auth 왕복(~200ms)을 피한다.
  // 쿠키가 있으면 위조 가능성이 있으므로 종전대로 서버에서 검증한다.
  if (!(await hasAuthSessionCookie())) {
    return { user: null, profile: null };
  }

  const supabase = await getUserServerSupabase();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError) {
    if (!isInvalidRefreshTokenError(userError)) {
      console.error('[auth] user lookup error:', userError);
    }
    return { user: null, profile: null };
  }

  if (!user) {
    return { user: null, profile: null };
  }

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id,role,display_name,email,avatar_url,terms_agreed_at,privacy_agreed_at,thirdparty_agreed_at,marketing_agreed_at,full_name,phone,gender,region')
    .eq('id', user.id)
    .maybeSingle();

  if (error) {
    console.error('[auth] profile lookup error:', error);
    return { user, profile: mapAuthUserToProfileRow(user) };
  }

  return { user, profile: (data as UserProfile | null) ?? mapAuthUserToProfileRow(user) };
}
