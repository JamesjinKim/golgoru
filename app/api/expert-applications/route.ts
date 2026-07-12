import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { isValidPhone } from '@/lib/auth/profileFields';
import { ALL_VERTICALS } from '@/lib/constants';
import type { Vertical } from '@/lib/types';

// 전문가 입점신청 접수 (공개 — 비로그인 허용).
// 검증 후 service role(supabaseAdmin)로 저장. 조회/처리는 어드민 전용.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  const phone = typeof body?.phone === 'string' ? body.phone.trim() : '';
  const verticalRaw = typeof body?.vertical === 'string' ? body.vertical.trim() : '';
  const message = typeof body?.message === 'string' ? body.message.trim() : '';

  if (!name || !phone) {
    return NextResponse.json({ error: '성명(업체명)과 연락처를 입력해 주세요.' }, { status: 400 });
  }
  if (name.length > 60) {
    return NextResponse.json({ error: '성명(업체명)은 60자 이내로 입력해 주세요.' }, { status: 400 });
  }
  if (!isValidPhone(phone)) {
    return NextResponse.json({ error: '연락처 형식이 올바르지 않습니다. (예: 010-1234-5678)' }, { status: 400 });
  }
  if (message.length > 500) {
    return NextResponse.json({ error: '문의 내용은 500자 이내로 입력해 주세요.' }, { status: 400 });
  }

  // 알 수 없는 직역 코드는 null 로 저장(자유 접수 허용)
  const vertical = ALL_VERTICALS.includes(verticalRaw as Vertical) ? (verticalRaw as Vertical) : null;

  // insert 후 삽입된 행을 되돌려받아 실제 저장을 확인한다.
  // (select 없이 insert 만 하면 성공 응답이 실제 저장을 보장하지 못함)
  const { data, error } = await supabaseAdmin
    .from('expert_applications')
    .insert({
      name,
      phone,
      vertical,
      message: message || null,
    })
    .select('id, created_at')
    .single();

  if (error || !data) {
    console.error('[expert-applications] insert error:', error);
    return NextResponse.json({ error: '접수에 실패했습니다. 잠시 후 다시 시도해 주세요.' }, { status: 500 });
  }

  console.info('[expert-applications] saved', data.id, data.created_at);
  return NextResponse.json({ ok: true, id: data.id }, { status: 201 });
}
