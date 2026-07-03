import { NextRequest, NextResponse } from 'next/server';
import { getUserServerSupabase } from '@/lib/auth/supabaseServer';
import { supabaseAdmin } from '@/lib/supabase';
import { hasSupabasePublicConfig } from '@/lib/env';

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
  try {
    const body = (await req.json()) as { marketing?: unknown };
    marketing = body?.marketing === true;
  } catch {
    /* body 없으면 marketing=false */
  }

  const now = new Date().toISOString();
  const { error } = await supabaseAdmin
    .from('profiles')
    .update({
      terms_agreed_at: now,
      privacy_agreed_at: now,
      thirdparty_agreed_at: now,
      marketing_agreed_at: marketing ? now : null,
    })
    .eq('id', user.id);

  if (error) {
    console.error('[auth] consent update error:', error);
    return NextResponse.json({ error: '동의 저장에 실패했습니다.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
