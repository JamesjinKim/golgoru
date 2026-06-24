import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getSupabasePublishableKey, getSupabaseSecretKey, getSupabaseUrl } from '@/lib/env';

type AnySupabaseClient = SupabaseClient<any, any, any>;

function createLazyClient(getKey: () => string): AnySupabaseClient {
  let client: AnySupabaseClient | null = null;
  return new Proxy({} as AnySupabaseClient, {
    get(_target, prop, receiver) {
      client ??= createClient<any>(getSupabaseUrl(), getKey());
      const value = Reflect.get(client, prop, receiver);
      return typeof value === 'function' ? value.bind(client) : value;
    },
  });
}

// 클라이언트 사이드용 (공개 데이터 조회)
export const supabase = createLazyClient(getSupabasePublishableKey);

// 서버 사이드용 (어드민 CRUD — service role key)
export const supabaseAdmin = createLazyClient(getSupabaseSecretKey);
