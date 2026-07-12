import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAdmin } from '@/lib/admin/auth';
import { logAudit } from '@/lib/admin/audit';
import type { ExpertApplicationStatus } from '@/lib/admin/types';

const SELECT = 'id,name,phone,vertical,message,status,created_at';
const STATUSES: ExpertApplicationStatus[] = ['new', 'contacted', 'done'];

// 입점신청 처리 상태 변경 (어드민). body.status ∈ new|contacted|done
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if ('response' in guard) return guard.response;
  const { id } = await ctx.params;

  const body = await req.json().catch(() => ({}));
  const status = typeof body?.status === 'string' ? body.status.trim() : '';
  if (!STATUSES.includes(status as ExpertApplicationStatus)) {
    return NextResponse.json({ error: '상태 값이 올바르지 않습니다.' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('expert_applications')
    .update({ status })
    .eq('id', id)
    .select(SELECT)
    .single();

  if (error) {
    console.error('[admin/expert-applications] update error:', error);
    return NextResponse.json({ error: '상태 변경 실패' }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: '대상 없음' }, { status: 404 });

  await logAudit({
    actorId: guard.identity.userId,
    actorEmail: guard.identity.email,
    action: 'application.update',
    targetTable: 'expert_applications',
    targetId: id,
    detail: { status },
  });

  return NextResponse.json(data);
}
