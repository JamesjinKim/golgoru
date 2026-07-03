import type { User } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabase';
import { hasSupabasePublicConfig } from '@/lib/env';
import { getUserServerSupabase } from './supabaseServer';
import { isInvalidRefreshTokenError } from './cookies';
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

export async function getCurrentUserProfile(): Promise<CurrentUserProfile> {
  if (!hasSupabasePublicConfig()) {
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
    .select('id,role,display_name,email,avatar_url,terms_agreed_at,privacy_agreed_at,thirdparty_agreed_at,marketing_agreed_at')
    .eq('id', user.id)
    .maybeSingle();

  if (error) {
    console.error('[auth] profile lookup error:', error);
    return { user, profile: mapAuthUserToProfileRow(user) };
  }

  return { user, profile: (data as UserProfile | null) ?? mapAuthUserToProfileRow(user) };
}
