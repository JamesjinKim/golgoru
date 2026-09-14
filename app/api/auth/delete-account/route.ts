import { NextRequest, NextResponse } from 'next/server';
import { getUserServerSupabase } from '@/lib/auth/supabaseServer';
import { supabaseAdmin } from '@/lib/supabase';
import { hasSupabasePublicConfig } from '@/lib/env';
import { getSupabaseAuthCookieName } from '@/lib/auth/cookies';
import {
  applySupabaseAuthCookieExpiryToResponse,
  getSupabaseAuthCookieNamesFromNames,
} from '@/lib/auth/response';
import { DELETE_CONFIRM_PHRASE } from '@/lib/auth/deleteAccount';

/**
 * 회원 탈퇴 (계정 및 개인정보 삭제).
 *
 * Google Play는 계정을 생성하는 앱에 앱 내 계정 삭제 경로를 요구하고,
 * 개인정보처리방침 제9항도 "동의 철회(회원 탈퇴)"를 이용자 권리로 명시한다.
 *
 * 삭제 범위는 방침 제5항의 보유 기간 표를 그대로 따른다.
 * - 계정 및 회원 정보(auth 사용자, profiles) → 탈퇴 시 지체 없이 파기
 * - 상담 요청 내용(recommendation_logs) → 24시간 내 자동 파기 대상이므로 함께 삭제
 * - 전문가 연결(통화) 기록(call_logs) → 접수 시점부터 3년(분쟁 대응 목적) 보존.
 *   탈퇴해도 지우지 않되, user_id를 끊어 더 이상 개인을 식별할 수 없게 만든다.
 */
export async function POST(req: NextRequest) {
  if (!hasSupabasePublicConfig()) {
    return NextResponse.json({ error: '서비스 설정이 완료되지 않았습니다.' }, { status: 503 });
  }

  const supabase = await getUserServerSupabase();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  // 오조작 방지: 클라이언트가 확인 문구를 정확히 보냈을 때만 진행한다.
  let confirm = '';
  try {
    const body = (await req.json()) as { confirm?: unknown };
    confirm = typeof body?.confirm === 'string' ? body.confirm.trim() : '';
  } catch {
    /* body 파싱 실패 → 아래 검증에서 400 */
  }
  if (confirm !== DELETE_CONFIRM_PHRASE) {
    return NextResponse.json({ error: '확인 문구가 일치하지 않습니다.' }, { status: 400 });
  }

  // 1) 분쟁 대응 목적으로 3년 보존해야 하는 통화 기록은 삭제 대신 비식별화한다.
  //    user_id를 NULL로 끊으면 기록은 남되 개인과는 연결되지 않는다.
  //    call_logs.user_id는 `on delete set null`이라 4단계에서 자동 해제되지만,
  //    "3년 보존은 의도된 것"임을 코드로 남기려 명시적으로 먼저 끊는다.
  const { error: callLogError } = await supabaseAdmin
    .from('call_logs')
    .update({ user_id: null })
    .eq('user_id', user.id);

  if (callLogError) {
    console.error('[auth] delete-account call_logs anonymize error:', callLogError);
    return NextResponse.json({ error: '탈퇴 처리에 실패했습니다.' }, { status: 500 });
  }

  // 2) 상담 요청 내용은 방침상 보존 사유가 없으므로 즉시 삭제한다.
  const { error: recLogError } = await supabaseAdmin
    .from('recommendation_logs')
    .delete()
    .eq('user_id', user.id);

  if (recLogError) {
    console.error('[auth] delete-account recommendation_logs delete error:', recLogError);
    return NextResponse.json({ error: '탈퇴 처리에 실패했습니다.' }, { status: 500 });
  }

  // 3) 프로필(이름·연락처·지역 등 식별 정보) 삭제.
  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .delete()
    .eq('id', user.id);

  if (profileError) {
    console.error('[auth] delete-account profile delete error:', profileError);
    return NextResponse.json({ error: '탈퇴 처리에 실패했습니다.' }, { status: 500 });
  }

  // 4) 마지막으로 auth 사용자 자체를 삭제한다. 순서가 중요하다 — 먼저 지우면
  //    위 단계가 실패했을 때 로그인할 수 없는 고아 데이터가 남는다.
  const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(user.id);

  if (authError) {
    console.error('[auth] delete-account auth user delete error:', authError);
    return NextResponse.json({ error: '탈퇴 처리에 실패했습니다.' }, { status: 500 });
  }

  // 세션 쿠키를 만료시켜 탈퇴 직후 로그인 상태가 남지 않게 한다.
  const response = NextResponse.json({ ok: true });
  const cookieNames = getSupabaseAuthCookieNamesFromNames(
    getSupabaseAuthCookieName(),
    req.cookies.getAll().map((cookie) => cookie.name),
  );
  applySupabaseAuthCookieExpiryToResponse(response, cookieNames);
  return response;
}
