import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAdmin } from '@/lib/admin/auth';
import { logAudit } from '@/lib/admin/audit';
import { adminVerticalRank } from '@/lib/constants';
import type { Vertical } from '@/lib/types';

const SELECT = 'id,name,vertical,license,specialties,region,phone,experience_years,bio,youtube_url,status,weekday_start,weekday_end,weekend_available,night_available,is_active,created_at,photo_url';
const LIST_SELECT = `${SELECT},expert_categories(category_code)`;

// 전문가 ↔ 카테고리 동기화 (기존 전부 삭제 후 재삽입). category_codes 가 배열일 때만.
async function syncCategories(expertId: string, codes: unknown) {
  if (!Array.isArray(codes)) return;
  const clean = [...new Set(codes.filter((c): c is string => typeof c === 'string' && c.length > 0))];
  await supabaseAdmin.from('expert_categories').delete().eq('expert_id', expertId);
  if (clean.length) {
    await supabaseAdmin.from('expert_categories')
      .insert(clean.map((category_code) => ({ expert_id: expertId, category_code })));
  }
}

export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if ('response' in guard) return guard.response;

  const q = req.nextUrl.searchParams.get('q')?.trim();
  let query = supabaseAdmin.from('experts').select(LIST_SELECT).order('created_at', { ascending: false });
  if (q) query = query.or(`name.ilike.%${q}%,region.ilike.%${q}%`);

  const { data, error } = await query;
  if (error) {
    console.error('[admin/experts] list error:', error);
    return NextResponse.json({ error: '목록 조회 실패' }, { status: 500 });
  }
  // 중첩된 expert_categories → category_codes 평탄화
  const experts: Record<string, unknown>[] = (data ?? []).map((e: Record<string, unknown>) => {
    const ec = (e.expert_categories as { category_code: string }[] | undefined) ?? [];
    const { expert_categories, ...rest } = e;
    void expert_categories;
    return { ...rest, category_codes: ec.map((x) => x.category_code) };
  });
  // 직역 그룹 순서(변호사→노무사→세무사→변리사→손해사정사→병원)로 정렬.
  // DB에서 created_at desc로 이미 정렬돼 있어, 안정 정렬이면 그룹 내 최신순이 유지된다.
  experts.sort(
    (a, b) =>
      adminVerticalRank(a.vertical as Vertical) - adminVerticalRank(b.vertical as Vertical),
  );
  return NextResponse.json({ experts, total: experts.length });
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if ('response' in guard) return guard.response;

  const body = await req.json().catch(() => null);
  if (!body?.name || !body?.vertical || !body?.region || !body?.phone) {
    return NextResponse.json({ error: 'name·vertical·region·phone 필수' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('experts')
    .insert({
      name: body.name,
      vertical: body.vertical,
      license: body.license ?? null,
      specialties: body.specialties ?? [],
      region: body.region,
      phone: body.phone,
      experience_years: body.experience_years ?? 0,
      bio: body.bio ?? null,
      youtube_url: body.youtube_url ?? null,
      status: body.status ?? 'available',
      weekday_start: body.weekday_start ?? null,
      weekday_end: body.weekday_end ?? null,
      weekend_available: body.weekend_available ?? false,
      night_available: body.night_available ?? false,
      is_active: body.is_active ?? true,
    })
    .select(SELECT)
    .single();

  if (error) {
    console.error('[admin/experts] create error:', error);
    return NextResponse.json({ error: '생성 실패' }, { status: 500 });
  }

  await syncCategories(data.id, body.category_codes);

  await logAudit({
    actorId: guard.identity.userId, actorEmail: guard.identity.email,
    action: 'expert.create', targetTable: 'experts', targetId: data.id,
    detail: { name: data.name, vertical: data.vertical, categories: body.category_codes ?? [] },
  });
  return NextResponse.json(data, { status: 201 });
}
