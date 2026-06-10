import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAdmin } from '@/lib/admin/auth';
import { logAudit } from '@/lib/admin/audit';

// PATCH: 라벨 수정 / 활성 토글
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ code: string }> }) {
  const guard = await requireAdmin();
  if ('response' in guard) return guard.response;
  const { code } = await ctx.params;
  const b = await req.json().catch(() => ({}));

  const patch: { label?: string; is_active?: boolean } = {};
  if (typeof b.label === 'string' && b.label.trim()) patch.label = b.label.trim();
  if (typeof b.is_active === 'boolean') patch.is_active = b.is_active;
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: '변경할 값이 없습니다.' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('categories').update(patch).eq('code', code).select().single();
  if (error) return NextResponse.json({ error: '수정 실패' }, { status: 500 });
  if (!data) return NextResponse.json({ error: '대상 없음' }, { status: 404 });

  await logAudit({
    actorId: guard.identity.userId, actorEmail: guard.identity.email,
    action: 'category.update', targetTable: 'categories', targetId: code, detail: patch,
  });
  return NextResponse.json(data);
}
