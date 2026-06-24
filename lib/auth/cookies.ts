import { getSupabaseUrl } from '@/lib/env';

export function getSupabaseAuthCookieName() {
  const host = new URL(getSupabaseUrl()).hostname;
  const projectRef = host.split('.')[0];
  return `sb-${projectRef}-auth-token`;
}

export function isInvalidRefreshTokenError(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 'refresh_token_not_found'
  );
}

export function clearBrowserSupabaseAuthCookies() {
  if (typeof document === 'undefined') return;

  const baseName = getSupabaseAuthCookieName();
  const names = new Set(
    document.cookie
      .split(';')
      .map((part) => part.trim().split('=')[0])
      .filter((name) => name === baseName || name.startsWith(`${baseName}.`)),
  );

  names.add(`${baseName}-code-verifier`);

  for (const name of names) {
    document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax`;
  }
}
