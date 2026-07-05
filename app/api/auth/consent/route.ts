import { NextRequest, NextResponse } from 'next/server';
import { getUserServerSupabase } from '@/lib/auth/supabaseServer';
import { supabaseAdmin } from '@/lib/supabase';
import { hasSupabasePublicConfig } from '@/lib/env';
import { isValidPhone } from '@/lib/auth/profileFields';

export async function POST(req: NextRequest) {
  if (!hasSupabasePublicConfig()) {
    return NextResponse.json({ error: '서비스 설정이 완료되지 않았습니다.' }, { status: 503 });
  }

  const supabase = await getUserServerSupabase();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  let marketing = false;
  let profile: { full_name?: unknown; phone?: unknown; gender?: unknown; region?: unknown } = {};
  try {
    const body = (await req.json()) as {
      marketing?: unknown;
      profile?: typeof profile;
    };
    marketing = body?.marketing === true;
    profile = body?.profile ?? {};
  } catch {
    /* body 파싱 실패 → 아래 검증에서 400 */
  }

  const fullName = typeof profile.full_name === 'string' ? profile.full_name.trim() : '';
  const phone = typeof profile.phone === 'string' ? profile.phone.trim() : '';
  const gender = typeof profile.gender === 'string' ? profile.gender.trim() : '';
  const region = typeof profile.region === 'string' ? profile.region.trim() : '';

  if (!fullName || !phone || !gender || !region) {
    return NextResponse.json({ error: '프로필 정보를 모두 입력해 주세요.' }, { status: 400 });
  }
  if (!isValidPhone(phone)) {
    return NextResponse.json({ error: '전화번호 형식이 올바르지 않습니다.' }, { status: 400 });
  }
  if (!['male', 'female', 'unspecified'].includes(gender)) {
    return NextResponse.json({ error: '성별 값이 올바르지 않습니다.' }, { status: 400 });
  }

  const now = new Date().toISOString();
  const { error } = await supabaseAdmin
    .from('profiles')
    .update({
      terms_agreed_at: now,
      privacy_agreed_at: now,
      thirdparty_agreed_at: now,
      marketing_agreed_at: marketing ? now : null,
      full_name: fullName,
      phone,
      gender,
      region,
    })
    .eq('id', user.id);

  if (error) {
    console.error('[auth] consent update error:', error);
    return NextResponse.json({ error: '동의 저장에 실패했습니다.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
