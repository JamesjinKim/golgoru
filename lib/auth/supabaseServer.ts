import { createServerClient } from '@supabase/ssr';
import type { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSupabasePublishableKey, getSupabaseUrl } from '@/lib/env';
import { applySupabaseSetAllToResponse } from './response';

export async function getUserServerSupabase(response?: NextResponse) {
  const store = await cookies();
  return createServerClient(getSupabaseUrl(), getSupabasePublishableKey(), {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (toSet, headers) => {
        try {
          toSet.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          /* Server Component 컨텍스트에서는 set 불가 */
        }
        applySupabaseSetAllToResponse(response, toSet, headers);
      },
    },
  });
}
