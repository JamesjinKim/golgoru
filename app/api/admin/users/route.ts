import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAdmin } from '@/lib/admin/auth';

const SELECT =
  'id,email,display_name,full_name,gender,phone,region,created_at,terms_agreed_at,privacy_agreed_at,thirdparty_agreed_at,marketing_agreed_at';

export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if ('response' in guard) return guard.response;

  const q = req.nextUrl.searchParams.get('q')?.trim();
  let query = supabaseAdmin.from('profiles').select(SELECT).order('created_at', { ascending: false });
  if (q) query = query.or(`email.ilike.%${q}%,full_name.ilike.%${q}%,display_name.ilike.%${q}%`);

  const { data, error } = await query;
  if (error) {
    console.error('[admin/users] list error:', error);
    return NextResponse.json({ error: '목록 조회 실패' }, { status: 500 });
  }
  return NextResponse.json({ users: data ?? [], total: (data ?? []).length });
}
