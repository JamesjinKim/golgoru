import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAdmin } from '@/lib/admin/auth';

// 로그인 상태·검색어에 따라 매번 달라지므로 매 요청 실행(프리렌더 캐시 방지)
export const dynamic = 'force-dynamic';

const SELECT = 'id,user_id,query,input_type,vertical,category,category_code,urgency,created_at';

export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if ('response' in guard) return guard.response;

  const q = req.nextUrl.searchParams.get('q')?.trim();
  const vertical = req.nextUrl.searchParams.get('vertical')?.trim();

  let query = supabaseAdmin
    .from('recommendation_logs')
    .select(SELECT)
    .order('created_at', { ascending: false })
    .limit(500);
  if (q) query = query.ilike('query', `%${q}%`);
  if (vertical) query = query.eq('vertical', vertical);

  const { data, error } = await query;
  if (error) {
    console.error('[admin/recommendation-logs] list error:', error);
    return NextResponse.json({ error: '목록 조회 실패' }, { status: 500 });
  }

  const logs = data ?? [];
  // 직역별 집계(분석·홍보용 간단 통계)
  const byVertical: Record<string, number> = {};
  for (const l of logs) byVertical[l.vertical] = (byVertical[l.vertical] ?? 0) + 1;

  return NextResponse.json({ logs, total: logs.length, byVertical });
}
