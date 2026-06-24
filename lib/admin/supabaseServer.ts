import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getSupabasePublishableKey, getSupabaseUrl } from '@/lib/env';

// Route Handler / Server Component 에서 세션 쿠키 기반 Supabase 클라이언트
export async function getServerSupabase() {
  const store = await cookies();
  return createServerClient(getSupabaseUrl(), getSupabasePublishableKey(), {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (toSet) => {
        try {
          toSet.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          /* Server Component 컨텍스트에서는 set 불가 — 무시 */
        }
      },
    },
  });
}
