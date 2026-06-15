import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAdmin } from '@/lib/admin/auth';

export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if ('response' in guard) return guard.response;

  const limit = Math.min(Number(req.nextUrl.searchParams.get('limit') ?? 100), 500);
  const { data, error } = await supabaseAdmin
    .from('audit_log')
    .select('id,actor_email,action,target_table,target_id,detail,created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) return NextResponse.json({ error: '조회 실패' }, { status: 500 });
  return NextResponse.json({ logs: data ?? [] });
}
