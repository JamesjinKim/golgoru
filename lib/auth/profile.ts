import type { ConsentTimestamps } from './consent';

export type UserProfileRole = 'user' | 'expert' | 'admin';

export interface UserProfile extends ConsentTimestamps {
  id: string;
  role: UserProfileRole;
  display_name: string | null;
  email: string | null;
  avatar_url: string | null;
}

interface AuthUserLike {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
}

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

export function mapAuthUserToProfileRow(user: AuthUserLike): UserProfile {
  const metadata = user.user_metadata ?? {};
  const displayName =
    stringOrNull(metadata.full_name) ??
    stringOrNull(metadata.name) ??
    stringOrNull(metadata.display_name);

  return {
    id: user.id,
    role: 'user',
    display_name: displayName,
    email: stringOrNull(user.email),
    avatar_url: stringOrNull(metadata.avatar_url) ?? stringOrNull(metadata.picture),
    terms_agreed_at: null,
    privacy_agreed_at: null,
    thirdparty_agreed_at: null,
    marketing_agreed_at: null,
  };
}

export function resolveAuthReturnTo(origin: string, rawReturnTo: string | null): string {
  if (!rawReturnTo) return '/';

  try {
    const url = new URL(rawReturnTo, origin);
    if (url.origin !== origin) return '/';
    return `${url.pathname}${url.search}${url.hash}` || '/';
  } catch {
    return '/';
  }
}

export function formatUserLabel(profile: Pick<UserProfile, 'display_name' | 'email'> | null): string {
  if (profile?.display_name) return profile.display_name;
  if (profile?.email) return profile.email.split('@')[0] || '계정';
  return '계정';
}
