import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAdmin } from '@/lib/admin/auth';

// 로그인 상태·필터에 따라 달라지므로 매 요청 실행(프리렌더 캐시 방지)
export const dynamic = 'force-dynamic';

// experts 조인으로 전문가명 포함(전문가 삭제 시 expert_id=null → 조인 결과 없음 → '(삭제됨)' 처리)
const SELECT = 'id,user_id,expert_id,vertical,source,created_at,experts(name)';

export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if ('response' in guard) return guard.response;

  const vertical = req.nextUrl.searchParams.get('vertical')?.trim();

  let query = supabaseAdmin
    .from('call_logs')
    .select(SELECT)
    .order('created_at', { ascending: false })
    .limit(500);
  if (vertical) query = query.eq('vertical', vertical);

  const { data, error } = await query;
  if (error) {
    console.error('[admin/call-logs] list error:', error);
    return NextResponse.json({ error: '목록 조회 실패' }, { status: 500 });
  }

  // 조인 결과 평탄화: experts.name → expert_name
  const logs: Record<string, unknown>[] = (data ?? []).map((r: Record<string, unknown>) => {
    const ex = r.experts as { name?: string } | null | undefined;
    const { experts, ...rest } = r;
    void experts;
    return { ...rest, expert_name: ex?.name ?? null };
  });

  // 집계: 직역별 + 전문가별(홍보 지표 — 많이 연결된 전문가)
  const byVertical: Record<string, number> = {};
  const byExpert: Record<string, number> = {};
  for (const l of logs) {
    if (l.vertical) byVertical[l.vertical as string] = (byVertical[l.vertical as string] ?? 0) + 1;
    const name = (l.expert_name as string) ?? '(삭제됨)';
    byExpert[name] = (byExpert[name] ?? 0) + 1;
  }

  return NextResponse.json({ logs, total: logs.length, byVertical, byExpert });
}
