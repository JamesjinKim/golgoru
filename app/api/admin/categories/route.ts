import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAdmin } from '@/lib/admin/auth';
import { logAudit } from '@/lib/admin/audit';

const VERTICALS = ['lawyer', 'doctor', 'labor', 'patent', 'tax', 'adjuster', 'appraiser'];

// GET: 카테고리 목록. ?all=1 → 비활성 포함(관리 화면용), 기본은 활성만(폼/임포트용)
export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if ('response' in guard) return guard.response;

  const all = req.nextUrl.searchParams.has('all');
  let query = supabaseAdmin
    .from('categories')
    .select('code,parent_code,vertical,level,label,is_active')
    .order('code', { ascending: true });
  if (!all) query = query.eq('is_active', true);

  const { data, error } = await query;
  if (error) {
    console.error('[admin/categories] list error:', error);
    return NextResponse.json({ error: '카테고리 조회 실패' }, { status: 500 });
  }
  return NextResponse.json({ categories: data ?? [] });
}

// POST: 카테고리 추가
export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if ('response' in guard) return guard.response;

  const b = await req.json().catch(() => null);
  const code = String(b?.code ?? '').trim().toUpperCase();
  const label = String(b?.label ?? '').trim();
  const vertical = String(b?.vertical ?? '');
  const level = Number(b?.level);
  if (!code || !label || !VERTICALS.includes(vertical) || (level !== 1 && level !== 2)) {
    return NextResponse.json({ error: 'code·label·vertical·level(1|2) 필수' }, { status: 400 });
  }
  if (!/^[A-Z]{3}-\d{2}(-\d{2})?$/.test(code)) {
    return NextResponse.json({ error: '코드 형식 오류 (예: LAW-01 또는 LAW-01-01)' }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from('categories').insert({
    code,
    parent_code: b?.parent_code ? String(b.parent_code).trim().toUpperCase() : null,
    vertical,
    level,
    label,
  });
  if (error) {
    const msg = error.code === '23505' ? '이미 존재하는 코드입니다.' : '추가 실패';
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  await logAudit({
    actorId: guard.identity.userId, actorEmail: guard.identity.email,
    action: 'category.create', targetTable: 'categories', targetId: code,
    detail: { vertical, level, label },
  });
  return NextResponse.json({ ok: true }, { status: 201 });
}
