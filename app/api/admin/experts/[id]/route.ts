import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAdmin } from '@/lib/admin/auth';
import { logAudit } from '@/lib/admin/audit';

const SELECT = 'id,name,vertical,specialties,region,phone,experience_years,bio,youtube_url,status,weekday_start,weekday_end,weekend_available,night_available,is_active,created_at';

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if ('response' in guard) return guard.response;
  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: '잘못된 요청' }, { status: 400 });

  const patch = (({ name, vertical, specialties, region, phone, experience_years, bio, youtube_url, status, weekday_start, weekday_end, weekend_available, night_available, is_active }) =>
    ({ name, vertical, specialties, region, phone, experience_years, bio, youtube_url, status, weekday_start, weekday_end, weekend_available, night_available, is_active }))(body);

  const { data, error } = await supabaseAdmin
    .from('experts').update(patch).eq('id', id).select(SELECT).single();
  if (error) return NextResponse.json({ error: '수정 실패' }, { status: 500 });
  if (!data) return NextResponse.json({ error: '대상 없음' }, { status: 404 });

  // 카테고리 동기화 (body.category_codes 가 배열일 때만 — 전부 교체)
  if (Array.isArray(body.category_codes)) {
    const codes = [...new Set(
      (body.category_codes as unknown[]).filter((c): c is string => typeof c === 'string' && c.length > 0),
    )];
    await supabaseAdmin.from('expert_categories').delete().eq('expert_id', id);
    if (codes.length) {
      await supabaseAdmin.from('expert_categories')
        .insert(codes.map((category_code) => ({ expert_id: id, category_code })));
    }
  }

  await logAudit({
    actorId: guard.identity.userId, actorEmail: guard.identity.email,
    action: 'expert.update', targetTable: 'experts', targetId: id,
    detail: { ...patch, category_codes: body.category_codes ?? undefined },
  });
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if ('response' in guard) return guard.response;
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const is_active = Boolean(body?.is_active);

  const { data, error } = await supabaseAdmin
    .from('experts').update({ is_active }).eq('id', id).select(SELECT).single();
  if (error) return NextResponse.json({ error: '상태 변경 실패' }, { status: 500 });
  if (!data) return NextResponse.json({ error: '대상 없음' }, { status: 404 });

  await logAudit({
    actorId: guard.identity.userId, actorEmail: guard.identity.email,
    action: 'expert.deactivate', targetTable: 'experts', targetId: id, detail: { is_active },
  });
  return NextResponse.json(data);
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin('super_admin'); // 삭제는 super_admin 전용
  if ('response' in guard) return guard.response;
  const { id } = await ctx.params;

  const { error } = await supabaseAdmin.from('experts').delete().eq('id', id);
  if (error) return NextResponse.json({ error: '삭제 실패' }, { status: 500 });

  await logAudit({
    actorId: guard.identity.userId, actorEmail: guard.identity.email,
    action: 'expert.delete', targetTable: 'experts', targetId: id,
  });
  return NextResponse.json({ ok: true });
}
