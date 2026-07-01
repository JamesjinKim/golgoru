import type { CookieOptions } from '@supabase/ssr';

interface CookieWritableResponse {
  headers: Headers;
  cookies: {
    set: (name: string, value: string, options?: CookieOptions) => void;
  };
}

export function applySupabaseSetAllToResponse(
  response: CookieWritableResponse | undefined,
  cookiesToSet: { name: string; value: string; options: CookieOptions }[],
  headers: Record<string, string>,
) {
  if (!response) return;

  cookiesToSet.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options);
  });

  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
}

export function getSupabaseAuthCookieNamesFromNames(baseName: string, cookieNames: string[]) {
  return cookieNames.filter(
    (name) =>
      name === baseName ||
      name.startsWith(`${baseName}.`) ||
      name === `${baseName}-code-verifier`,
  );
}

export function applySupabaseAuthCookieExpiryToResponse(
  response: CookieWritableResponse,
  cookieNames: string[],
) {
  cookieNames.forEach((name) => {
    response.cookies.set(name, '', {
      path: '/',
      sameSite: 'lax',
      maxAge: 0,
    });
  });
}
