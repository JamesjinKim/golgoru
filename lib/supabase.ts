import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? 'placeholder';
const supabaseServiceKey = process.env.SUPABASE_SECRET_KEY ?? 'placeholder';

// 클라이언트 사이드용 (공개 데이터 조회)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 서버 사이드용 (어드민 CRUD — service role key)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
